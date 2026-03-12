const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify connection on startup
  transporter.verify()
    .then(() => logger.info('SMTP connection verified successfully'))
    .catch((err) => logger.warn('SMTP connection verification failed:', err.message));
} else {
  logger.info('SMTP_HOST not configured - email sending disabled (dev mode)');
}

module.exports = transporter;
