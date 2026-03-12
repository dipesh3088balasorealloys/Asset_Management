const fs = require('fs').promises;
const path = require('path');
const { callProcMulti, query } = require('../utils/db');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

async function listEwaste(q) {
  const { page, limit } = parsePagination(q);

  const search    = q.search || null;
  const sortField = q.sort   || 'created_at';
  const sortDir   = q.order  || 'desc';

  const sets = await callProcMulti('ewaste_list', [
    search, sortField, sortDir, page, limit,
  ]);

  const rows  = sets[0] || [];
  const total = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  return { data: rows, meta: buildPaginationMeta(page, limit, total) };
}

async function getEwaste(id) {
  const sets = await callProcMulti('ewaste_get', [id]);

  const records = sets[0] || [];
  if (!records.length) {
    const err = new Error('E-Waste record not found');
    err.statusCode = 404;
    throw err;
  }

  const photos = sets[1] || [];
  return { ...records[0], photos };
}

async function createEwaste(data, userId) {
  // Parse asset_names: accept JSON string or array
  let assetNames = data.assetNames || null;
  if (typeof assetNames === 'string') {
    try { assetNames = JSON.parse(assetNames); } catch { assetNames = [assetNames]; }
  }
  const assetNamesJson = assetNames ? JSON.stringify(assetNames) : JSON.stringify([]);

  const result = await query(
    `INSERT INTO ewaste
       (title, billing_number, asset_names, disposal_date, disposed_to,
        disposal_cost, reason, remarks, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.billingNumber || null,
      assetNamesJson,
      data.disposalDate || null,
      data.disposedTo || null,
      data.disposalCost || null,
      data.reason || null,
      data.remarks || null,
      userId || null,
    ]
  );

  const rows = await query('SELECT * FROM ewaste WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function updateEwaste(id, data) {
  const existing = await getEwaste(id);

  let assetNames = data.assetNames;
  if (assetNames !== undefined) {
    if (typeof assetNames === 'string') {
      try { assetNames = JSON.parse(assetNames); } catch { assetNames = [assetNames]; }
    }
    assetNames = JSON.stringify(assetNames);
  } else {
    assetNames = existing.assetNames ? JSON.stringify(existing.assetNames) : null;
  }

  await query(
    `UPDATE ewaste SET
       title = ?, billing_number = ?, asset_names = ?, disposal_date = ?,
       disposed_to = ?, disposal_cost = ?, reason = ?, remarks = ?
     WHERE id = ? AND is_deleted = 0`,
    [
      data.title !== undefined ? data.title : existing.title,
      data.billingNumber !== undefined ? (data.billingNumber || null) : existing.billingNumber,
      assetNames,
      data.disposalDate !== undefined ? (data.disposalDate || null) : existing.disposalDate,
      data.disposedTo !== undefined ? (data.disposedTo || null) : existing.disposedTo,
      data.disposalCost !== undefined ? (data.disposalCost || null) : existing.disposalCost,
      data.reason !== undefined ? (data.reason || null) : existing.reason,
      data.remarks !== undefined ? (data.remarks || null) : existing.remarks,
      id,
    ]
  );

  const rows = await query('SELECT * FROM ewaste WHERE id = ?', [id]);
  return rows[0];
}

async function deleteEwaste(id) {
  await getEwaste(id);
  await query('UPDATE ewaste SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
  return { message: 'E-Waste record deleted successfully' };
}

async function addPhoto(ewasteId, filePath, photoType, originalName) {
  // Verify ewaste record exists
  await query('SELECT id FROM ewaste WHERE id = ? AND is_deleted = 0', [ewasteId]);

  const result = await query(
    `INSERT INTO ewaste_photos (ewaste_id, file_path, photo_type, original_name)
     VALUES (?, ?, ?, ?)`,
    [ewasteId, filePath, photoType, originalName]
  );

  const rows = await query('SELECT * FROM ewaste_photos WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function deletePhoto(photoId) {
  const rows = await query('SELECT * FROM ewaste_photos WHERE id = ?', [photoId]);
  const photo = rows[0];

  if (!photo) {
    const err = new Error('Photo not found');
    err.statusCode = 404;
    throw err;
  }

  await query('DELETE FROM ewaste_photos WHERE id = ?', [photoId]);

  if (photo.filePath) {
    try {
      await fs.unlink(path.resolve(photo.filePath));
    } catch (_) {
      // File may already be removed — don't throw
    }
  }

  return photo;
}

module.exports = {
  listEwaste,
  getEwaste,
  createEwaste,
  updateEwaste,
  deleteEwaste,
  addPhoto,
  deletePhoto,
};
