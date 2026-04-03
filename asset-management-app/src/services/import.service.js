const { parse } = require('csv-parse/sync');
const ExcelJS = require('exceljs');
const { callProc, query } = require('../utils/db');
const logger = require('../utils/logger');
const {
  ASSET_CATEGORIES,
  SERVICE_TYPES,
  SERVICE_STATUSES,
  BILLING_CYCLES,
} = require('../config/constants');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CSV_MIMETYPES = ['text/csv', 'application/vnd.ms-excel'];
const XLSX_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * Determine whether the uploaded file is CSV or Excel based on its mimetype.
 * Returns 'csv' | 'xlsx'.
 */
function detectFormat(mimetype) {
  if (CSV_MIMETYPES.includes(mimetype)) return 'csv';
  if (XLSX_MIMETYPES.includes(mimetype)) return 'xlsx';
  // Fallback: treat anything else as csv (multer may send generic octet-stream)
  return 'csv';
}

/**
 * Parse a CSV buffer into an array of row objects.
 */
function parseCsv(buffer) {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

/**
 * Parse an Excel buffer into an array of row objects using the first sheet.
 */
async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return [];

  // First row = headers
  const headers = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value || '').trim().toLowerCase();
  });

  const rows = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const obj = {};
    let hasData = false;
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber];
      if (key) {
        let val = cell.value;
        // ExcelJS may return Date objects or rich text objects
        if (val instanceof Date) {
          val = val.toISOString().split('T')[0];
        } else if (val && typeof val === 'object' && val.result !== undefined) {
          val = String(val.result);
        } else if (val && typeof val === 'object' && val.text) {
          val = String(val.text);
        } else {
          val = val != null ? String(val).trim() : '';
        }
        obj[key] = val;
        if (val !== '') hasData = true;
      }
    });
    if (hasData) rows.push(obj);
  }
  return rows;
}

/**
 * Parse the uploaded file buffer into row objects, auto-detecting format.
 */
async function parseFile(fileBuffer, mimetype) {
  const format = detectFormat(mimetype);
  if (format === 'xlsx') {
    return parseExcel(fileBuffer);
  }
  return parseCsv(fileBuffer);
}

/**
 * Normalise a header key coming from a CSV/Excel file to a consistent
 * snake_case form so look-ups work regardless of user casing or spacing.
 */
function normaliseKey(key) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Build a normalised row object where every key is snake_case.
 */
function normaliseRow(raw) {
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    out[normaliseKey(key)] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}

/**
 * Parse a date string and return a Date object or null.
 */
function parseDate(val) {
  if (!val || val === '') return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Parse a positive number from a string. Returns null if invalid.
 */
function parsePositiveNumber(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  if (isNaN(n) || n < 0) return null;
  return n;
}

// ---------------------------------------------------------------------------
// Import Assets
// ---------------------------------------------------------------------------

async function importAssets(fileBuffer, mimetype, userId) {
  const rawRows = await parseFile(fileBuffer, mimetype);
  const imported = [];
  const errors = [];
  let skipped = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // 1-indexed, row 1 is header
    const row = normaliseRow(rawRows[i]);

    try {
      // ---- Validate required fields ----
      const category = row.category;
      if (!category || !ASSET_CATEGORIES.includes(category)) {
        errors.push({
          row: rowNumber,
          reason: `Invalid or missing category. Must be one of: ${ASSET_CATEGORIES.join(', ')}`,
        });
        skipped++;
        continue;
      }

      const name = row.name;
      if (!name) {
        errors.push({ row: rowNumber, reason: 'Name is required' });
        skipped++;
        continue;
      }

      let quantity = parsePositiveNumber(row.quantity);
      if (quantity !== null && (quantity <= 0 || !Number.isInteger(quantity))) {
        errors.push({ row: rowNumber, reason: 'Quantity must be a positive integer' });
        skipped++;
        continue;
      }
      if (quantity === null) quantity = 1; // Default to 1 if not provided

      // ---- Optional fields ----
      const serialNo = row.serial_no || null;
      const price = parsePositiveNumber(row.price) || 0;
      const vendor = row.company_name || row.vendor || null;
      const purchaseDate = parseDate(row.purchase_date);
      const warrantyEnd = parseDate(row.warranty_end);
      const location = row.location || null;
      const notes = row.notes || null;

      const insertResult = await query(
        `INSERT INTO asset_assets
           (category, name, serial_no, quantity, available, price,
            vendor, purchase_date, warranty_end, location, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [category, name, serialNo, quantity, quantity, price,
         vendor, purchaseDate, warrantyEnd, location, notes, userId || null]
      );

      const rows = await query('SELECT * FROM asset_assets WHERE id = ?', [insertResult.insertId]);
      imported.push(rows[0] || insertResult);
    } catch (err) {
      logger.error(`Import asset row ${rowNumber} failed: ${err.message}`);
      errors.push({ row: rowNumber, reason: err.message });
      skipped++;
    }
  }

  logger.info(`Asset import complete: ${imported.length} imported, ${skipped} skipped`);
  return { imported: imported.length, skipped, errors };
}

// ---------------------------------------------------------------------------
// Import Licenses
// ---------------------------------------------------------------------------

async function importLicenses(fileBuffer, mimetype, userId) {
  const rawRows = await parseFile(fileBuffer, mimetype);
  const imported = [];
  const errors = [];
  let skipped = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2;
    const row = normaliseRow(rawRows[i]);

    try {
      const name = row.name;
      if (!name) {
        errors.push({ row: rowNumber, reason: 'Name is required' });
        skipped++;
        continue;
      }

      const quantity = parsePositiveNumber(row.quantity);
      if (quantity === null || quantity <= 0 || !Number.isInteger(quantity)) {
        errors.push({ row: rowNumber, reason: 'Quantity must be a positive integer' });
        skipped++;
        continue;
      }

      const startDate = parseDate(row.start_date);
      if (!startDate) {
        errors.push({ row: rowNumber, reason: 'Valid start_date is required' });
        skipped++;
        continue;
      }

      const endDate = parseDate(row.end_date);
      if (!endDate) {
        errors.push({ row: rowNumber, reason: 'Valid end_date is required' });
        skipped++;
        continue;
      }

      const licenseKey = row.license_key || null;
      const vendor = row.vendor || null;

      const insertResult = await query(
        `INSERT INTO asset_licenses
           (name, quantity, available, license_key, start_date, end_date, vendor, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, quantity, quantity, licenseKey, startDate, endDate, vendor, userId || null]
      );

      const rows = await query('SELECT * FROM asset_licenses WHERE id = ?', [insertResult.insertId]);
      imported.push(rows[0] || insertResult);
    } catch (err) {
      logger.error(`Import license row ${rowNumber} failed: ${err.message}`);
      errors.push({ row: rowNumber, reason: err.message });
      skipped++;
    }
  }

  logger.info(`License import complete: ${imported.length} imported, ${skipped} skipped`);
  return { imported: imported.length, skipped, errors };
}

// ---------------------------------------------------------------------------
// Import Services
// ---------------------------------------------------------------------------

async function importServices(fileBuffer, mimetype, userId) {
  const rawRows = await parseFile(fileBuffer, mimetype);
  const imported = [];
  const errors = [];
  let skipped = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2;
    const row = normaliseRow(rawRows[i]);

    try {
      const type = row.type;
      if (!type || !SERVICE_TYPES.includes(type)) {
        errors.push({
          row: rowNumber,
          reason: `Invalid or missing type. Must be one of: ${SERVICE_TYPES.join(', ')}`,
        });
        skipped++;
        continue;
      }

      const name = row.name;
      if (!name) {
        errors.push({ row: rowNumber, reason: 'Name is required' });
        skipped++;
        continue;
      }

      const provider = row.provider;
      if (!provider) {
        errors.push({ row: rowNumber, reason: 'Provider is required' });
        skipped++;
        continue;
      }

      const cost = parsePositiveNumber(row.cost);
      if (cost === null) {
        errors.push({ row: rowNumber, reason: 'Cost must be a valid non-negative number' });
        skipped++;
        continue;
      }

      // Optional fields with enum validation
      let status = row.status || 'Active';
      if (!SERVICE_STATUSES.includes(status)) {
        errors.push({
          row: rowNumber,
          reason: `Invalid status. Must be one of: ${SERVICE_STATUSES.join(', ')}`,
        });
        skipped++;
        continue;
      }

      let billingCycle = row.billing_cycle || 'Monthly';
      if (!BILLING_CYCLES.includes(billingCycle)) {
        errors.push({
          row: rowNumber,
          reason: `Invalid billing_cycle. Must be one of: ${BILLING_CYCLES.join(', ')}`,
        });
        skipped++;
        continue;
      }

      const startDate = parseDate(row.start_date);
      if (!startDate) {
        errors.push({ row: rowNumber, reason: 'Valid start_date is required' });
        skipped++;
        continue;
      }

      const endDate = parseDate(row.end_date);
      if (!endDate) {
        errors.push({ row: rowNumber, reason: 'Valid end_date is required' });
        skipped++;
        continue;
      }

      const accountId = row.account_id || null;
      const contactInfo = row.contact_info || null;
      const notes = row.notes || null;

      const insertResult = await query(
        `INSERT INTO asset_services
           (type, name, provider, cost, status, billing_cycle,
            start_date, end_date, account_id, contact_info, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, name, provider, cost, status, billingCycle,
         startDate, endDate, accountId, contactInfo, notes, userId || null]
      );

      const rows = await query('SELECT * FROM asset_services WHERE id = ?', [insertResult.insertId]);
      imported.push(rows[0] || insertResult);
    } catch (err) {
      logger.error(`Import service row ${rowNumber} failed: ${err.message}`);
      errors.push({ row: rowNumber, reason: err.message });
      skipped++;
    }
  }

  logger.info(`Service import complete: ${imported.length} imported, ${skipped} skipped`);
  return { imported: imported.length, skipped, errors };
}

// ---------------------------------------------------------------------------
// Import Assignments
// ---------------------------------------------------------------------------

async function importAssignments(fileBuffer, mimetype, userId) {
  const rawRows = await parseFile(fileBuffer, mimetype);
  const imported = [];
  const errors = [];
  let skipped = 0;

  // Pre-fetch all assets and licenses for lookup
  const allAssets = await query('SELECT id, name, category, serial_no, location FROM asset_assets WHERE is_deleted = 0');
  const allLicenses = await query('SELECT id, name FROM asset_licenses WHERE is_deleted = 0');

  const licenseNameMap = {};
  for (const l of allLicenses) licenseNameMap[l.name.toLowerCase().trim()] = l.id;

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2;
    const row = normaliseRow(rawRows[i]);

    try {
      // ---- Validate required fields ----
      const empName = row.employee_name;
      if (!empName) {
        errors.push({ row: rowNumber, reason: 'Employee Name is required' });
        skipped++;
        continue;
      }

      const empId = row.employee_id;
      if (!empId) {
        errors.push({ row: rowNumber, reason: 'Employee ID is required' });
        skipped++;
        continue;
      }

      const empEmail = row.email || '';

      const department = row.department || 'IT';
      const assignDate = parseDate(row.assign_date) || new Date();
      const notes = row.notes || null;

      // ---- Resolve asset by type + model + serial_no ----
      const assetIds = [];
      const assetModel = (row.asset_model || '').trim();
      const assetType = (row.asset_type || '').trim();
      const assetSerialNo = (row.asset_serial_no || '').trim();
      const location = (row.location || '').trim();

      if (assetModel) {
        // Find matching asset — prioritise serial_no match, then model+type
        let matched = null;

        if (assetSerialNo) {
          // Try exact serial number match first
          matched = allAssets.find(
            (a) => a.serialNo && a.serialNo.toLowerCase() === assetSerialNo.toLowerCase()
          );
        }

        if (!matched) {
          // Match by model name (+ optionally type)
          const candidates = allAssets.filter(
            (a) => a.name.toLowerCase() === assetModel.toLowerCase()
          );

          if (candidates.length === 1) {
            matched = candidates[0];
          } else if (candidates.length > 1 && assetType) {
            // Narrow down by category/type
            matched = candidates.find(
              (a) => a.category && a.category.toLowerCase() === assetType.toLowerCase()
            ) || candidates[0];
          } else if (candidates.length > 1) {
            matched = candidates[0];
          }
        }

        if (matched) {
          assetIds.push(matched.id);
          // Update serial_no and location on the asset if provided and not already set
          const updates = [];
          const params = [];
          if (assetSerialNo && !matched.serialNo) {
            updates.push('serial_no = ?');
            params.push(assetSerialNo);
          }
          if (location && !matched.location) {
            updates.push('location = ?');
            params.push(location);
          }
          if (updates.length > 0) {
            params.push(matched.id);
            await query(`UPDATE asset_assets SET ${updates.join(', ')} WHERE id = ?`, params);
          }
        } else {
          errors.push({ row: rowNumber, reason: `Asset not found: "${assetModel}"${assetType ? ` (type: ${assetType})` : ''}` });
        }
      }

      // ---- Resolve license names to IDs ----
      const licenseIds = [];
      const rawLicenseNames = row.license_names || '';
      if (rawLicenseNames) {
        const names = rawLicenseNames.split(',').map((n) => n.trim()).filter(Boolean);
        for (const name of names) {
          const id = licenseNameMap[name.toLowerCase()];
          if (id) {
            licenseIds.push(id);
          } else {
            errors.push({ row: rowNumber, reason: `License not found: "${name}"` });
          }
        }
      }

      if (assetIds.length === 0 && licenseIds.length === 0) {
        errors.push({ row: rowNumber, reason: 'At least one valid asset or license is required' });
        skipped++;
        continue;
      }

      const result = await callProc('SP_ASSET_ASSIGNMENT_CREATE', [
        empName,
        empId,
        department,
        empEmail,
        assignDate,
        notes,
        userId || null,
        assetIds.join(','),
        licenseIds.join(','),
      ]);

      imported.push(result[0] || result);
    } catch (err) {
      logger.error(`Import assignment row ${rowNumber} failed: ${err.message}`);
      errors.push({ row: rowNumber, reason: err.message });
      skipped++;
    }
  }

  logger.info(`Assignment import complete: ${imported.length} imported, ${skipped} skipped`);
  return { imported: imported.length, skipped, errors };
}

module.exports = { importAssets, importLicenses, importServices, importAssignments };
