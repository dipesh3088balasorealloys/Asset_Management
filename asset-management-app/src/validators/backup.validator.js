const { body, param, query } = require('express-validator');
const {
  BACKUP_TYPES,
  DB_BACKUP_TYPES,
  BACKUP_SCHEDULES,
  BACKUP_STORAGE_LOCATIONS,
  BACKUP_STATUSES,
  DB_ENGINES,
} = require('../config/constants');

// ── Server Backup Validators ──────────────────────────────────────────

const createServerBackup = [
  body('serverName').trim().notEmpty().withMessage('Server name is required'),
  body('serverIp').optional({ values: 'falsy' }).trim(),
  body('backupType').isIn(BACKUP_TYPES).withMessage('Invalid backup type'),
  body('backupSchedule').isIn(BACKUP_SCHEDULES).withMessage('Invalid backup schedule'),
  body('storageLocation').isIn(BACKUP_STORAGE_LOCATIONS).withMessage('Invalid storage location'),
  body('storagePath').optional({ values: 'falsy' }).trim(),
  body('lastBackupDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
  body('lastBackupStatus').optional({ values: 'falsy' }).isIn(BACKUP_STATUSES).withMessage('Invalid backup status'),
  body('backupSizeGb').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Backup size must be >= 0'),
  body('retentionDays').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Retention days must be >= 1'),
  body('responsiblePerson').optional({ values: 'falsy' }).trim(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

const updateServerBackup = [
  param('id').isInt().withMessage('Invalid server backup ID'),
  body('serverName').optional().trim().notEmpty().withMessage('Server name cannot be empty'),
  body('serverIp').optional({ values: 'falsy' }).trim(),
  body('backupType').optional().isIn(BACKUP_TYPES).withMessage('Invalid backup type'),
  body('backupSchedule').optional().isIn(BACKUP_SCHEDULES).withMessage('Invalid backup schedule'),
  body('storageLocation').optional().isIn(BACKUP_STORAGE_LOCATIONS).withMessage('Invalid storage location'),
  body('storagePath').optional({ values: 'falsy' }).trim(),
  body('lastBackupDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
  body('lastBackupStatus').optional({ values: 'falsy' }).isIn(BACKUP_STATUSES).withMessage('Invalid backup status'),
  body('backupSizeGb').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Backup size must be >= 0'),
  body('retentionDays').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Retention days must be >= 1'),
  body('responsiblePerson').optional({ values: 'falsy' }).trim(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

const getServerBackups = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('status').optional().isIn(BACKUP_STATUSES),
  query('search').optional().trim(),
  query('sort').optional().isIn(['server_name', 'backup_type', 'last_backup_date', 'backup_size_gb', 'created_at']),
  query('order').optional().isIn(['asc', 'desc']),
];

// ── DB Backup Validators ──────────────────────────────────────────────

const createDbBackup = [
  body('databaseName').trim().notEmpty().withMessage('Database name is required'),
  body('serverName').optional({ values: 'falsy' }).trim(),
  body('dbEngine').isIn(DB_ENGINES).withMessage('Invalid database engine'),
  body('backupType').isIn(DB_BACKUP_TYPES).withMessage('Invalid backup type'),
  body('backupSchedule').isIn(BACKUP_SCHEDULES).withMessage('Invalid backup schedule'),
  body('storageLocation').isIn(BACKUP_STORAGE_LOCATIONS).withMessage('Invalid storage location'),
  body('storagePath').optional({ values: 'falsy' }).trim(),
  body('lastBackupDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
  body('lastBackupStatus').optional({ values: 'falsy' }).isIn(BACKUP_STATUSES).withMessage('Invalid backup status'),
  body('backupSizeGb').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Backup size must be >= 0'),
  body('retentionDays').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Retention days must be >= 1'),
  body('responsiblePerson').optional({ values: 'falsy' }).trim(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

const updateDbBackup = [
  param('id').isInt().withMessage('Invalid DB backup ID'),
  body('databaseName').optional().trim().notEmpty().withMessage('Database name cannot be empty'),
  body('serverName').optional({ values: 'falsy' }).trim(),
  body('dbEngine').optional().isIn(DB_ENGINES).withMessage('Invalid database engine'),
  body('backupType').optional().isIn(DB_BACKUP_TYPES).withMessage('Invalid backup type'),
  body('backupSchedule').optional().isIn(BACKUP_SCHEDULES).withMessage('Invalid backup schedule'),
  body('storageLocation').optional().isIn(BACKUP_STORAGE_LOCATIONS).withMessage('Invalid storage location'),
  body('storagePath').optional({ values: 'falsy' }).trim(),
  body('lastBackupDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
  body('lastBackupStatus').optional({ values: 'falsy' }).isIn(BACKUP_STATUSES).withMessage('Invalid backup status'),
  body('backupSizeGb').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Backup size must be >= 0'),
  body('retentionDays').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Retention days must be >= 1'),
  body('responsiblePerson').optional({ values: 'falsy' }).trim(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

const getDbBackups = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('status').optional().isIn(BACKUP_STATUSES),
  query('engine').optional().isIn(DB_ENGINES),
  query('search').optional().trim(),
  query('sort').optional().isIn(['database_name', 'server_name', 'db_engine', 'last_backup_date', 'backup_size_gb', 'created_at']),
  query('order').optional().isIn(['asc', 'desc']),
];

// ── Employee Backup Validators ────────────────────────────────────────

const createEmployeeBackup = [
  body('emailId').trim().isEmail().withMessage('Valid email is required'),
  body('userName').trim().notEmpty().withMessage('User name is required'),
  body('slNo').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Sl No must be a positive integer'),
  body('emailBackup').optional().isBoolean().withMessage('Email backup must be boolean'),
  body('onedriveBackup').optional().isBoolean().withMessage('OneDrive backup must be boolean'),
  body('desktopLaptopBackup').optional().isBoolean().withMessage('Desktop/Laptop backup must be boolean'),
  body('diskName').optional({ values: 'falsy' }).trim(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

const updateEmployeeBackup = [
  param('id').isInt().withMessage('Invalid employee backup ID'),
  body('emailId').optional().trim().isEmail().withMessage('Valid email is required'),
  body('userName').optional().trim().notEmpty().withMessage('User name cannot be empty'),
  body('slNo').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Sl No must be a positive integer'),
  body('emailBackup').optional().isBoolean().withMessage('Email backup must be boolean'),
  body('onedriveBackup').optional().isBoolean().withMessage('OneDrive backup must be boolean'),
  body('desktopLaptopBackup').optional().isBoolean().withMessage('Desktop/Laptop backup must be boolean'),
  body('diskName').optional({ values: 'falsy' }).trim(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

const getEmployeeBackups = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('search').optional().trim(),
  query('sort').optional().isIn(['user_name', 'email_id', 'sl_no', 'created_at']),
  query('order').optional().isIn(['asc', 'desc']),
];

module.exports = {
  createServerBackup,
  updateServerBackup,
  getServerBackups,
  createDbBackup,
  updateDbBackup,
  getDbBackups,
  createEmployeeBackup,
  updateEmployeeBackup,
  getEmployeeBackups,
};
