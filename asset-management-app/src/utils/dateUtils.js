/**
 * Calculate the number of days between a date and today.
 * Positive = date is in the future, negative = date is in the past.
 */
function daysDiff(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Get license status based on end date.
 * Ports prototype lines 399-404.
 */
function getLicenseStatus(endDate) {
  const diff = daysDiff(endDate);
  if (diff < 0) return { status: 'Expired', cssClass: 'status-expired' };
  if (diff <= 30) return { status: 'Expiring Soon', cssClass: 'status-expiring' };
  return { status: 'Active', cssClass: 'status-active' };
}

/**
 * Get service status based on service data.
 * Ports prototype lines 444-451.
 */
function getServiceStatus(service) {
  if (service.status === 'Cancelled') return { status: 'Cancelled', cssClass: 'status-cancelled' };
  if (service.status === 'Pending') return { status: 'Pending', cssClass: 'status-pending' };
  const diff = daysDiff(service.endDate);
  if (diff < 0) return { status: 'Expired', cssClass: 'status-expired' };
  if (diff <= 30) return { status: 'Renewal Due', cssClass: 'status-expiring' };
  return { status: 'Active', cssClass: 'status-active' };
}

/**
 * Get stock status for an asset.
 * Ports prototype lines 353-357.
 */
function getStockStatus(available, total) {
  if (available === 0) return { status: 'Out of Stock', cssClass: 'status-out', barClass: 'low' };
  if (available <= 5) return { status: 'Low Stock', cssClass: 'status-low', barClass: 'medium' };
  return { status: 'In Stock', cssClass: 'status-instock', barClass: 'high' };
}

/**
 * Calculate monthly cost from service data.
 * Ports prototype lines 472-475.
 */
function getMonthlyServiceCost(service) {
  if (service.status === 'Cancelled') return 0;
  const cost = parseFloat(service.cost) || 0;
  switch (service.billingCycle) {
    case 'Monthly': return cost;
    case 'Quarterly': return cost / 3;
    case 'Yearly': return cost / 12;
    default: return 0; // OneTime
  }
}

/**
 * Calculate yearly cost from service data.
 * Ports prototype lines 477-480.
 */
function getYearlyServiceCost(service) {
  if (service.status === 'Cancelled') return 0;
  const cost = parseFloat(service.cost) || 0;
  switch (service.billingCycle) {
    case 'Monthly': return cost * 12;
    case 'Quarterly': return cost * 4;
    case 'Yearly': return cost;
    case 'OneTime': return cost;
    default: return cost;
  }
}

module.exports = {
  daysDiff,
  getLicenseStatus,
  getServiceStatus,
  getStockStatus,
  getMonthlyServiceCost,
  getYearlyServiceCost,
};
