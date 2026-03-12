const router = require('express').Router();
const locationService = require('../services/location.service');

// GET /api/locations — list all active locations (any authenticated user)
router.get('/', async (req, res, next) => {
  try {
    const locations = await locationService.listLocations();
    res.json({ success: true, data: locations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
