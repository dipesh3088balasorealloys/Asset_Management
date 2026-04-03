const { callProcMulti, query } = require('../utils/db');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { getById, softDelete } = require('../utils/queries');

// ── Server Backup Services ────────────────────────────────────────────

async function listServerBackups(q) {
  const { page, limit } = parsePagination(q);

  const search     = q.search     || null;
  const backupType = q.backupType || null;
  const status     = q.status     || null;
  const sortField  = q.sort       || 'created_at';
  const sortDir    = q.order      || 'desc';

  const sets = await callProcMulti('SP_ASSET_SERVER_BACKUP_LIST', [
    search, backupType, status, sortField, sortDir, page, limit,
  ]);

  const rows  = sets[0] || [];
  const total = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  return { data: rows, meta: buildPaginationMeta(page, limit, total) };
}

async function getServerBackup(id) {
  const rows = await getById('asset_server_backups', id);
  if (!rows.length) {
    const err = new Error('Server backup not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

async function createServerBackup(data, userId) {
  const result = await query(
    `INSERT INTO asset_server_backups
       (server_name, server_ip, backup_type, backup_schedule, storage_location,
        storage_path, last_backup_date, last_backup_status, backup_size_gb,
        retention_days, responsible_person, remarks, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.serverName,
      data.serverIp || null,
      data.backupType,
      data.backupSchedule,
      data.storageLocation,
      data.storagePath || null,
      data.lastBackupDate || null,
      data.lastBackupStatus || null,
      data.backupSizeGb || null,
      data.retentionDays || null,
      data.responsiblePerson || null,
      data.remarks || null,
      userId || null,
    ]
  );
  return (await getById('asset_server_backups', result.insertId))[0];
}

async function updateServerBackup(id, data) {
  const existing = await getServerBackup(id);

  await query(
    `UPDATE asset_server_backups SET
       server_name = ?, server_ip = ?, backup_type = ?, backup_schedule = ?,
       storage_location = ?, storage_path = ?, last_backup_date = ?,
       last_backup_status = ?, backup_size_gb = ?, retention_days = ?,
       responsible_person = ?, remarks = ?
     WHERE id = ? AND is_deleted = 0`,
    [
      data.serverName !== undefined ? data.serverName : existing.serverName,
      data.serverIp !== undefined ? (data.serverIp || null) : existing.serverIp,
      data.backupType !== undefined ? data.backupType : existing.backupType,
      data.backupSchedule !== undefined ? data.backupSchedule : existing.backupSchedule,
      data.storageLocation !== undefined ? data.storageLocation : existing.storageLocation,
      data.storagePath !== undefined ? (data.storagePath || null) : existing.storagePath,
      data.lastBackupDate !== undefined ? (data.lastBackupDate || null) : existing.lastBackupDate,
      data.lastBackupStatus !== undefined ? (data.lastBackupStatus || null) : existing.lastBackupStatus,
      data.backupSizeGb !== undefined ? (data.backupSizeGb || null) : existing.backupSizeGb,
      data.retentionDays !== undefined ? (data.retentionDays || null) : existing.retentionDays,
      data.responsiblePerson !== undefined ? (data.responsiblePerson || null) : existing.responsiblePerson,
      data.remarks !== undefined ? (data.remarks || null) : existing.remarks,
      id,
    ]
  );
  return getServerBackup(id);
}

async function deleteServerBackup(id) {
  await getServerBackup(id);
  await softDelete('asset_server_backups', id);
  return { message: 'Server backup deleted successfully' };
}

// ── DB Backup Services ────────────────────────────────────────────────

async function listDbBackups(q) {
  const { page, limit } = parsePagination(q);

  const search     = q.search     || null;
  const engine     = q.engine     || null;
  const backupType = q.backupType || null;
  const status     = q.status     || null;
  const sortField  = q.sort       || 'created_at';
  const sortDir    = q.order      || 'desc';

  const sets = await callProcMulti('SP_ASSET_DB_BACKUP_LIST', [
    search, engine, backupType, status, sortField, sortDir, page, limit,
  ]);

  const rows  = sets[0] || [];
  const total = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  return { data: rows, meta: buildPaginationMeta(page, limit, total) };
}

async function getDbBackup(id) {
  const rows = await getById('asset_db_backups', id);
  if (!rows.length) {
    const err = new Error('Database backup not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

async function createDbBackup(data, userId) {
  const result = await query(
    `INSERT INTO asset_db_backups
       (database_name, server_name, db_engine, backup_type, backup_schedule,
        storage_location, storage_path, last_backup_date, last_backup_status,
        backup_size_gb, retention_days, responsible_person, remarks, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.databaseName,
      data.serverName || null,
      data.dbEngine,
      data.backupType,
      data.backupSchedule,
      data.storageLocation,
      data.storagePath || null,
      data.lastBackupDate || null,
      data.lastBackupStatus || null,
      data.backupSizeGb || null,
      data.retentionDays || null,
      data.responsiblePerson || null,
      data.remarks || null,
      userId || null,
    ]
  );
  return (await getById('asset_db_backups', result.insertId))[0];
}

async function updateDbBackup(id, data) {
  const existing = await getDbBackup(id);

  await query(
    `UPDATE asset_db_backups SET
       database_name = ?, server_name = ?, db_engine = ?, backup_type = ?,
       backup_schedule = ?, storage_location = ?, storage_path = ?,
       last_backup_date = ?, last_backup_status = ?, backup_size_gb = ?,
       retention_days = ?, responsible_person = ?, remarks = ?
     WHERE id = ? AND is_deleted = 0`,
    [
      data.databaseName !== undefined ? data.databaseName : existing.databaseName,
      data.serverName !== undefined ? (data.serverName || null) : existing.serverName,
      data.dbEngine !== undefined ? data.dbEngine : existing.dbEngine,
      data.backupType !== undefined ? data.backupType : existing.backupType,
      data.backupSchedule !== undefined ? data.backupSchedule : existing.backupSchedule,
      data.storageLocation !== undefined ? data.storageLocation : existing.storageLocation,
      data.storagePath !== undefined ? (data.storagePath || null) : existing.storagePath,
      data.lastBackupDate !== undefined ? (data.lastBackupDate || null) : existing.lastBackupDate,
      data.lastBackupStatus !== undefined ? (data.lastBackupStatus || null) : existing.lastBackupStatus,
      data.backupSizeGb !== undefined ? (data.backupSizeGb || null) : existing.backupSizeGb,
      data.retentionDays !== undefined ? (data.retentionDays || null) : existing.retentionDays,
      data.responsiblePerson !== undefined ? (data.responsiblePerson || null) : existing.responsiblePerson,
      data.remarks !== undefined ? (data.remarks || null) : existing.remarks,
      id,
    ]
  );
  return getDbBackup(id);
}

async function deleteDbBackup(id) {
  await getDbBackup(id);
  await softDelete('asset_db_backups', id);
  return { message: 'Database backup deleted successfully' };
}

// ── Employee Backup Services ──────────────────────────────────────────

async function listEmployeeBackups(q) {
  const { page, limit } = parsePagination(q);

  const search    = q.search || null;
  const sortField = q.sort   || 'created_at';
  const sortDir   = q.order  || 'desc';

  const sets = await callProcMulti('SP_ASSET_EMPLOYEE_BACKUP_LIST', [
    search, sortField, sortDir, page, limit,
  ]);

  const rows  = sets[0] || [];
  const total = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  return { data: rows, meta: buildPaginationMeta(page, limit, total) };
}

async function getEmployeeBackup(id) {
  const rows = await getById('asset_employee_backups', id);
  if (!rows.length) {
    const err = new Error('Employee backup not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

async function createEmployeeBackup(data, userId) {
  const result = await query(
    `INSERT INTO asset_employee_backups
       (sl_no, email_id, user_name, email_backup, onedrive_backup,
        desktop_laptop_backup, disk_name, remarks, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.slNo || null,
      data.emailId,
      data.userName,
      data.emailBackup !== undefined ? data.emailBackup : false,
      data.onedriveBackup !== undefined ? data.onedriveBackup : false,
      data.desktopLaptopBackup !== undefined ? data.desktopLaptopBackup : false,
      data.diskName || null,
      data.remarks || null,
      userId || null,
    ]
  );
  return (await getById('asset_employee_backups', result.insertId))[0];
}

async function updateEmployeeBackup(id, data) {
  const existing = await getEmployeeBackup(id);

  await query(
    `UPDATE asset_employee_backups SET
       sl_no = ?, email_id = ?, user_name = ?, email_backup = ?,
       onedrive_backup = ?, desktop_laptop_backup = ?, disk_name = ?, remarks = ?
     WHERE id = ? AND is_deleted = 0`,
    [
      data.slNo !== undefined ? (data.slNo || null) : existing.slNo,
      data.emailId !== undefined ? data.emailId : existing.emailId,
      data.userName !== undefined ? data.userName : existing.userName,
      data.emailBackup !== undefined ? data.emailBackup : existing.emailBackup,
      data.onedriveBackup !== undefined ? data.onedriveBackup : existing.onedriveBackup,
      data.desktopLaptopBackup !== undefined ? data.desktopLaptopBackup : existing.desktopLaptopBackup,
      data.diskName !== undefined ? (data.diskName || null) : existing.diskName,
      data.remarks !== undefined ? (data.remarks || null) : existing.remarks,
      id,
    ]
  );
  return getEmployeeBackup(id);
}

async function deleteEmployeeBackup(id) {
  await getEmployeeBackup(id);
  await softDelete('asset_employee_backups', id);
  return { message: 'Employee backup deleted successfully' };
}

module.exports = {
  listServerBackups,
  getServerBackup,
  createServerBackup,
  updateServerBackup,
  deleteServerBackup,
  listDbBackups,
  getDbBackup,
  createDbBackup,
  updateDbBackup,
  deleteDbBackup,
  listEmployeeBackups,
  getEmployeeBackup,
  createEmployeeBackup,
  updateEmployeeBackup,
  deleteEmployeeBackup,
};
