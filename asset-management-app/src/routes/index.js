const router = require('express').Router();
const auth = require('../middleware/auth');

// Health check (public)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (login is public, register requires admin)
router.use('/auth', require('./auth.routes'));

// All routes below require authentication
router.use(auth);

router.use('/users', require('./user.routes'));
router.use('/locations', require('./locations.routes'));
router.use('/assets', require('./assets.routes'));
router.use('/licenses', require('./licenses.routes'));
router.use('/services', require('./services.routes'));
router.use('/assignments', require('./assignments.routes'));
router.use('/employees', require('./employees.routes'));
router.use('/reports', require('./reports.routes'));
router.use('/import', require('./import.routes'));
router.use('/export', require('./export.routes'));
router.use('/audit-logs', require('./audit.routes'));
router.use('/ewaste', require('./ewaste.routes'));
router.use('/backups', require('./backup.routes'));

module.exports = router;
