const router = require('express').Router();
const controller = require('../controllers/assets.controller');
const { createAsset, updateAsset, getAssets } = require('../validators/asset.validator');
const validate = require('../middleware/validate');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.get('/', getAssets, validate, controller.list);
router.get('/low-stock', controller.lowStock);
router.get('/:id', controller.getById);
router.post('/', authorize('admin', 'manager'), createAsset, validate, auditLog('CREATE', 'Asset'), controller.create);
router.put('/:id', authorize('admin', 'manager'), updateAsset, validate, auditLog('UPDATE', 'Asset'), controller.update);
router.delete('/:id', authorize('admin'), auditLog('DELETE', 'Asset'), controller.remove);

module.exports = router;
