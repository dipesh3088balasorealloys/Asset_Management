const router = require('express').Router();
const controller = require('../controllers/assignments.controller');
const { createAssignment, updateAssignment, getAssignments } = require('../validators/assignment.validator');
const validate = require('../middleware/validate');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.get('/', getAssignments, validate, controller.list);
router.get('/:id', controller.getById);
router.post('/', authorize('admin', 'manager'), createAssignment, validate, auditLog('ASSIGN', 'Assignment'), controller.create);
router.put('/:id', authorize('admin', 'manager'), updateAssignment, validate, auditLog('UPDATE', 'Assignment'), controller.update);
router.delete('/:id', authorize('admin'), auditLog('UNASSIGN', 'Assignment'), controller.remove);

module.exports = router;
