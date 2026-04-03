const { query } = require('../utils/db');
const transporter = require('../config/email');
const logger = require('../utils/logger');

const FROM_NAME = process.env.EMAIL_FROM_NAME || 'BAL Infra ManageEngine';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'it.helpdesk@balasorealloys.com';

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

/**
 * Send an email and log the result to the EmailLog table.
 *
 * @param {Object} opts
 * @param {string|string[]} opts.to       - Recipient(s)
 * @param {string}          opts.subject   - Email subject
 * @param {string}          opts.html      - HTML body
 * @param {string}          [opts.template] - Template identifier for logging
 * @param {string}          [opts.entityType] - Related entity type
 * @param {number}          [opts.entityId]   - Related entity id
 */
async function sendEmail({ to, subject, html, template, entityType, entityId }) {
  const toAddress = Array.isArray(to) ? to.join(', ') : to;

  // Dev mode: transporter is null when SMTP_HOST is not configured
  if (!transporter) {
    logger.info(`[Email-Dev] Would send "${subject}" to ${toAddress}`);
    await query(
      'INSERT INTO asset_email_log (to_email, subject, template, status, error, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [toAddress, subject, template || null, 'skipped', null, entityType || null, entityId || null]
    );
    return { status: 'skipped' };
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to: toAddress,
      subject,
      html,
    });

    await query(
      'INSERT INTO asset_email_log (to_email, subject, template, status, error, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [toAddress, subject, template || null, 'sent', null, entityType || null, entityId || null]
    );

    logger.info(`[Email] Sent "${subject}" to ${toAddress}`);
    return { status: 'sent' };
  } catch (err) {
    logger.error(`[Email] Failed to send "${subject}" to ${toAddress}:`, err.message);

    await query(
      'INSERT INTO asset_email_log (to_email, subject, template, status, error, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [toAddress, subject, template || null, 'failed', err.message, entityType || null, entityId || null]
    );

    return { status: 'failed', error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Shared HTML helpers
// ---------------------------------------------------------------------------

function baseLayout(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a56db;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">${FROM_NAME}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                This is an automated message from ${FROM_NAME}. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Expiry reminder (License & Service — 60/45/30/15 days before expiry)
// ---------------------------------------------------------------------------

/**
 * Send a reminder about an expiring license or service.
 *
 * @param {Object} opts
 * @param {string}   opts.name        - Item name
 * @param {string}   opts.type        - 'license' or 'service'
 * @param {Date}     opts.endDate     - Expiry date
 * @param {number}   opts.daysLeft    - Days remaining
 * @param {string[]} opts.adminEmails - Admin email list
 * @param {number}   [opts.entityId]  - Related entity id
 */
async function sendExpiryReminder({ name, type, endDate, daysLeft, adminEmails, entityId }) {
  if (!adminEmails || adminEmails.length === 0) return;

  const urgencyColor = daysLeft <= 15 ? '#dc2626' : daysLeft <= 30 ? '#f59e0b' : '#2563eb';
  const urgencyLabel = daysLeft <= 15 ? 'URGENT' : daysLeft <= 30 ? 'WARNING' : 'NOTICE';
  const typeLabel = type === 'license' ? 'License' : 'Service';

  const body = `
    <div style="background-color:${urgencyColor};color:#ffffff;padding:12px 16px;border-radius:6px;margin-bottom:24px;">
      <strong style="font-size:14px;">${urgencyLabel}: ${typeLabel} Expiring in ${daysLeft} Days</strong>
    </div>

    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">Expiry Reminder</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      The following ${typeLabel.toLowerCase()} is approaching its expiration date and may require renewal.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:6px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;width:140px;">${typeLabel} Name</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${name}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;">Type</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;">${typeLabel}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;">Expiry Date</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;">${formatDate(endDate)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;">Days Remaining</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;color:${urgencyColor};">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</td>
      </tr>
    </table>

    <p style="margin:0;color:#6b7280;font-size:13px;">
      Please take action to renew or replace this ${typeLabel.toLowerCase()} before it expires.
    </p>`;

  const html = baseLayout('Expiry Reminder', body);

  return sendEmail({
    to: adminEmails,
    subject: `[${urgencyLabel}] ${typeLabel} Expiring: ${name} - ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`,
    html,
    template: 'expiry_reminder',
    entityType: type,
    entityId: entityId || null,
  });
}

module.exports = {
  sendEmail,
  sendExpiryReminder,
};
