require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'asset_mgmt',
    dateStrings: true,
  });

  console.log('Seeding database...');

  // Seed admin user
  const adminEmail = 'admin@assetmanager.com';
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [adminEmail, passwordHash, 'System Administrator', 'admin']
    );
    console.log('Created admin user: admin@assetmanager.com / admin123');
  } else {
    console.log('Admin user already exists');
  }

  // Seed departments
  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'Engineering', 'Design'];
  for (const name of departments) {
    await pool.query('INSERT IGNORE INTO departments (name) VALUES (?)', [name]);
  }
  console.log(`Seeded ${departments.length} departments`);

  // Seed sample assets
  const today = new Date().toISOString().split('T')[0];
  const warrantyEnd = new Date();
  warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 3);
  const warrantyStr = warrantyEnd.toISOString().split('T')[0];

  const assets = [
    ['Laptop', 'Dell Latitude 5520', 25, 1200, 'Dell Technologies', 'IT Storeroom A'],
    ['Laptop', 'MacBook Pro 14"', 10, 2400, 'Apple', 'IT Storeroom A'],
    ['Monitor', 'Dell U2722D 27"', 30, 450, 'Dell Technologies', 'IT Storeroom B'],
    ['Keyboard', 'Logitech MX Keys', 40, 120, 'Logitech', 'IT Storeroom C'],
    ['Mouse', 'Logitech MX Master 3', 40, 100, 'Logitech', 'IT Storeroom C'],
    ['Headset', 'Jabra Evolve2 75', 15, 300, 'Jabra', 'IT Storeroom C'],
    ['DockingStation', 'Dell WD19S', 20, 250, 'Dell Technologies', 'IT Storeroom B'],
    ['Webcam', 'Logitech C920', 10, 80, 'Logitech', 'IT Storeroom C'],
  ];

  // Check if assets already exist
  const [existingAssets] = await pool.query('SELECT COUNT(*) as cnt FROM assets WHERE is_deleted = 0');
  if (existingAssets[0].cnt === 0) {
    for (const [category, name, quantity, price, vendor, location] of assets) {
      await pool.query(
        `INSERT INTO assets (category, name, quantity, assigned, available, price, vendor, purchase_date, warranty_end, location)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
        [category, name, quantity, quantity, price, vendor, today, warrantyStr, location]
      );
    }
    console.log(`Seeded ${assets.length} assets`);
  } else {
    console.log('Assets already exist, skipping');
  }

  // Seed sample licenses
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const oneYearStr = oneYearLater.toISOString().split('T')[0];

  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 25);
  const thirtyDaysStr = thirtyDaysLater.toISOString().split('T')[0];

  const licenses = [
    ['Microsoft Office 365', 50, 'Microsoft', today, oneYearStr],
    ['Adobe Creative Cloud', 15, 'Adobe', today, oneYearStr],
    ['Slack Business+', 60, 'Slack', today, oneYearStr],
    ['Zoom Pro', 30, 'Zoom', today, thirtyDaysStr],
    ['GitHub Enterprise', 40, 'GitHub', today, oneYearStr],
  ];

  const [existingLicenses] = await pool.query('SELECT COUNT(*) as cnt FROM licenses WHERE is_deleted = 0');
  if (existingLicenses[0].cnt === 0) {
    for (const [name, quantity, vendor, startDate, endDate] of licenses) {
      await pool.query(
        `INSERT INTO licenses (name, quantity, used, available, start_date, end_date, vendor)
         VALUES (?, ?, 0, ?, ?, ?, ?)`,
        [name, quantity, quantity, startDate, endDate, vendor]
      );
    }
    console.log(`Seeded ${licenses.length} licenses`);
  } else {
    console.log('Licenses already exist, skipping');
  }

  // Seed sample services
  const services = [
    ['SaaS', 'AWS Cloud Services', 'Amazon Web Services', 2500, 'Active', 'Monthly', today, oneYearStr, 'AWS-12345', null],
    ['SaaS', 'Google Workspace', 'Google', 1200, 'Active', 'Monthly', today, oneYearStr, null, null],
    ['Security', 'CrowdStrike Endpoint', 'CrowdStrike', 18000, 'Active', 'Yearly', today, oneYearStr, null, null],
    ['Maintenance', 'Dell ProSupport', 'Dell Technologies', 5000, 'Active', 'Yearly', today, thirtyDaysStr, null, null],
    ['Cloud', 'Azure DevOps', 'Microsoft', 800, 'Active', 'Monthly', today, oneYearStr, null, null],
  ];

  const [existingServices] = await pool.query('SELECT COUNT(*) as cnt FROM services WHERE is_deleted = 0');
  if (existingServices[0].cnt === 0) {
    for (const [type, name, provider, cost, status, billingCycle, startDate, endDate, accountId, contactInfo] of services) {
      await pool.query(
        `INSERT INTO services (type, name, provider, cost, status, billing_cycle, start_date, end_date, account_id, contact_info)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, name, provider, cost, status, billingCycle, startDate, endDate, accountId, contactInfo]
      );
    }
    console.log(`Seeded ${services.length} services`);
  } else {
    console.log('Services already exist, skipping');
  }

  console.log('Database seeding completed!');
  await pool.end();
}

main().catch((e) => {
  console.error('Seeding error:', e);
  process.exit(1);
});
