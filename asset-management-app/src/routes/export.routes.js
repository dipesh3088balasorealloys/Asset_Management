const router = require('express').Router();
const authorize = require('../middleware/authorize');
const controller = require('../controllers/export.controller');

// Report exports — must come BEFORE /:entity to avoid matching "report" as entity
router.get('/report/:reportType', authorize('admin', 'manager'), controller.exportReportData);

// Entity exports
router.get('/:entity', authorize('admin', 'manager'), controller.exportData);

module.exports = router;
