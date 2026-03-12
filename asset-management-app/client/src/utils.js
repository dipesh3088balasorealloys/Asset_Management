export function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCurrency(a) {
  return '₹' + parseFloat(a || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getStockStatus(available, total) {
  if (available === 0) return { className: 'status-out', text: 'In Use', barClass: 'low' };
  if (available <= 5) return { className: 'status-low', text: 'Low Stock', barClass: 'medium' };
  return { className: 'status-instock', text: 'In Stock', barClass: 'high' };
}

export function getLicenseStatus(endDate) {
  const diff = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { className: 'status-expired', text: 'Expired' };
  if (diff <= 30) return { className: 'status-expiring', text: 'Expiring Soon' };
  return { className: 'status-active', text: 'Active' };
}

export function getServiceDisplayStatus(service) {
  if (service.computedStatus) {
    const map = {
      'Cancelled': 'status-cancelled',
      'Pending': 'status-pending',
      'Expired': 'status-expired',
      'Renewal Due': 'status-expiring',
      'Active': 'status-active',
    };
    return { className: map[service.computedStatus] || 'status-active', text: service.computedStatus };
  }
  return { className: 'status-active', text: 'Active' };
}

export function getServiceTypeBadge(type) {
  const map = {
    SaaS: 'type-saas', Cloud: 'type-cloud', Maintenance: 'type-maintenance',
    Support: 'type-support', Consulting: 'type-consulting', Hosting: 'type-hosting',
    Security: 'type-security', Other: 'type-other',
  };
  return map[type] || 'type-other';
}

export function getCategoryLabel(category) {
  const labels = {
    AccessPoint: 'Access Point',
    DockingStation: 'Docking Station',
    OneTime: 'One-time',
  };
  return labels[category] || category;
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function futureDate(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}
