const multer = require('multer');
const importService = require('../services/import.service');

// ---------------------------------------------------------------------------
// Multer configuration – memory storage, 5 MB limit, CSV/Excel only
// ---------------------------------------------------------------------------

const ALLOWED_MIMETYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('Only CSV and Excel (.xlsx) files are allowed');
      err.statusCode = 400;
      cb(err);
    }
  },
});

/**
 * Multer middleware for a single file upload on the 'file' field.
 * Exported so the route layer can attach it before the controller handler.
 */
const uploadMiddleware = upload.single('file');

// ---------------------------------------------------------------------------
// Controller handlers
// ---------------------------------------------------------------------------

async function importAssets(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Please attach a CSV or Excel file.');
      err.statusCode = 400;
      throw err;
    }

    const result = await importService.importAssets(
      req.file.buffer,
      req.file.mimetype,
      req.user?.id
    );

    res.json({
      success: true,
      message: `Import complete: ${result.imported} assets imported, ${result.skipped} skipped`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function importLicenses(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Please attach a CSV or Excel file.');
      err.statusCode = 400;
      throw err;
    }

    const result = await importService.importLicenses(
      req.file.buffer,
      req.file.mimetype,
      req.user?.id
    );

    res.json({
      success: true,
      message: `Import complete: ${result.imported} licenses imported, ${result.skipped} skipped`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function importServices(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Please attach a CSV or Excel file.');
      err.statusCode = 400;
      throw err;
    }

    const result = await importService.importServices(
      req.file.buffer,
      req.file.mimetype,
      req.user?.id
    );

    res.json({
      success: true,
      message: `Import complete: ${result.imported} services imported, ${result.skipped} skipped`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function importAssignments(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Please attach a CSV or Excel file.');
      err.statusCode = 400;
      throw err;
    }

    const result = await importService.importAssignments(
      req.file.buffer,
      req.file.mimetype,
      req.user?.id
    );

    res.json({
      success: true,
      message: `Import complete: ${result.imported} assignments imported, ${result.skipped} skipped`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadMiddleware, importAssets, importLicenses, importServices, importAssignments };
