const { query } = require('../utils/db');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// CSV Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a value for CSV output. Wraps in double-quotes when the value
 * contains commas, newlines, or double-quotes.
 */
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Format a date value to YYYY-MM-DD string for CSV output.
 */
function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Convert an array of objects to a CSV string given ordered column definitions.
 * Each column definition: { header: string, key: string | function }
 */
function toCsv(rows, columns) {
  const headerLine = columns.map((c) => csvEscape(c.header)).join(',');
  const dataLines = rows.map((row) =>
    columns
      .map((c) => {
        const val = typeof c.key === 'function' ? c.key(row) : row[c.key];
        return csvEscape(val);
      })
      .join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

// ---------------------------------------------------------------------------
// PDF Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a PDF buffer from a title and a table specification.
 * @param {string} title - Document title
 * @param {Array<{header: string, key: string|function, width: number}>} columns
 * @param {Array<object>} rows
 * @returns {Promise<Buffer>}
 */
function generatePdf(title, columns, rows) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Generated on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}  |  ${rows.length} records`, { align: 'center' });
      doc.moveDown(1);

      // Table layout constants
      const startX = doc.page.margins.left;
      const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const rowHeight = 20;
      const headerHeight = 24;
      const fontSize = 8;
      const headerFontSize = 9;

      // Calculate column widths proportionally
      const totalWeight = columns.reduce((sum, c) => sum + (c.width || 1), 0);
      const colWidths = columns.map((c) => ((c.width || 1) / totalWeight) * tableWidth);

      let y = doc.y;

      // --- Draw header row ---
      function drawHeader() {
        // Header background
        doc.rect(startX, y, tableWidth, headerHeight).fill('#2c3e50');

        let x = startX;
        doc.font('Helvetica-Bold').fontSize(headerFontSize).fillColor('#ffffff');
        columns.forEach((col, idx) => {
          doc.text(col.header, x + 4, y + 6, {
            width: colWidths[idx] - 8,
            height: headerHeight,
            ellipsis: true,
          });
          x += colWidths[idx];
        });
        y += headerHeight;
      }

      drawHeader();

      // --- Draw data rows ---
      doc.font('Helvetica').fontSize(fontSize).fillColor('#333333');

      rows.forEach((row, rowIdx) => {
        // Check if we need a new page
        if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
          drawHeader();
          doc.font('Helvetica').fontSize(fontSize).fillColor('#333333');
        }

        // Alternate row background
        if (rowIdx % 2 === 0) {
          doc.rect(startX, y, tableWidth, rowHeight).fill('#f8f9fa');
          doc.fillColor('#333333');
        }

        // Draw cell borders (light)
        doc.rect(startX, y, tableWidth, rowHeight).stroke('#dee2e6');

        let x = startX;
        columns.forEach((col, idx) => {
          const rawVal = typeof col.key === 'function' ? col.key(row) : row[col.key];
          const val = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
          doc.text(val, x + 4, y + 5, {
            width: colWidths[idx] - 8,
            height: rowHeight - 4,
            ellipsis: true,
          });
          x += colWidths[idx];
        });

        y += rowHeight;
      });

      // Footer
      doc.moveDown(1);
      doc
        .fontSize(8)
        .fillColor('#999999')
        .text('Asset Management System', startX, doc.page.height - doc.page.margins.bottom - 15, {
          align: 'center',
          width: tableWidth,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const ASSET_COLUMNS = [
  { header: 'Category', key: 'category', width: 1.2 },
  { header: 'Asset Name', key: 'name', width: 2 },
  { header: 'Asset Sl. No.', key: 'serialNo', width: 1.5 },
  { header: 'Quantity', key: 'quantity', width: 0.8 },
  { header: 'Assigned', key: 'assigned', width: 0.8 },
  { header: 'Available', key: 'available', width: 0.8 },
  { header: 'Asset Company Name', key: 'vendor', width: 1.5 },
  { header: 'Purchase Date', key: (r) => formatDate(r.purchaseDate), width: 1.2 },
  { header: 'Warranty End', key: (r) => formatDate(r.warrantyEnd), width: 1.2 },
  { header: 'Location', key: 'location', width: 1.2 },
  { header: 'Notes', key: 'notes', width: 1.5 },
];

const LICENSE_COLUMNS = [
  { header: 'Name', key: 'name', width: 2 },
  { header: 'Quantity', key: 'quantity', width: 0.8 },
  { header: 'Used', key: 'used', width: 0.8 },
  { header: 'Available', key: 'available', width: 0.8 },
  { header: 'License Key', key: 'licenseKey', width: 2 },
  { header: 'Start Date', key: (r) => formatDate(r.startDate), width: 1.2 },
  { header: 'End Date', key: (r) => formatDate(r.endDate), width: 1.2 },
  { header: 'Vendor', key: 'vendor', width: 1.5 },
];

const SERVICE_COLUMNS = [
  { header: 'Type', key: 'type', width: 1 },
  { header: 'Name', key: 'name', width: 1.8 },
  { header: 'Provider', key: 'provider', width: 1.3 },
  { header: 'Cost (₹)', key: (r) => (r.cost != null ? '₹' + Number(r.cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''), width: 0.8 },
  { header: 'Status', key: 'status', width: 0.8 },
  { header: 'Billing Cycle', key: 'billingCycle', width: 1 },
  { header: 'Start Date', key: (r) => formatDate(r.startDate), width: 1 },
  { header: 'End Date', key: (r) => formatDate(r.endDate), width: 1 },
  { header: 'Account ID', key: 'accountId', width: 1.2 },
  { header: 'Contact Info', key: 'contactInfo', width: 1.3 },
  { header: 'Notes', key: 'notes', width: 1.5 },
];

const ASSIGNMENT_COLUMNS = [
  { header: 'Employee Name', key: 'empName', width: 1.5 },
  { header: 'Employee ID', key: 'empId', width: 1 },
  { header: 'Email', key: 'empEmail', width: 1.8 },
  { header: 'Department', key: 'departmentName', width: 1 },
  { header: 'Sub Location', key: 'assetLocations', width: 1.2 },
  { header: 'Asset Type', key: 'assetTypes', width: 1 },
  { header: 'Asset Model', key: 'assetModels', width: 1.5 },
  { header: 'Asset Serial No', key: 'assetSerialNos', width: 1.3 },
  { header: 'Licenses Assigned', key: 'licenseNames', width: 2 },
  { header: 'Assign Date', key: (r) => formatDate(r.assignDate), width: 1 },
  { header: 'Notes', key: 'notes', width: 1.3 },
];

// ---------------------------------------------------------------------------
// CSV Exports
// ---------------------------------------------------------------------------

async function exportAssetsCsv() {
  const assets = await query('SELECT * FROM asset_assets WHERE is_deleted = 0 ORDER BY created_at DESC');
  logger.info(`Exporting ${assets.length} assets to CSV`);
  return toCsv(assets, ASSET_COLUMNS);
}

async function exportLicensesCsv() {
  const licenses = await query('SELECT * FROM asset_licenses WHERE is_deleted = 0 ORDER BY created_at DESC');
  logger.info(`Exporting ${licenses.length} licenses to CSV`);
  return toCsv(licenses, LICENSE_COLUMNS);
}

async function exportServicesCsv() {
  const services = await query('SELECT * FROM asset_services WHERE is_deleted = 0 ORDER BY created_at DESC');
  logger.info(`Exporting ${services.length} services to CSV`);
  return toCsv(services, SERVICE_COLUMNS);
}

// ---------------------------------------------------------------------------
// PDF Exports
// ---------------------------------------------------------------------------

async function exportAssetsPdf() {
  const assets = await query('SELECT * FROM asset_assets WHERE is_deleted = 0 ORDER BY created_at DESC');
  logger.info(`Exporting ${assets.length} assets to PDF`);
  return generatePdf('Asset Inventory Report', ASSET_COLUMNS, assets);
}

async function exportLicensesPdf() {
  const licenses = await query('SELECT * FROM asset_licenses WHERE is_deleted = 0 ORDER BY created_at DESC');
  logger.info(`Exporting ${licenses.length} licenses to PDF`);
  return generatePdf('License Inventory Report', LICENSE_COLUMNS, licenses);
}

async function exportServicesPdf() {
  const services = await query('SELECT * FROM asset_services WHERE is_deleted = 0 ORDER BY created_at DESC');
  logger.info(`Exporting ${services.length} services to PDF`);
  return generatePdf('Service Subscriptions Report', SERVICE_COLUMNS, services);
}

// ---------------------------------------------------------------------------
// Assignment Export Helpers
// ---------------------------------------------------------------------------

async function fetchAssignmentsFlat() {
  const assignments = await query(
    `SELECT a.id, a.emp_name, a.emp_id, a.emp_email, a.assign_date, a.notes,
            d.name AS department_name
       FROM asset_assignments a
       LEFT JOIN asset_departments d ON a.department_id = d.id
      WHERE a.is_active = 1
      ORDER BY a.created_at DESC`
  );

  if (assignments.length === 0) return [];

  const ids = assignments.map((a) => a.id);

  const assetRows = await query(
    `SELECT aa.assignment_id, ast.name, ast.category, ast.serial_no, ast.location
       FROM asset_assignment_assets aa
       JOIN asset_assets ast ON aa.asset_id = ast.id
      WHERE aa.assignment_id IN (?)`,
    [ids]
  );

  const licenseRows = await query(
    `SELECT al.assignment_id, l.name
       FROM asset_assignment_licenses al
       JOIN asset_licenses l ON al.license_id = l.id
      WHERE al.assignment_id IN (?)`,
    [ids]
  );

  const assetMap = {};
  for (const r of assetRows) {
    const aid = r.assignmentId;
    if (!assetMap[aid]) assetMap[aid] = { models: [], types: [], serials: [], locations: [] };
    assetMap[aid].models.push(r.name || '');
    assetMap[aid].types.push(r.category || '');
    assetMap[aid].serials.push(r.serialNo || '');
    assetMap[aid].locations.push(r.location || '');
  }

  const licenseMap = {};
  for (const r of licenseRows) {
    if (!licenseMap[r.assignmentId]) licenseMap[r.assignmentId] = [];
    licenseMap[r.assignmentId].push(r.name);
  }

  return assignments.map((a) => {
    const am = assetMap[a.id] || { models: [], types: [], serials: [], locations: [] };
    return {
      ...a,
      assetModels: am.models.join(', '),
      assetTypes: am.types.join(', '),
      assetSerialNos: am.serials.filter(Boolean).join(', '),
      assetLocations: am.locations.filter(Boolean).join(', '),
      licenseNames: (licenseMap[a.id] || []).join(', '),
    };
  });
}

async function exportAssignmentsCsv() {
  const items = await fetchAssignmentsFlat();
  logger.info(`Exporting ${items.length} assignments to CSV`);
  return toCsv(items, ASSIGNMENT_COLUMNS);
}

async function exportAssignmentsPdf() {
  const items = await fetchAssignmentsFlat();
  logger.info(`Exporting ${items.length} assignments to PDF`);
  return generatePdf('Assignment Report', ASSIGNMENT_COLUMNS, items);
}

// ---------------------------------------------------------------------------
// Report-specific column definitions
// ---------------------------------------------------------------------------

const REPORT_LOCATION_SUMMARY_COLUMNS = [
  { header: 'Location', key: 'locationName', width: 2 },
  { header: 'Code', key: 'locationCode', width: 0.8 },
  { header: 'Total Assets', key: 'totalAssets', width: 1 },
  { header: 'Assigned Assets', key: 'assignedAssets', width: 1 },
  { header: 'Available Assets', key: 'availableAssets', width: 1.2 },
  { header: 'Utilization %', key: (r) => r.totalAssets > 0 ? `${Math.round((r.assignedAssets / r.totalAssets) * 100)}%` : '0%', width: 1 },
  { header: 'Employees', key: 'employees', width: 1 },
];

const REPORT_ASSET_UTIL_COLUMNS = [
  { header: 'Category', key: (r) => r.category?.replace(/([A-Z])/g, ' $1').trim() || r.category, width: 2 },
  { header: 'Total', key: 'total', width: 1 },
  { header: 'Assigned', key: 'assigned', width: 1 },
  { header: 'Available', key: 'available', width: 1 },
  { header: 'Utilization %', key: (r) => `${r.utilization}%`, width: 1.2 },
];

const REPORT_LICENSE_UTIL_COLUMNS = [
  { header: 'License Name', key: 'name', width: 2 },
  { header: 'Total Seats', key: 'quantity', width: 1 },
  { header: 'Used', key: 'used', width: 0.8 },
  { header: 'Available', key: 'available', width: 0.8 },
  { header: 'Utilization %', key: (r) => `${r.utilization}%`, width: 1 },
  { header: 'Days Remaining', key: 'daysRemaining', width: 1 },
  { header: 'Status', key: 'status', width: 1 },
];

const REPORT_SERVICE_COST_COLUMNS = [
  { header: 'Service Type', key: 'type', width: 1.5 },
  { header: 'Count', key: 'count', width: 1 },
  { header: 'Monthly Cost (INR)', key: (r) => r.monthlyCost != null ? `₹${Number(r.monthlyCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '', width: 1.5 },
  { header: 'Yearly Cost (INR)', key: (r) => r.yearlyCost != null ? `₹${Number(r.yearlyCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '', width: 1.5 },
];

const REPORT_EMPLOYEE_SUMMARY_COLUMNS = [
  { header: 'Employee Name', key: 'empName', width: 1.5 },
  { header: 'Employee ID', key: 'empId', width: 1 },
  { header: 'Email', key: 'empEmail', width: 1.5 },
  { header: 'Department', key: (r) => r.department?.name || '-', width: 1 },
  { header: 'Location', key: (r) => r.orgLocationName || '-', width: 1.2 },
  { header: 'Assets', key: (r) => r._assetNames || '-', width: 2 },
  { header: 'Licenses', key: (r) => r._licenseNames || '-', width: 1.5 },
  { header: 'Assigned Date', key: (r) => formatDate(r.assignDate), width: 1 },
];

const REPORT_RENEWAL_COLUMNS = [
  { header: 'Name', key: 'name', width: 2 },
  { header: 'Type', key: 'type', width: 1 },
  { header: 'Renewal Date', key: (r) => formatDate(r.date), width: 1.2 },
  { header: 'Days Remaining', key: 'daysRemaining', width: 1 },
];

// ---------------------------------------------------------------------------
// Report Export Dispatcher
// ---------------------------------------------------------------------------

const reportService = require('./report.service');

async function exportReport(reportType, format, locationIds) {
  let rows, columns, title;

  switch (reportType) {
    case 'location-summary': {
      const data = await reportService.getLocationSummary(locationIds);
      rows = data.locations;
      columns = REPORT_LOCATION_SUMMARY_COLUMNS;
      title = 'Location Summary Report';
      break;
    }
    case 'asset-utilization': {
      const data = await reportService.getAssetUtilization(locationIds);
      rows = data.breakdown;
      columns = REPORT_ASSET_UTIL_COLUMNS;
      title = 'Asset Utilization Report';
      break;
    }
    case 'license-utilization': {
      const data = await reportService.getLicenseUtilization();
      rows = data.licenses;
      columns = REPORT_LICENSE_UTIL_COLUMNS;
      title = 'License Utilization Report';
      break;
    }
    case 'service-costs': {
      const data = await reportService.getServiceCostBreakdown();
      rows = data.breakdown;
      columns = REPORT_SERVICE_COST_COLUMNS;
      title = 'Service Cost Breakdown Report';
      break;
    }
    case 'employee-summary': {
      const rawRows = await reportService.getEmployeeSummary(locationIds);
      rows = rawRows.map(r => ({
        ...r,
        _assetNames: r.assets?.map(a => a.asset?.name).filter(Boolean).join(', ') || '-',
        _licenseNames: r.licenses?.map(l => l.license?.name).filter(Boolean).join(', ') || '-',
      }));
      columns = REPORT_EMPLOYEE_SUMMARY_COLUMNS;
      title = 'Employee Summary Report';
      break;
    }
    case 'renewals': {
      rows = await reportService.getUpcomingRenewals(30);
      columns = REPORT_RENEWAL_COLUMNS;
      title = 'Upcoming Renewals Report';
      break;
    }
    default: {
      const err = new Error(`Unknown report type: ${reportType}`);
      err.statusCode = 400;
      throw err;
    }
  }

  logger.info(`Exporting ${reportType} report (${rows.length} rows) as ${format}`);

  if (format === 'csv') return { content: toCsv(rows, columns), type: 'csv' };
  return { content: await generatePdf(title, columns, rows), type: 'pdf' };
}

module.exports = {
  exportAssetsCsv,
  exportLicensesCsv,
  exportServicesCsv,
  exportAssetsPdf,
  exportLicensesPdf,
  exportServicesPdf,
  exportAssignmentsCsv,
  exportAssignmentsPdf,
  exportReport,
};
