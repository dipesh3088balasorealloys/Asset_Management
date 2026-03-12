const router = require('express').Router();
const controller = require('../controllers/backup.controller');
const {
  createServerBackup,
  updateServerBackup,
  getServerBackups,
  createDbBackup,
  updateDbBackup,
  getDbBackups,
  createEmployeeBackup,
  updateEmployeeBackup,
  getEmployeeBackups,
} = require('../validators/backup.validator');
const validate = require('../middleware/validate');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

// ── Server Backups ────────────────────────────────────────────────────

router.get('/server', getServerBackups, validate, controller.listServer);
router.get('/server/:id', controller.getServer);
router.post('/server', authorize('admin', 'manager'), createServerBackup, validate, auditLog('CREATE', 'ServerBackup'), controller.createServer);
router.put('/server/:id', authorize('admin', 'manager'), updateServerBackup, validate, auditLog('UPDATE', 'ServerBackup'), controller.updateServer);
router.delete('/server/:id', authorize('admin'), auditLog('DELETE', 'ServerBackup'), controller.removeServer);

// ── DB Backups ────────────────────────────────────────────────────────

router.get('/db', getDbBackups, validate, controller.listDb);
router.get('/db/:id', controller.getDb);
router.post('/db', authorize('admin', 'manager'), createDbBackup, validate, auditLog('CREATE', 'DbBackup'), controller.createDb);
router.put('/db/:id', authorize('admin', 'manager'), updateDbBackup, validate, auditLog('UPDATE', 'DbBackup'), controller.updateDb);
router.delete('/db/:id', authorize('admin'), auditLog('DELETE', 'DbBackup'), controller.removeDb);

// ── Employee Backups ──────────────────────────────────────────────────

router.get('/employee', getEmployeeBackups, validate, controller.listEmployee);
router.get('/employee/:id', controller.getEmployee);
router.post('/employee', authorize('admin', 'manager'), createEmployeeBackup, validate, auditLog('CREATE', 'EmployeeBackup'), controller.createEmployee);
router.put('/employee/:id', authorize('admin', 'manager'), updateEmployeeBackup, validate, auditLog('UPDATE', 'EmployeeBackup'), controller.updateEmployee);
router.delete('/employee/:id', authorize('admin'), auditLog('DELETE', 'EmployeeBackup'), controller.removeEmployee);

module.exports = router;
