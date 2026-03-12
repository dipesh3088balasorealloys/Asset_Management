const reportService = require('../services/report.service');
const { getEffectiveLocationIds } = require('../middleware/locationFilter');

async function dashboard(req, res, next) {
  try {
    const locationIds = getEffectiveLocationIds(req.user);
    const data = await reportService.getDashboardSummary(locationIds);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function assetUtilization(req, res, next) {
  try {
    const locationIds = getEffectiveLocationIds(req.user);
    const data = await reportService.getAssetUtilization(locationIds);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function licenseUtilization(req, res, next) {
  try {
    const data = await reportService.getLicenseUtilization();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function serviceCosts(req, res, next) {
  try {
    const data = await reportService.getServiceCostBreakdown();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function employeeSummary(req, res, next) {
  try {
    const locationIds = getEffectiveLocationIds(req.user);
    const data = await reportService.getEmployeeSummary(locationIds);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function renewals(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await reportService.getUpcomingRenewals(days);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function locationSummary(req, res, next) {
  try {
    const locationIds = getEffectiveLocationIds(req.user);
    const data = await reportService.getLocationSummary(locationIds);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { dashboard, assetUtilization, licenseUtilization, serviceCosts, employeeSummary, renewals, locationSummary };
