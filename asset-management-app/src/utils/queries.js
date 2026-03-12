const { query } = require('./db');

// -------------------------------------------------------
// User column lists (exclude password_hash by default)
// -------------------------------------------------------
const USER_COLS = 'id, employee_id, email, full_name, role, is_active, last_login, created_at, updated_at';
const USER_COLS_WITH_PWD = 'id, employee_id, email, password_hash, full_name, role, is_active, last_login, created_at, updated_at';

// -------------------------------------------------------
// Reusable query helpers
// -------------------------------------------------------

async function getById(table, id, softDelete = true) {
  const where = softDelete ? 'id = ? AND is_deleted = 0' : 'id = ?';
  return query(`SELECT * FROM \`${table}\` WHERE ${where}`, [id]);
}

async function softDelete(table, id) {
  const result = await query(
    `UPDATE \`${table}\` SET is_deleted = 1 WHERE id = ? AND is_deleted = 0`,
    [id]
  );
  if (result.affectedRows === 0) {
    const err = new Error('Record not found');
    err.statusCode = 404;
    throw err;
  }
  return result;
}

module.exports = { USER_COLS, USER_COLS_WITH_PWD, getById, softDelete };
