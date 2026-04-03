const { callProcMulti, query } = require('../utils/db');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { USER_COLS } = require('../utils/queries');

/**
 * Fetch location assignments for one or many users.
 */
async function _attachLocations(users) {
  if (!users || users.length === 0) return users;
  const ids = users.map(u => u.id);
  const rows = await query(
    'SELECT ul.user_id, l.id, l.name, l.code FROM asset_user_locations ul JOIN asset_locations l ON ul.location_id = l.id WHERE ul.user_id IN (?)',
    [ids]
  );
  const map = {};
  for (const r of rows) {
    if (!map[r.userId]) map[r.userId] = [];
    map[r.userId].push({ id: r.id, name: r.name, code: r.code });
  }
  for (const u of users) {
    u.locations = map[u.id] || [];
  }
  return users;
}

async function getUsers(queryParams) {
  const { page, limit } = parsePagination(queryParams);
  const search = queryParams.search || '';
  const role = queryParams.role || '';
  const sortField = queryParams.sort || 'created_at';
  const sortDir = queryParams.direction || queryParams.order || 'desc';

  const sets = await callProcMulti('SP_ASSET_USER_LIST', [
    search,
    role,
    sortField,
    sortDir,
    page,
    limit,
  ]);

  // sets[0] = user rows (without password_hash), sets[1] = [{ total }]
  let users = sets[0] || [];
  const total = sets[1] && sets[1][0] ? sets[1][0].total : 0;

  // Attach locations to each user
  await _attachLocations(users);

  return { data: users, meta: buildPaginationMeta(page, limit, total) };
}

async function getUserById(id) {
  const rows = await query(`SELECT ${USER_COLS} FROM asset_users WHERE id = ?`, [id]);

  if (!rows || rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const user = rows[0];
  // Attach locations
  const locRows = await query(
    'SELECT l.id, l.name, l.code FROM asset_user_locations ul JOIN asset_locations l ON ul.location_id = l.id WHERE ul.user_id = ?',
    [id]
  );
  user.locations = locRows;
  return user;
}

async function updateUser(id, data) {
  // Verify user exists first (throws 404 if not)
  await getUserById(id);

  const rows = await callProcMulti('SP_ASSET_USER_UPDATE', [
    id,
    data.fullName !== undefined ? data.fullName : null,
    data.employeeId !== undefined ? data.employeeId : null,
    data.email !== undefined ? (data.email || null) : null,
    data.role !== undefined ? data.role : null,
    data.isActive !== undefined ? data.isActive : null,
  ]);

  // Update user locations if provided
  if (data.locationIds !== undefined) {
    await query('DELETE FROM asset_user_locations WHERE user_id = ?', [id]);
    if (data.locationIds && data.locationIds.length > 0) {
      const values = data.locationIds.map(lid => [id, lid]);
      await query('INSERT INTO asset_user_locations (user_id, location_id) VALUES ?', [values]);
    }
  }

  // SP returns the updated user; fall back to fresh fetch
  const result = rows[0] || [];
  let user = result.length > 0 ? result[0] : await getUserById(id);

  // Attach locations
  await _attachLocations([user]);
  return user;
}

async function deactivateUser(id) {
  // Verify user exists first (throws 404 if not)
  await getUserById(id);

  await query('UPDATE asset_users SET is_active = 0 WHERE id = ?', [id]);

  return getUserById(id);
}

async function resetPassword() {
  const err = new Error('Password is managed by the company intranet. Please contact IT to reset passwords.');
  err.statusCode = 400;
  throw err;
}

module.exports = { getUsers, getUserById, updateUser, deactivateUser, resetPassword };
