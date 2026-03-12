const serviceService = require('../services/service.service');

async function list(req, res, next) {
  try {
    const result = await serviceService.listServices(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const service = await serviceService.getService(parseInt(req.params.id));
    res.json({ success: true, data: service });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const service = await serviceService.createService(req.body, req.user?.id);
    res.status(201).json({ success: true, data: service, message: `Service "${req.body.name}" added!` });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const service = await serviceService.updateService(parseInt(req.params.id), req.body);
    res.json({ success: true, data: service, message: 'Service updated successfully' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await serviceService.deleteService(parseInt(req.params.id));
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) { next(err); }
}

async function costSummary(req, res, next) {
  try {
    const summary = await serviceService.getCostSummary();
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, costSummary };
