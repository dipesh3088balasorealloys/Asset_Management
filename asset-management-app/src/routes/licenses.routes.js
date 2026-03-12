const router = require('express').Router();
const controller = require('../controllers/licenses.controller');
const { createLicense, updateLicense, getLicenses } = require('../validators/license.validator');
const validate = require('../middleware/validate');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.get('/', getLicenses, validate, controller.list);
router.get('/expiring', controller.expiring);
router.get('/:id', controller.getById);
router.post('/', authorize('admin', 'manager'), createLicense, validate, auditLog('CREATE', 'License'), controller.create);
router.put('/:id', authorize('admin', 'manager'), updateLicense, validate, auditLog('UPDATE', 'License'), controller.update);
router.delete('/:id', authorize('admin'), auditLog('DELETE', 'License'), controller.remove);

module.exports = router;
