const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { callProc, query } = require('../utils/db');
const { getExternalPool } = require('../config/externalDatabase');
const { USER_COLS } = require('../utils/queries');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Hash a password with SHA1 (uppercase hex) to match balcorpdb.intranet_user_login format.
 */
function _sha1(password) {
  return crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
}

/**
 * Register a new user in asset_users.
 * Password is no longer stored locally — authentication happens via company intranet.
 */
async function register(data) {
  // Use a placeholder since passwords are managed by the company intranet
  const placeholderHash = 'SSO_MANAGED';

  const rows = await callProc('SP_ASSET_USER_CREATE', [
    data.employeeId,
    data.email || null,
    placeholderHash,
    data.fullName,
    data.role || 'viewer',
  ]);

  const user = rows[0];

  // Assign locations if provided (array of location IDs)
  if (data.locationIds && data.locationIds.length > 0 && user && user.id) {
    const values = data.locationIds.map(lid => [user.id, lid]);
    await query('INSERT INTO asset_user_locations (user_id, location_id) VALUES ?', [values]);
  }

  return user;
}

/**
 * Two-phase login:
 *   Phase 1 — Authenticate against balcorpdb.intranet_user_login (SHA1)
 *   Phase 2 — Authorize against asset_mgmt.asset_users (role, isActive, locations)
 *   Phase 3 — Issue JWT
 */
async function login(employeeId, password) {
  // ── Phase 1: Authenticate via company intranet DB ──────────────────
  const extPool = getExternalPool();
  if (!extPool) {
    const err = new Error('Company authentication service is not configured. Contact IT.');
    err.statusCode = 503;
    throw err;
  }

  const hashedPwd = _sha1(password);

  let intranetRows;
  try {
    [intranetRows] = await extPool.query(
      'SELECT EMPID FROM intranet_user_login WHERE EMPID = ? AND USER_PWD = ? AND STATUS = ?',
      [employeeId, hashedPwd, 'A']
    );
  } catch (dbErr) {
    const err = new Error('Company authentication service is temporarily unavailable. Please try again later.');
    err.statusCode = 503;
    throw err;
  }

  if (!intranetRows || intranetRows.length === 0) {
    const err = new Error('Invalid Employee ID or password');
    err.statusCode = 401;
    throw err;
  }

  // ── Phase 2: Authorize via local asset_users table ─────────────────
  const rows = await query(
    `SELECT ${USER_COLS} FROM asset_users WHERE employee_id = ?`,
    [employeeId]
  );

  if (!rows || rows.length === 0) {
    const err = new Error('You are not registered in Asset Management. Please contact your administrator.');
    err.statusCode = 401;
    throw err;
  }

  const user = rows[0];

  if (!user.isActive) {
    const err = new Error('Account is deactivated');
    err.statusCode = 401;
    throw err;
  }

  // ── Phase 3: Issue JWT & update last login ─────────────────────────
  await query('UPDATE asset_users SET last_login = NOW() WHERE id = ?', [user.id]);

  const token = jwt.sign(
    { userId: user.id, employeeId: user.employeeId, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  // Fetch user's permitted locations
  let locations = [];
  if (user.role !== 'admin') {
    locations = await query(
      'SELECT l.id, l.name, l.code FROM asset_user_locations ul JOIN asset_locations l ON ul.location_id = l.id WHERE ul.user_id = ?',
      [user.id]
    );
  }

  user.locations = locations;

  return { user, token };
}

async function getProfile(userId) {
  const rows = await query(`SELECT ${USER_COLS} FROM asset_users WHERE id = ?`, [userId]);

  if (!rows || rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
}

async function changePassword() {
  const err = new Error('Password is managed by the company intranet. Please contact IT to change your password.');
  err.statusCode = 400;
  throw err;
}

module.exports = { register, login, getProfile, changePassword };
