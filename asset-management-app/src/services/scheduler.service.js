const cron = require('node-cron');
const { query } = require('../utils/db');
const logger = require('../utils/logger');
const { sendExpiryReminder } = require('./email.service');

// ---------------------------------------------------------------------------
// Helper: get all admin user emails
// ---------------------------------------------------------------------------

async function getAdminEmails() {
  const admins = await query("SELECT email FROM asset_users WHERE role = 'admin' AND is_active = 1");
  return admins.map((a) => a.email);
}

// ---------------------------------------------------------------------------
// Job: Check for expiring licenses and services (30 days before expiry)
// ---------------------------------------------------------------------------

async function checkExpiringItems() {
  logger.info('[Scheduler] Running expiry check job');

  try {
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      logger.warn('[Scheduler] No admin users found - skipping expiry notifications');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = 60;

    // Fetch licenses expiring within the next 60 days
    const expiringLicenses = await query(
      'SELECT * FROM asset_licenses WHERE is_deleted = 0 AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY) ORDER BY end_date ASC',
      [days]
    );

    // Fetch services expiring within the next 60 days
    const expiringServices = await query(
      "SELECT * FROM asset_services WHERE is_deleted = 0 AND status = 'Active' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY) ORDER BY end_date ASC",
      [days]
    );

    let notificationCount = 0;

    // Send notifications for each expiring license
    for (const license of expiringLicenses) {
      const endDate = new Date(license.endDate);
      endDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      // Send at 60, 45, 30, and 15 days before expiry
      if (daysLeft === 60 || daysLeft === 45 || daysLeft === 30 || daysLeft === 15) {
        await sendExpiryReminder({
          name: license.name,
          type: 'license',
          endDate: license.endDate,
          daysLeft,
          adminEmails,
          entityId: license.id,
        });
        notificationCount++;
      }
    }

    // Send notifications for each expiring service
    for (const service of expiringServices) {
      const endDate = new Date(service.endDate);
      endDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      if (daysLeft === 60 || daysLeft === 45 || daysLeft === 30 || daysLeft === 15) {
        await sendExpiryReminder({
          name: service.name,
          type: 'service',
          endDate: service.endDate,
          daysLeft,
          adminEmails,
          entityId: service.id,
        });
        notificationCount++;
      }
    }

    logger.info(`[Scheduler] Expiry check complete - ${notificationCount} notification(s) sent`);
  } catch (err) {
    logger.error('[Scheduler] Expiry check job failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Start scheduled jobs
// ---------------------------------------------------------------------------

function startScheduler() {
  // Daily at 8:00 AM - check for expiring licenses and services
  cron.schedule('0 8 * * *', () => {
    checkExpiringItems();
  }, { timezone: 'UTC' });
  logger.info('[Scheduler] Registered job: expiry check (daily at 08:00 UTC)');

  logger.info('[Scheduler] All scheduled jobs started');
}

module.exports = { startScheduler, checkExpiringItems };
