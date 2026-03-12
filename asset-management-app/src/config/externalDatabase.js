const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let extPool = null;

function getExternalPool() {
  if (!extPool) {
    const host = process.env.EXT_DB_HOST;
    const user = process.env.EXT_DB_USER;

    if (!host || !user) {
      logger.warn('External employee DB not configured (EXT_DB_HOST / EXT_DB_USER missing). Employee lookup disabled.');
      return null;
    }

    extPool = mysql.createPool({
      host,
      port: parseInt(process.env.EXT_DB_PORT, 10) || 3306,
      user,
      password: process.env.EXT_DB_PASS,
      database: process.env.EXT_DB_NAME,
      waitForConnections: true,
      connectionLimit: 3,
      connectTimeout: 5000,
      dateStrings: true,
      multipleStatements: false,
    });

    logger.info(`External employee DB pool created → ${host}:${process.env.EXT_DB_PORT || 3306}/${process.env.EXT_DB_NAME}`);
  }
  return extPool;
}

module.exports = { getExternalPool };
