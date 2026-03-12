const router = require('express').Router();
const controller = require('../controllers/services.controller');
const { createService, updateService, getServices } = require('../validators/service.validator');
const validate = require('../middleware/validate');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.get('/', getServices, validate, controller.list);
router.get('/cost-summary', controller.costSummary);
router.get('/:id', controller.getById);
router.post('/', authorize('admin', 'manager'), createService, validate, auditLog('CREATE', 'Service'), controller.create);
router.put('/:id', authorize('admin', 'manager'), updateService, validate, auditLog('UPDATE', 'Service'), controller.update);
router.delete('/:id', authorize('admin'), auditLog('DELETE', 'Service'), controller.remove);

module.exports = router;
