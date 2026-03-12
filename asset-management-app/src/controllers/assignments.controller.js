const assignmentService = require('../services/assignment.service');
const { getEffectiveLocationIds } = require('../middleware/locationFilter');

async function list(req, res, next) {
  try {
    const locationIds = getEffectiveLocationIds(req.user);
    const result = await assignmentService.listAssignments(req.query, locationIds);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const assignment = await assignmentService.getAssignment(parseInt(req.params.id));
    res.json({ success: true, data: assignment });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const assignment = await assignmentService.createAssignment(req.body, req.user?.id);
    const assetCount = assignment.assets.length;
    const licenseCount = assignment.licenses.length;
    res.status(201).json({
      success: true,
      data: assignment,
      message: `Assigned ${assetCount} asset(s) and ${licenseCount} license(s) to ${req.body.empName}!`,
    });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const assignment = await assignmentService.updateAssignment(parseInt(req.params.id), req.body);
    res.json({ success: true, data: assignment, message: 'Assignment updated successfully' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const result = await assignmentService.removeAssignment(parseInt(req.params.id));
    res.json({ success: true, message: result.message });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove };
