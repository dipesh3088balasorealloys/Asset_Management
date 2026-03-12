const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'asset_mgmt',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  multipleStatements: false,
  timezone: '+00:00',
});

module.exports = pool;
