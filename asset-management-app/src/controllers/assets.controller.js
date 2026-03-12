const assetService = require('../services/asset.service');
const { getEffectiveLocationIds } = require('../middleware/locationFilter');

async function list(req, res, next) {
  try {
    const locationIds = getEffectiveLocationIds(req.user);
    const result = await assetService.listAssets(req.query, locationIds);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const asset = await assetService.getAsset(parseInt(req.params.id));
    res.json({ success: true, data: asset });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const asset = await assetService.createAsset(req.body, req.user?.id);
    res.status(201).json({ success: true, data: asset, message: `${req.body.quantity} x ${req.body.name} added to inventory!` });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const asset = await assetService.updateAsset(parseInt(req.params.id), req.body);
    res.json({ success: true, data: asset, message: 'Asset updated successfully' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await assetService.deleteAsset(parseInt(req.params.id));
    res.json({ success: true, message: 'Asset deleted' });
  } catch (err) { next(err); }
}

async function lowStock(req, res, next) {
  try {
    const assets = await assetService.getLowStockAssets();
    res.json({ success: true, data: assets });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, lowStock };
