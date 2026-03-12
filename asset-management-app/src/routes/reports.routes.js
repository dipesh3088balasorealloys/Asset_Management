const router = require('express').Router();
const controller = require('../controllers/reports.controller');

router.get('/dashboard', controller.dashboard);
router.get('/asset-utilization', controller.assetUtilization);
router.get('/license-utilization', controller.licenseUtilization);
router.get('/service-costs', controller.serviceCosts);
router.get('/employee-summary', controller.employeeSummary);
router.get('/renewals', controller.renewals);
router.get('/location-summary', controller.locationSummary);

module.exports = router;
