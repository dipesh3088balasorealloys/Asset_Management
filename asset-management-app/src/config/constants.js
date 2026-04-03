const ASSET_CATEGORIES = [
  'AccessPoint', 'Server', 'Desktop',
  'Laptop', 'iPad', 'Tablet', 'Printer', 'Router', 'Switch', 'Firewall', 'SFP',
  'Projector', 'Scanner', 'CCTV', 'VideoConference',
  'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Webcam', 'DockingStation', 'FRS',
  'Other',
];

// Display-friendly names for categories
const ASSET_CATEGORY_LABELS = {
  AccessPoint: 'Access Point',
  Server: 'Server',
  Desktop: 'Desktop',
  Laptop: 'Laptop',
  Printer: 'Printer',
  Router: 'Router',
  Switch: 'Switch',
  Firewall: 'Firewall',
  SFP: 'SFP',
  Projector: 'Projector',
  Scanner: 'Scanner',
  Monitor: 'Monitor',
  Keyboard: 'Keyboard',
  Mouse: 'Mouse',
  Headset: 'Headset',
  Webcam: 'Webcam',
  DockingStation: 'Docking Station',
  FRS: 'FRS',
  iPad: 'iPad',
  Tablet: 'Tablet',
  CCTV: 'CCTV',
  VideoConference: 'Video Conference System',
  Other: 'Other',
};

// Categories that require unique serial number tracking (quantity always 1)
// All Assets (IT + Non-IT) need serial; only Components use quantity
const SERIAL_REQUIRED_CATEGORIES = [
  'AccessPoint', 'Server', 'Desktop', 'Laptop', 'iPad', 'Tablet', 'Printer', 'Router', 'Switch', 'Firewall', 'SFP',
  'Projector', 'Scanner', 'CCTV', 'VideoConference',
];

const SERVICE_TYPES = [
  'SaaS', 'Cloud', 'Maintenance', 'Support',
  'Consulting', 'Hosting', 'Security', 'Other'
];

const SERVICE_STATUSES = ['Active', 'Pending', 'Cancelled'];

const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Yearly', 'OneTime'];

const BILLING_CYCLE_LABELS = {
  Monthly: 'Monthly',
  Quarterly: 'Quarterly',
  Yearly: 'Yearly',
  OneTime: 'One-time'
};

const DEPARTMENTS = [
  'IT', 'HR', 'Finance', 'Marketing',
  'Operations', 'Sales', 'Engineering', 'Design'
];

const USER_ROLES = ['admin', 'manager', 'viewer'];

const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD) || 5;

// E-Waste constants (bulk disposal model — no per-asset conditions/methods needed)

// Backup constants
const BACKUP_TYPES = ['Full', 'Incremental', 'Differential'];
const DB_BACKUP_TYPES = ['Full', 'Incremental', 'Differential', 'Log'];
const BACKUP_SCHEDULES = ['Daily', 'Weekly', 'Monthly'];
const BACKUP_STORAGE_LOCATIONS = ['Local', 'NAS', 'Cloud', 'Tape'];
const BACKUP_STATUSES = ['Success', 'Failed', 'Partial'];
const DB_ENGINES = ['MySQL', 'PostgreSQL', 'MSSQL', 'Oracle', 'MongoDB', 'Other'];

module.exports = {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABELS,
  SERIAL_REQUIRED_CATEGORIES,
  SERVICE_TYPES,
  SERVICE_STATUSES,
  BILLING_CYCLES,
  BILLING_CYCLE_LABELS,
  DEPARTMENTS,
  USER_ROLES,
  LOW_STOCK_THRESHOLD,
  BACKUP_TYPES,
  DB_BACKUP_TYPES,
  BACKUP_SCHEDULES,
  BACKUP_STORAGE_LOCATIONS,
  BACKUP_STATUSES,
  DB_ENGINES,
};
