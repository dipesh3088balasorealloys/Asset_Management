const { callProcMulti, query } = require('../utils/db');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { daysDiff } = require('../utils/dateUtils');
const { getById, softDelete } = require('../utils/queries');

function addComputedStatus(license) {
  const diff = daysDiff(license.endDate);
  let computedStatus;
  if (diff < 0) computedStatus = 'Expired';
  else if (diff <= 30) computedStatus = 'Expiring Soon';
  else computedStatus = 'Active';
  return { ...license, computedStatus };
}

async function listLicenses(q) {
  const { page, limit } = parsePagination(q);

  const search    = q.search    || null;
  const vendor    = q.vendor    || null;
  const status    = q.status    || null;
  const sortField = q.sort      || 'created_at';
  const sortDir   = q.order     || 'desc';

  const sets = await callProcMulti('SP_ASSET_LICENSE_LIST', [
    search, vendor, status, sortField, sortDir, page, limit,
  ]);

  const licenses = sets[0] || [];
  const total    = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  const enriched = licenses.map(addComputedStatus);

  return { data: enriched, meta: buildPaginationMeta(page, limit, total) };
}

async function getLicense(id) {
  const rows = await getById('asset_licenses', id);
  if (!rows.length) {
    const err = new Error('License not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

async function createLicense(data, userId) {
  const result = await query(
    `INSERT INTO asset_licenses
       (name, quantity, available, license_key, start_date, end_date, vendor, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.quantity,
      data.quantity,
      data.licenseKey || null,
      data.startDate,
      data.endDate,
      data.vendor || null,
      userId || null,
    ]
  );
  return (await getById('asset_licenses', result.insertId))[0];
}

async function updateLicense(id, data) {
  const existing = await getLicense(id);

  if (data.quantity !== undefined) {
    const newAvailable = data.quantity - existing.used;
    if (newAvailable < 0) {
      const err = new Error(`Cannot reduce quantity below used count (${existing.used})`);
      err.statusCode = 400;
      throw err;
    }
  }

  const newQty = data.quantity !== undefined ? data.quantity : existing.quantity;
  const newAvailable = newQty - existing.used;

  await query(
    `UPDATE asset_licenses SET
       name = ?, quantity = ?, available = ?, license_key = ?,
       start_date = ?, end_date = ?, vendor = ?
     WHERE id = ? AND is_deleted = 0`,
    [
      data.name !== undefined ? data.name : existing.name,
      newQty,
      newAvailable,
      data.licenseKey !== undefined ? (data.licenseKey || null) : existing.licenseKey,
      data.startDate !== undefined ? data.startDate : existing.startDate,
      data.endDate !== undefined ? data.endDate : existing.endDate,
      data.vendor !== undefined ? (data.vendor || null) : existing.vendor,
      id,
    ]
  );
  return getLicense(id);
}

async function deleteLicense(id) {
  const license = await getLicense(id);
  if (license.used > 0) {
    const err = new Error('Cannot delete license that is currently in use');
    err.statusCode = 400;
    throw err;
  }
  await softDelete('asset_licenses', id);
  return { message: 'License deleted successfully' };
}

async function getExpiringLicenses(days = 30) {
  return query(
    `SELECT * FROM asset_licenses
     WHERE is_deleted = 0
       AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY end_date ASC`,
    [days]
  );
}

module.exports = { listLicenses, getLicense, createLicense, updateLicense, deleteLicense, getExpiringLicenses };
