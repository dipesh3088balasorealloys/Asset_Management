const { callProcMulti, query } = require('../utils/db');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { LOW_STOCK_THRESHOLD } = require('../config/constants');
const { getById, softDelete } = require('../utils/queries');

async function listAssets(q, locationIds) {
  const { page, limit } = parsePagination(q);

  const category    = q.category     || null;
  const search      = q.search       || null;
  const stockStatus = q.stock_status || null;
  const sortField   = q.sort         || 'created_at';
  const sortDir     = q.order        || 'desc';

  // Convert locationIds to SP-compatible string
  const { locationIdsToString } = require('../middleware/locationFilter');
  const locStr = locationIdsToString(locationIds);

  const sets = await callProcMulti('asset_list', [
    category, search, stockStatus, locStr, sortField, sortDir, page, limit,
  ]);

  const assets = sets[0] || [];
  const total  = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  return { data: assets, meta: buildPaginationMeta(page, limit, total) };
}

async function getAsset(id) {
  const rows = await getById('assets', id);
  if (!rows.length) {
    const err = new Error('Asset not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

async function createAsset(data, userId) {
  const result = await query(
    `INSERT INTO assets
       (category, name, serial_no, quantity, available, price,
        vendor, purchase_date, warranty_end, location, location_id, po_number, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category,
      data.name,
      data.serialNo || null,
      data.quantity || 1,
      data.quantity || 1,
      data.price || 0,
      data.vendor || null,
      data.purchaseDate || null,
      data.warrantyEnd || null,
      data.location || null,
      data.locationId || null,
      data.poNumber || null,
      data.notes || null,
      userId || null,
    ]
  );
  return (await getById('assets', result.insertId))[0];
}

async function updateAsset(id, data) {
  const existing = await getAsset(id);

  // Pre-validate available count so we can give a clear message
  if (data.quantity !== undefined) {
    const newAvailable = data.quantity - existing.assigned;
    if (newAvailable < 0) {
      const err = new Error(`Cannot reduce quantity below assigned count (${existing.assigned})`);
      err.statusCode = 400;
      throw err;
    }
  }

  const newQty = data.quantity !== undefined ? data.quantity : existing.quantity;
  const newAvailable = newQty - existing.assigned;

  await query(
    `UPDATE assets SET
       category = ?, name = ?, serial_no = ?, quantity = ?, available = ?,
       price = ?, vendor = ?, purchase_date = ?, warranty_end = ?,
       location = ?, location_id = ?, po_number = ?, notes = ?
     WHERE id = ? AND is_deleted = 0`,
    [
      data.category !== undefined ? data.category : existing.category,
      data.name !== undefined ? data.name : existing.name,
      data.serialNo !== undefined ? (data.serialNo || null) : existing.serialNo,
      newQty,
      newAvailable,
      data.price !== undefined ? data.price : existing.price,
      data.vendor !== undefined ? (data.vendor || null) : existing.vendor,
      data.purchaseDate !== undefined ? (data.purchaseDate || null) : existing.purchaseDate,
      data.warrantyEnd !== undefined ? (data.warrantyEnd || null) : existing.warrantyEnd,
      data.location !== undefined ? (data.location || null) : existing.location,
      data.locationId !== undefined ? (data.locationId || null) : existing.locationId,
      data.poNumber !== undefined ? (data.poNumber || null) : existing.poNumber,
      data.notes !== undefined ? (data.notes || null) : existing.notes,
      id,
    ]
  );
  return getAsset(id);
}

async function deleteAsset(id) {
  const asset = await getAsset(id);
  if (asset.assigned > 0) {
    const err = new Error('Cannot delete asset that is currently assigned to employees');
    err.statusCode = 400;
    throw err;
  }
  await softDelete('assets', id);
  return { message: 'Asset deleted successfully' };
}

async function getLowStockAssets() {
  return query(
    `SELECT * FROM assets
     WHERE is_deleted = 0 AND available <= ? AND available >= 0
     ORDER BY available ASC`,
    [LOW_STOCK_THRESHOLD]
  );
}

module.exports = { listAssets, getAsset, createAsset, updateAsset, deleteAsset, getLowStockAssets };
