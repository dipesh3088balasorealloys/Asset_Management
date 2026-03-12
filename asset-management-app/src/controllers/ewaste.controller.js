const path = require('path');
const multer = require('multer');
const ewasteService = require('../services/ewaste.service');

// -------------------------------------------------------
// Multer configuration for e-waste photo uploads
// -------------------------------------------------------
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, 'uploads/ewaste/');
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// -------------------------------------------------------
// Controller methods
// -------------------------------------------------------

async function list(req, res, next) {
  try {
    const result = await ewasteService.listEwaste(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const ewaste = await ewasteService.getEwaste(parseInt(req.params.id));
    res.json({ success: true, data: ewaste });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const record = await ewasteService.createEwaste(req.body, req.user?.id);

    // Attach uploaded photos if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await ewasteService.addPhoto(
          record.id,
          file.path,
          file.mimetype,
          file.originalname,
        );
      }
    }

    // Re-fetch to include photos in response
    const full = await ewasteService.getEwaste(record.id);
    res.status(201).json({ success: true, data: full, message: 'E-Waste record created successfully' });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const record = await ewasteService.updateEwaste(parseInt(req.params.id), req.body);
    res.json({ success: true, data: record, message: 'E-Waste record updated successfully' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await ewasteService.deleteEwaste(parseInt(req.params.id));
    res.json({ success: true, message: 'E-Waste record deleted' });
  } catch (err) { next(err); }
}

async function addPhotos(req, res, next) {
  try {
    const ewasteId = parseInt(req.params.id);

    // Verify record exists
    await ewasteService.getEwaste(ewasteId);

    const photos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const photo = await ewasteService.addPhoto(
          ewasteId,
          file.path,
          file.mimetype,
          file.originalname,
        );
        photos.push(photo);
      }
    }

    res.status(201).json({ success: true, data: photos, message: `${photos.length} photo(s) added` });
  } catch (err) { next(err); }
}

async function deletePhoto(req, res, next) {
  try {
    await ewasteService.deletePhoto(parseInt(req.params.photoId));
    res.json({ success: true, message: 'Photo deleted' });
  } catch (err) { next(err); }
}

module.exports = { upload, list, getById, create, update, remove, addPhotos, deletePhoto };
