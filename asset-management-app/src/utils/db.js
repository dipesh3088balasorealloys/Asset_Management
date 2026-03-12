const pool = require('../config/database');

// -------------------------------------------------------
// Snake_case → camelCase conversion
// -------------------------------------------------------
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertRow(row) {
  if (!row || typeof row !== 'object') return row;
  if (Array.isArray(row)) return row.map(convertRow);
  const out = {};
  for (const [key, val] of Object.entries(row)) {
    out[snakeToCamel(key)] = val;
  }
  return out;
}

// -------------------------------------------------------
// Call a stored procedure — returns first result set (rows)
// mysql2 CALL results: [ [rows1], [rows2], ..., OkPacket ]
// We want the first array result set.
// -------------------------------------------------------
async function callProc(name, params = []) {
  const placeholders = params.map(() => '?').join(', ');
  const sql = `CALL ${name}(${placeholders})`;
  const [results] = await pool.query(sql, params);

  // results is an array. For SPs with SELECT, it looks like:
  //   [ [{row1}, {row2}], OkPacket ]    — single SELECT
  //   [ [{rows1}], [{rows2}], OkPacket ] — multiple SELECTs
  // For SPs without SELECT (INSERT only), it might be:
  //   OkPacket  or  [ OkPacket ]

  // Find the first array element (first result set)
  if (Array.isArray(results)) {
    // Check if results[0] is an array (rows of first SELECT)
    if (Array.isArray(results[0])) {
      return results[0].map(convertRow);
    }
    // results itself might be the rows array (single SELECT without nesting)
    // Check if first element looks like a row object
    if (results.length > 0 && results[0] && typeof results[0] === 'object' && !results[0].constructor?.name?.includes('Ok')) {
      return results.map(convertRow);
    }
  }

  // No result set found — return empty array
  return [];
}

// -------------------------------------------------------
// Call SP that returns multiple result sets
// e.g. sp_list_assets returns rows + count
// -------------------------------------------------------
async function callProcMulti(name, params = []) {
  const placeholders = params.map(() => '?').join(', ');
  const sql = `CALL ${name}(${placeholders})`;
  const [results] = await pool.query(sql, params);
  const sets = [];

  if (Array.isArray(results)) {
    for (const rs of results) {
      if (Array.isArray(rs)) {
        sets.push(rs.map(convertRow));
      }
    }
  }

  return sets;
}

// -------------------------------------------------------
// Raw query helper (for edge cases)
// -------------------------------------------------------
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  if (Array.isArray(rows)) return rows.map(convertRow);
  return rows;
}

// -------------------------------------------------------
// Get a connection from pool (for manual transactions)
// -------------------------------------------------------
async function getConnection() {
  return pool.getConnection();
}

module.exports = { callProc, callProcMulti, query, getConnection, convertRow };
