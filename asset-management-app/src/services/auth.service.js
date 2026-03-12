const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { callProc, query } = require('../utils/db');
const { USER_COLS, USER_COLS_WITH_PWD } = require('../utils/queries');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Strip passwordHash from a user object before returning to callers.
 */
function _stripPassword(user) {
  if (!user) return user;
  const { passwordHash, ...safe } = user;
  return safe;
}

async function register(data) {
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const rows = await callProc('user_create', [
    data.employeeId,
    data.email || null,
    passwordHash,
    data.fullName,
    data.role || 'viewer',
  ]);

  const user = rows[0];

  // Assign locations if provided (array of location IDs)
  if (data.locationIds && data.locationIds.length > 0 && user && user.id) {
    const values = data.locationIds.map(lid => [user.id, lid]);
    await query('INSERT INTO user_locations (user_id, location_id) VALUES ?', [values]);
  }

  return user;
}

async function login(employeeId, password) {
  // Need user WITH passwordHash so we can verify
  const rows = await query(
    `SELECT ${USER_COLS_WITH_PWD} FROM users WHERE employee_id = ?`,
    [employeeId]
  );

  if (!rows || rows.length === 0) {
    const err = new Error('Invalid Employee ID or password');
    err.statusCode = 401;
    throw err;
  }

  const user = rows[0];

  if (!user.isActive) {
    const err = new Error('Account is deactivated');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error('Invalid Employee ID or password');
    err.statusCode = 401;
    throw err;
  }

  // Update lastLogin timestamp
  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

  const token = jwt.sign(
    { userId: user.id, employeeId: user.employeeId, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  // Fetch user's permitted locations
  let locations = [];
  if (user.role !== 'admin') {
    locations = await query(
      'SELECT l.id, l.name, l.code FROM user_locations ul JOIN locations l ON ul.location_id = l.id WHERE ul.user_id = ?',
      [user.id]
    );
  }

  const safeUser = _stripPassword(user);
  safeUser.locations = locations;

  return { user: safeUser, token };
}

async function getProfile(userId) {
  const rows = await query(`SELECT ${USER_COLS} FROM users WHERE id = ?`, [userId]);

  if (!rows || rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return _stripPassword(rows[0]);
}

async function changePassword(userId, currentPassword, newPassword) {
  // Need user WITH password hash to verify current password
  const rows = await query('SELECT * FROM users WHERE id = ?', [userId]);

  if (!rows || rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const user = rows[0];

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
}

module.exports = { register, login, getProfile, changePassword };
