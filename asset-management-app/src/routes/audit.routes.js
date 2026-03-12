const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { getAuditLogs, getEntityHistory } = require('../controllers/audit.controller');

router.get('/', authorize('admin'), getAuditLogs);
router.get('/entity/:entityType/:entityId', authorize('admin'), getEntityHistory);

module.exports = router;
