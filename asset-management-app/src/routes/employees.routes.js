const router = require('express').Router();
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const employeeService = require('../services/employee.service');

router.get(
  '/lookup/:empId',
  [
    param('empId')
      .trim()
      .notEmpty()
      .withMessage('Employee ID is required')
      .isLength({ max: 10 })
      .withMessage('Employee ID cannot exceed 10 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await employeeService.lookupEmployee(req.params.empId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Employee "${req.params.empId}" not found` },
        });
      }

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
