import { useState, useEffect } from 'react';
import { reportsApi } from '../services/api';
import { formatDate, formatCurrency, getCategoryLabel } from '../utils';

const CARD_CONFIG = [
  {
    key: 'totalAssets',
    label: 'Total Assets',
    color: 'blue',
    icon: 'M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z',
    breakdown: 'assetsByCategory',
  },
  {
    key: 'assignedAssets',
    label: 'Assets Assigned',
    color: 'purple',
    icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    breakdown: 'assignedByCategory',
  },
  {
    key: 'availableAssets',
    label: 'Assets Available',
    color: 'emerald',
    icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    breakdown: 'availableByCategory',
  },
  {
    key: 'totalLicenses',
    label: 'Total Licenses',
    color: 'green',
    icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    breakdown: 'licenseBreakdown',
  },
  {
    key: 'availableLicenses',
    label: 'Available Licenses',
    color: 'teal',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    breakdown: 'licenseAvailable',
  },
  {
    key: 'activeServices',
    label: 'Active Services',
    color: 'indigo',
    icon: 'M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
    breakdown: 'servicesByType',
  },
  {
    key: 'monthlyCost',
    label: 'Monthly Service Cost',
    color: 'pink',
    icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
    breakdown: 'costByType',
  },
  {
    key: 'renewalsDue',
    label: 'Renewals Due (30 days)',
    color: 'red',
    icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    breakdown: 'renewalsInfo',
  },
];

const BAR_COLORS = ['teal', 'blue', 'green', 'orange', 'purple', 'pink', 'red', 'indigo'];

export default function Dashboard({ showAlert }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState([]);
  const [serviceCostData, setServiceCostData] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [utilData, setUtilData] = useState([]);
  const [licenseData, setLicenseData] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, utilRes, costRes, licRes] = await Promise.all([
        reportsApi.dashboard(),
        reportsApi.assetUtilization().catch(() => ({ data: { breakdown: [] } })),
        reportsApi.serviceCosts().catch(() => ({ data: { breakdown: [] } })),
        reportsApi.licenseUtilization().catch(() => ({ data: { licenses: [] } })),
      ]);
      setData(dashRes.data);

      // Full utilization data (per category: total, assigned, available)
      // API returns { overall, breakdown: [...] } — values may be strings from SP
      const utilItems = (utilRes.data?.breakdown || []).map((item) => ({
        ...item,
        total: parseInt(item.total) || 0,
        assigned: parseInt(item.assigned) || 0,
        available: parseInt(item.available) || 0,
      }));
      setUtilData(utilItems);

      const categoryMap = {};
      utilItems.forEach((item) => {
        const cat = item.category || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || 0) + item.total;
      });
      const categories = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
      categories.sort((a, b) => b.value - a.value);
      setCategoryData(categories);

      // License data — API returns { total, used, available, utilization, licenses: [...] }
      setLicenseData(licRes.data?.licenses || []);

      // Service costs by type — API returns { totalMonthly, totalYearly, breakdown: [...] }
      const byType = costRes.data?.breakdown || [];
      const costs = byType.map((item) => ({
        name: item.type || 'Other',
        value: item.monthlyCost || 0,
        count: item.count || 0,
      }));
      costs.sort((a, b) => b.value - a.value);
      setServiceCostData(costs);
    } catch (err) {
      showAlert('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="empty-state">Unable to load dashboard data.</div>;
  }

  const { cards, recentAssignments, upcomingRenewals, lowStockAlerts } = data;

  const getCardValue = (key) => {
    const val = cards?.[key];
    if (key === 'monthlyCost') return formatCurrency(val);
    return val ?? 0;
  };

  const toggleCard = (key) => {
    setExpandedCard(expandedCard === key ? null : key);
  };

  // Build breakdown data for each card
  const getBreakdownContent = (breakdownType) => {
    switch (breakdownType) {
      case 'assetsByCategory': {
        // Total assets per category
        const items = utilData.map((r) => ({
          label: getCategoryLabel(r.category),
          value: r.total || 0,
        }));
        items.sort((a, b) => b.value - a.value);
        if (items.length === 0) return <div className="card-detail-empty">No asset data</div>;
        return (
          <div className="card-detail-list">
            {items.map((item) => (
              <div className="card-detail-row" key={item.label}>
                <span className="card-detail-label">{item.label}</span>
                <span className="card-detail-value">{item.value}</span>
              </div>
            ))}
          </div>
        );
      }
      case 'assignedByCategory': {
        // Assigned assets per category
        const items = utilData
          .filter((r) => r.assigned > 0)
          .map((r) => ({
            label: getCategoryLabel(r.category),
            value: r.assigned || 0,
          }));
        items.sort((a, b) => b.value - a.value);
        if (items.length === 0) return <div className="card-detail-empty">No assigned assets</div>;
        return (
          <div className="card-detail-list">
            {items.map((item) => (
              <div className="card-detail-row" key={item.label}>
                <span className="card-detail-label">{item.label}</span>
                <span className="card-detail-value">{item.value}</span>
              </div>
            ))}
          </div>
        );
      }
      case 'availableByCategory': {
        // Available assets per category
        const items = utilData
          .filter((r) => r.available > 0)
          .map((r) => ({
            label: getCategoryLabel(r.category),
            value: r.available || 0,
          }));
        items.sort((a, b) => b.value - a.value);
        if (items.length === 0) return <div className="card-detail-empty">No available assets</div>;
        return (
          <div className="card-detail-list">
            {items.map((item) => (
              <div className="card-detail-row" key={item.label}>
                <span className="card-detail-label">{item.label}</span>
                <span className="card-detail-value">{item.value}</span>
              </div>
            ))}
          </div>
        );
      }
      case 'licenseBreakdown': {
        // Total licenses
        if (licenseData.length === 0) return <div className="card-detail-empty">No licenses</div>;
        return (
          <div className="card-detail-list">
            {licenseData.map((lic) => (
              <div className="card-detail-row" key={lic.name || lic.id}>
                <span className="card-detail-label">{lic.name}</span>
                <span className="card-detail-value">{lic.total || lic.quantity || 0}</span>
              </div>
            ))}
          </div>
        );
      }
      case 'licenseAvailable': {
        // Available licenses
        if (licenseData.length === 0) return <div className="card-detail-empty">No licenses</div>;
        return (
          <div className="card-detail-list">
            {licenseData.map((lic) => (
              <div className="card-detail-row" key={lic.name || lic.id}>
                <span className="card-detail-label">{lic.name}</span>
                <span className="card-detail-value">{lic.available ?? 0}</span>
              </div>
            ))}
          </div>
        );
      }
      case 'servicesByType': {
        // Active services by type
        const items = serviceCostData.filter((s) => s.count > 0);
        if (items.length === 0) return <div className="card-detail-empty">No active services</div>;
        return (
          <div className="card-detail-list">
            {items.map((item) => (
              <div className="card-detail-row" key={item.name}>
                <span className="card-detail-label">{item.name}</span>
                <span className="card-detail-value">{item.count}</span>
              </div>
            ))}
          </div>
        );
      }
      case 'costByType': {
        // Monthly cost by service type
        if (serviceCostData.length === 0) return <div className="card-detail-empty">No service costs</div>;
        return (
          <div className="card-detail-list">
            {serviceCostData.map((item) => (
              <div className="card-detail-row" key={item.name}>
                <span className="card-detail-label">{item.name}</span>
                <span className="card-detail-value">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        );
      }
      case 'renewalsInfo': {
        // Upcoming renewals
        if (!upcomingRenewals || upcomingRenewals.length === 0)
          return <div className="card-detail-empty">No upcoming renewals</div>;
        return (
          <div className="card-detail-list">
            {upcomingRenewals.slice(0, 5).map((r, i) => (
              <div className="card-detail-row" key={i}>
                <span className="card-detail-label">{r.name}</span>
                <span className="card-detail-value" style={{ fontSize: '0.75rem' }}>{formatDate(r.date)}</span>
              </div>
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      {/* Metric Cards */}
      <div className="dashboard-cards">
        {CARD_CONFIG.map((card) => (
          <div
            className={`card card-clickable ${expandedCard === card.key ? 'card-expanded' : ''}`}
            key={card.key}
            onClick={() => toggleCard(card.key)}
          >
            <div className="card-header-row">
              <div className={`card-icon ${card.color}`}>
                <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                  <path d={card.icon} />
                </svg>
              </div>
              <span className="card-expand-icon">{expandedCard === card.key ? '▲' : '▼'}</span>
            </div>
            <h3 className={card.key === 'monthlyCost' ? 'card-small' : ''}>
              {getCardValue(card.key)}
            </h3>
            <p>{card.label}</p>
            {expandedCard === card.key && (
              <div className="card-detail" onClick={(e) => e.stopPropagation()}>
                {getBreakdownContent(card.breakdown)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Asset Distribution by Category */}
        <div className="chart-container">
          <h2 className="section-title">Asset Distribution by Category</h2>
          {categoryData.length > 0 ? (
            <div className="chart-bars">
              {categoryData.map((cat) => {
                const maxValue = categoryData[0].value || 1;
                return (
                  <div className="chart-row" key={cat.name}>
                    <div className="chart-label">{getCategoryLabel(cat.name)}</div>
                    <div className="chart-bar-wrapper">
                      <div
                        className="chart-bar teal"
                        style={{ width: `${(cat.value / maxValue) * 100}%` }}
                      >
                        <span className="chart-value">{cat.value}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No asset data available</div>
          )}
        </div>

        {/* Service Cost Breakdown by Type */}
        <div className="chart-container">
          <h2 className="section-title">Service Cost Breakdown by Type</h2>
          {serviceCostData.length > 0 ? (
            <div className="chart-bars">
              {serviceCostData.map((item, idx) => {
                const maxValue = serviceCostData[0].value || 1;
                return (
                  <div className="chart-row" key={item.name}>
                    <div className="chart-label">{item.name}</div>
                    <div className="chart-bar-wrapper">
                      <div
                        className={`chart-bar ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                        style={{ width: `${(item.value / maxValue) * 100}%` }}
                      >
                        <span className="chart-value">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No service cost data available</div>
          )}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="dashboard-grid">
        {/* Recent Assignments */}
        <div>
          <h2 className="section-title">Recent Assignments</h2>
          <div className="table-container">
            {recentAssignments && recentAssignments.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Items</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssignments.map((a, i) => (
                      <tr key={i}>
                        <td>{a.empName}</td>
                        <td>
                          {a.assets && a.assets.map((aa, j) => (
                            <span key={`a-${j}`} className="status-badge status-active" style={{ marginRight: 5 }}>
                              {aa.asset?.name || '-'}
                            </span>
                          ))}
                          {a.licenses && a.licenses.map((al, j) => (
                            <span key={`l-${j}`} className="status-badge status-pending" style={{ marginRight: 5 }}>
                              {al.license?.name || '-'}
                            </span>
                          ))}
                        </td>
                        <td>{formatDate(a.assignDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No recent assignments</div>
            )}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div>
          <h2 className="section-title">Upcoming Renewals</h2>
          <div className="table-container">
            {upcomingRenewals && upcomingRenewals.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Renewal Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingRenewals.map((r, i) => (
                      <tr key={i}>
                        <td>{r.name}</td>
                        <td>
                          <span className="status-badge status-expiring">{r.type}</span>
                        </td>
                        <td>{formatDate(r.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No upcoming renewals</div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div style={{ marginTop: 30 }}>
        <h2 className="section-title">Low Stock Alerts</h2>
        <div className="table-container">
          {lowStockAlerts && lowStockAlerts.length > 0 ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Available</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockAlerts.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.type}</td>
                      <td>{item.available}</td>
                      <td>
                        <span className={`status-badge ${item.outOfStock ? 'status-out' : 'status-low'}`}>
                          {item.outOfStock ? 'In Use' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">No low stock alerts</div>
          )}
        </div>
      </div>
    </>
  );
}
