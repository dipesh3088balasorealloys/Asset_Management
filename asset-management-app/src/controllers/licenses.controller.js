const licenseService = require('../services/license.service');

async function list(req, res, next) {
  try {
    const result = await licenseService.listLicenses(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const license = await licenseService.getLicense(parseInt(req.params.id));
    res.json({ success: true, data: license });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const license = await licenseService.createLicense(req.body, req.user?.id);
    res.status(201).json({ success: true, data: license, message: 'License added successfully!' });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const license = await licenseService.updateLicense(parseInt(req.params.id), req.body);
    res.json({ success: true, data: license, message: 'License updated successfully' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await licenseService.deleteLicense(parseInt(req.params.id));
    res.json({ success: true, message: 'License deleted' });
  } catch (err) { next(err); }
}

async function expiring(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const licenses = await licenseService.getExpiringLicenses(days);
    res.json({ success: true, data: licenses });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, expiring };
