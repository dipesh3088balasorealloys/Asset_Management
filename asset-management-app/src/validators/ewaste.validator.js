const { body, param, query } = require('express-validator');

const createEwaste = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('billingNumber').optional({ values: 'falsy' }).trim(),
  body('assetNames').custom((val) => {
    if (!val) return true;
    // Accept JSON string or array
    const arr = typeof val === 'string' ? JSON.parse(val) : val;
    if (!Array.isArray(arr)) throw new Error('Asset names must be an array');
    return true;
  }),
  body('disposalDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid disposal date'),
  body('disposedTo').optional({ values: 'falsy' }).trim(),
  body('disposalCost').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Disposal cost must be >= 0'),
  body('reason').optional({ values: 'falsy' }).trim(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

const updateEwaste = [
  param('id').isInt().withMessage('Invalid e-waste ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('billingNumber').optional({ values: 'falsy' }).trim(),
  body('assetNames').optional().custom((val) => {
    if (!val) return true;
    const arr = typeof val === 'string' ? JSON.parse(val) : val;
    if (!Array.isArray(arr)) throw new Error('Asset names must be an array');
    return true;
  }),
  body('disposalDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid disposal date'),
  body('disposedTo').optional({ values: 'falsy' }).trim(),
  body('disposalCost').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Disposal cost must be >= 0'),
  body('reason').optional({ values: 'falsy' }).trim(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

const getEwaste = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('search').optional().trim(),
  query('sort').optional().isIn(['title', 'billing_number', 'disposal_date', 'disposal_cost', 'disposed_to', 'created_at']),
  query('order').optional().isIn(['asc', 'desc']),
];

module.exports = { createEwaste, updateEwaste, getEwaste };
