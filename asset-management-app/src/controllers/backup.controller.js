const backupService = require('../services/backup.service');

// ── Server Backup Handlers ────────────────────────────────────────────

async function listServer(req, res, next) {
  try {
    const result = await backupService.listServerBackups(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getServer(req, res, next) {
  try {
    const backup = await backupService.getServerBackup(parseInt(req.params.id));
    res.json({ success: true, data: backup });
  } catch (err) { next(err); }
}

async function createServer(req, res, next) {
  try {
    const backup = await backupService.createServerBackup(req.body, req.user?.id);
    res.status(201).json({ success: true, data: backup, message: 'Server backup added successfully!' });
  } catch (err) { next(err); }
}

async function updateServer(req, res, next) {
  try {
    const backup = await backupService.updateServerBackup(parseInt(req.params.id), req.body);
    res.json({ success: true, data: backup, message: 'Server backup updated successfully' });
  } catch (err) { next(err); }
}

async function removeServer(req, res, next) {
  try {
    await backupService.deleteServerBackup(parseInt(req.params.id));
    res.json({ success: true, message: 'Server backup deleted' });
  } catch (err) { next(err); }
}

// ── DB Backup Handlers ────────────────────────────────────────────────

async function listDb(req, res, next) {
  try {
    const result = await backupService.listDbBackups(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getDb(req, res, next) {
  try {
    const backup = await backupService.getDbBackup(parseInt(req.params.id));
    res.json({ success: true, data: backup });
  } catch (err) { next(err); }
}

async function createDb(req, res, next) {
  try {
    const backup = await backupService.createDbBackup(req.body, req.user?.id);
    res.status(201).json({ success: true, data: backup, message: 'Database backup added successfully!' });
  } catch (err) { next(err); }
}

async function updateDb(req, res, next) {
  try {
    const backup = await backupService.updateDbBackup(parseInt(req.params.id), req.body);
    res.json({ success: true, data: backup, message: 'Database backup updated successfully' });
  } catch (err) { next(err); }
}

async function removeDb(req, res, next) {
  try {
    await backupService.deleteDbBackup(parseInt(req.params.id));
    res.json({ success: true, message: 'Database backup deleted' });
  } catch (err) { next(err); }
}

// ── Employee Backup Handlers ──────────────────────────────────────────

async function listEmployee(req, res, next) {
  try {
    const result = await backupService.listEmployeeBackups(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getEmployee(req, res, next) {
  try {
    const backup = await backupService.getEmployeeBackup(parseInt(req.params.id));
    res.json({ success: true, data: backup });
  } catch (err) { next(err); }
}

async function createEmployee(req, res, next) {
  try {
    const backup = await backupService.createEmployeeBackup(req.body, req.user?.id);
    res.status(201).json({ success: true, data: backup, message: 'Employee backup added successfully!' });
  } catch (err) { next(err); }
}

async function updateEmployee(req, res, next) {
  try {
    const backup = await backupService.updateEmployeeBackup(parseInt(req.params.id), req.body);
    res.json({ success: true, data: backup, message: 'Employee backup updated successfully' });
  } catch (err) { next(err); }
}

async function removeEmployee(req, res, next) {
  try {
    await backupService.deleteEmployeeBackup(parseInt(req.params.id));
    res.json({ success: true, message: 'Employee backup deleted' });
  } catch (err) { next(err); }
}

module.exports = {
  listServer,
  getServer,
  createServer,
  updateServer,
  removeServer,
  listDb,
  getDb,
  createDb,
  updateDb,
  removeDb,
  listEmployee,
  getEmployee,
  createEmployee,
  updateEmployee,
  removeEmployee,
};
