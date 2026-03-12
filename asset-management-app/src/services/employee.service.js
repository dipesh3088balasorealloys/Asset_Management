const { getExternalPool } = require('../config/externalDatabase');
const logger = require('../utils/logger');

async function lookupEmployee(empId) {
  const pool = getExternalPool();

  if (!pool) {
    const err = new Error('External employee database is not configured');
    err.statusCode = 503;
    throw err;
  }

  try {
    const [rows] = await pool.query(
      'SELECT EMPID, EMPNAME, EMPDEPT, EMAILID, LOCATION, EMPDESG FROM sap_employee_details WHERE EMPID = ? LIMIT 1',
      [empId]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      empId:       row.EMPID      || '',
      empName:     row.EMPNAME    || '',
      department:  row.EMPDEPT    || '',
      email:       row.EMAILID    || '',
      location:    row.LOCATION   || '',
      designation: row.EMPDESG    || '',
    };
  } catch (err) {
    logger.error('External employee lookup failed:', { empId, message: err.message });
    const error = new Error('Employee lookup service unavailable');
    error.statusCode = 503;
    throw error;
  }
}

module.exports = { lookupEmployee };
