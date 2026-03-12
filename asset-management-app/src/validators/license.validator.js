const { body, param, query } = require('express-validator');

const createLicense = [
  body('name').trim().notEmpty().withMessage('License name is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('licenseKey').optional({ values: 'falsy' }).trim(),
  body('startDate').isISO8601().withMessage('Start date is required'),
  body('endDate').isISO8601().withMessage('End date is required'),
  body('vendor').optional({ values: 'falsy' }).trim(),
  body('endDate').custom((value, { req }) => {
    if (new Date(value) <= new Date(req.body.startDate)) {
      throw new Error('End date must be after start date');
    }
    return true;
  }),
];

const updateLicense = [
  param('id').isInt().withMessage('Invalid license ID'),
  body('name').optional().trim().notEmpty().withMessage('License name cannot be empty'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be >= 0'),
  body('licenseKey').optional({ values: 'falsy' }).trim(),
  body('startDate').optional().isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  body('vendor').optional({ values: 'falsy' }).trim(),
];

const getLicenses = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['active', 'expiring', 'expired']),
  query('search').optional().trim(),
  query('vendor').optional().trim(),
  query('sort').optional().isIn(['name', 'quantity', 'available', 'end_date', 'created_at']),
  query('order').optional().isIn(['asc', 'desc']),
];

module.exports = { createLicense, updateLicense, getLicenses };
