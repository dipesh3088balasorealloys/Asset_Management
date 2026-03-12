const router = require('express').Router();
const path = require('path');
const authorize = require('../middleware/authorize');
const controller = require('../controllers/import.controller');
const auditLog = require('../middleware/auditLog');

// All import endpoints require admin role
router.post(
  '/assets',
  authorize('admin'),
  controller.uploadMiddleware,
  auditLog('IMPORT', 'Asset'),
  controller.importAssets
);

router.post(
  '/licenses',
  authorize('admin'),
  controller.uploadMiddleware,
  auditLog('IMPORT', 'License'),
  controller.importLicenses
);

router.post(
  '/services',
  authorize('admin'),
  controller.uploadMiddleware,
  auditLog('IMPORT', 'Service'),
  controller.importServices
);

router.post(
  '/assignments',
  authorize('admin'),
  controller.uploadMiddleware,
  auditLog('IMPORT', 'Assignment'),
  controller.importAssignments
);

// Serve CSV template files (accessible to any authenticated user)
const TEMPLATE_MAP = {
  assets: 'import-assets.csv',
  licenses: 'import-licenses.csv',
  services: 'import-services.csv',
  assignments: 'import-assignments.csv',
};

router.get('/template/:type', (req, res, next) => {
  const templateFile = TEMPLATE_MAP[req.params.type];
  if (!templateFile) {
    const err = new Error(`Unknown template type "${req.params.type}". Use: ${Object.keys(TEMPLATE_MAP).join(', ')}`);
    err.statusCode = 400;
    return next(err);
  }

  const filePath = path.join(__dirname, '..', '..', 'public', 'templates', templateFile);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${templateFile}"`);
  res.sendFile(filePath, (err) => {
    if (err) next(err);
  });
});

module.exports = router;
