const { body, param, query } = require('express-validator');
const { ASSET_CATEGORIES } = require('../config/constants');

const createAsset = [
  body('category').isIn(ASSET_CATEGORIES).withMessage('Invalid asset category'),
  body('name').trim().notEmpty().withMessage('Asset name is required'),
  body('serialNo').optional({ values: 'falsy' }).trim(),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('vendor').optional({ values: 'falsy' }).trim(),
  body('purchaseDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid purchase date'),
  body('warrantyEnd').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid warranty date'),
  body('location').optional({ values: 'falsy' }).trim(),
  body('locationId').isInt({ min: 1 }).withMessage('Location is required'),
  body('poNumber').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('PO Number cannot exceed 100 characters'),
  body('notes').optional({ values: 'falsy' }).trim(),
];

const updateAsset = [
  param('id').isInt().withMessage('Invalid asset ID'),
  body('category').optional().isIn(ASSET_CATEGORIES).withMessage('Invalid asset category'),
  body('name').optional().trim().notEmpty().withMessage('Asset name cannot be empty'),
  body('serialNo').optional({ values: 'falsy' }).trim(),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be >= 0'),
  body('vendor').optional({ values: 'falsy' }).trim(),
  body('purchaseDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid purchase date'),
  body('warrantyEnd').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid warranty date'),
  body('location').optional({ values: 'falsy' }).trim(),
  body('locationId').optional().isInt({ min: 1 }).withMessage('Invalid location'),
  body('poNumber').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('PO Number cannot exceed 100 characters'),
  body('notes').optional({ values: 'falsy' }).trim(),
];

const getAssets = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('category').optional().custom((value) => {
    const cats = value.split(',');
    if (!cats.every(c => ASSET_CATEGORIES.includes(c.trim()))) {
      throw new Error('Invalid asset category');
    }
    return true;
  }),
  query('search').optional().trim(),
  query('stock_status').optional().isIn(['in_stock', 'low_stock', 'out_of_stock']),
  query('sort').optional().isIn(['name', 'category', 'quantity', 'available', 'price', 'created_at']),
  query('order').optional().isIn(['asc', 'desc']),
];

module.exports = { createAsset, updateAsset, getAssets };
