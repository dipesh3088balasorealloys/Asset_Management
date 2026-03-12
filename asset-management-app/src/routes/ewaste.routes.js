const router = require('express').Router();
const controller = require('../controllers/ewaste.controller');
const { createEwaste, updateEwaste, getEwaste } = require('../validators/ewaste.validator');
const validate = require('../middleware/validate');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.get('/', getEwaste, validate, controller.list);
router.get('/:id', controller.getById);
router.post('/', authorize('admin', 'manager'), controller.upload.array('photos', 10), createEwaste, validate, auditLog('CREATE', 'EWaste'), controller.create);
router.put('/:id', authorize('admin', 'manager'), updateEwaste, validate, auditLog('UPDATE', 'EWaste'), controller.update);
router.delete('/:id', authorize('admin'), auditLog('DELETE', 'EWaste'), controller.remove);
router.post('/:id/photos', authorize('admin', 'manager'), controller.upload.array('photos', 10), controller.addPhotos);
router.delete('/:id/photos/:photoId', authorize('admin', 'manager'), controller.deletePhoto);

module.exports = router;
