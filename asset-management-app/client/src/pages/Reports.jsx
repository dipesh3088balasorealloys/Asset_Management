import { useState, useEffect, useMemo } from 'react';
import { reportsApi, exportApi } from '../services/api';
import { formatDate, formatCurrency, getCategoryLabel } from '../utils';

const REPORT_TABS = [
  { key: 'location-summary', label: 'Location Overview' },
  { key: 'asset-utilization', label: 'Asset Utilization' },
  { key: 'license-utilization', label: 'License Utilization' },
  { key: 'service-costs', label: 'Service Costs' },
  { key: 'employee-summary', label: 'Employee Summary' },
  { key: 'renewals', label: 'Upcoming Renewals' },
];

export default function Reports({ showAlert, user }) {
  const [activeReport, setActiveReport] = useState('location-summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const fetchReport = async (reportKey) => {
    setLoading(true);
    setData(null);
    try {
      let res;
      switch (reportKey) {
        case 'location-summary':
          res = await reportsApi.locationSummary();
          break;
        case 'asset-utilization':
          res = await reportsApi.assetUtilization();
          break;
        case 'license-utilization':
          res = await reportsApi.licenseUtilization();
          break;
        case 'service-costs':
          res = await reportsApi.serviceCosts();
          break;
        case 'employee-summary':
          res = await reportsApi.employeeSummary();
          break;
        case 'renewals':
          res = await reportsApi.renewals(30);
          break;
        default:
          res = {};
      }
      setData(res.data);
    } catch {
      showAlert('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport]);

  useEffect(() => {
    setSearch('');
  }, [activeReport]);

  // -----------------------------------------------------------------------
  // Export handler
  // -----------------------------------------------------------------------
  const handleExport = async (format) => {
    setExporting(true);
    try {
      await exportApi.downloadReport(activeReport, format);
      showAlert(`Report exported as ${format.toUpperCase()}`);
    } catch {
      showAlert('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Filtered data
  // -----------------------------------------------------------------------
  const q = search.trim().toLowerCase();

  const filteredData = useMemo(() => {
    if (!data || !q) return data;

    switch (activeReport) {
      case 'location-summary': {
        if (!data.locations) return data;
        const filtered = data.locations.filter((loc) =>
          loc.locationName?.toLowerCase().includes(q) ||
          loc.locationCode?.toLowerCase().includes(q) ||
          String(loc.totalAssets).includes(q) ||
          String(loc.employees).includes(q)
        );
        return { ...data, locations: filtered };
      }

      case 'asset-utilization': {
        if (!data.breakdown) return data;
        const filtered = data.breakdown.filter((row) =>
          getCategoryLabel(row.category).toLowerCase().includes(q) ||
          String(row.total).includes(q) ||
          String(row.assigned).includes(q) ||
          String(row.available).includes(q)
        );
        return { ...data, breakdown: filtered };
      }

      case 'license-utilization': {
        if (!data.licenses) return data;
        const filtered = data.licenses.filter((l) =>
          l.name?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q) ||
          String(l.quantity).includes(q)
        );
        return { ...data, licenses: filtered };
      }

      case 'service-costs': {
        if (!data.breakdown) return data;
        const filtered = data.breakdown.filter((row) =>
          row.type?.toLowerCase().includes(q) ||
          String(row.count).includes(q) ||
          String(row.monthlyCost).includes(q) ||
          String(row.yearlyCost).includes(q)
        );
        return { ...data, breakdown: filtered };
      }

      case 'employee-summary': {
        if (!Array.isArray(data)) return data;
        return data.filter((a) =>
          a.empName?.toLowerCase().includes(q) ||
          a.empId?.toLowerCase().includes(q) ||
          a.empEmail?.toLowerCase().includes(q) ||
          a.department?.name?.toLowerCase().includes(q) ||
          a.orgLocationName?.toLowerCase().includes(q) ||
          a.assets?.some((aa) =>
            aa.asset?.name?.toLowerCase().includes(q) ||
            aa.asset?.serialNo?.toLowerCase().includes(q)
          ) ||
          a.licenses?.some((al) =>
            al.license?.name?.toLowerCase().includes(q)
          )
        );
      }

      case 'renewals': {
        if (!Array.isArray(data)) return data;
        return data.filter((r) =>
          r.name?.toLowerCase().includes(q) ||
          r.type?.toLowerCase().includes(q) ||
          formatDate(r.date)?.toLowerCase().includes(q)
        );
      }

      default:
        return data;
    }
  }, [data, q, activeReport]);

  // Count for search results
  const getResultCount = () => {
    if (!q || !filteredData) return null;
    switch (activeReport) {
      case 'location-summary':
        return filteredData.locations?.length ?? null;
      case 'asset-utilization':
        return filteredData.breakdown?.length ?? null;
      case 'license-utilization':
        return filteredData.licenses?.length ?? null;
      case 'service-costs':
        return filteredData.breakdown?.length ?? null;
      case 'employee-summary':
        return Array.isArray(filteredData) ? filteredData.length : null;
      case 'renewals':
        return Array.isArray(filteredData) ? filteredData.length : null;
      default:
        return null;
    }
  };

  const resultCount = getResultCount();

  // -----------------------------------------------------------------------
  // Render functions
  // -----------------------------------------------------------------------

  const renderLocationSummary = () => {
    if (!filteredData || !filteredData.locations || !filteredData.totals) return null;
    const { locations, totals } = filteredData;
    const overallUtil = totals.totalAssets > 0
      ? Math.round((totals.assignedAssets / totals.totalAssets) * 100)
      : 0;

    return (
      <>
        {/* Executive Summary Cards */}
        <div className="dashboard-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          <div className="card">
            <div className="card-icon blue">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v5c0 .75.4 1.38 1 1.73V19c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-3.28c.59-.35 1-.99 1-1.72V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5z" />
              </svg>
            </div>
            <h3>{totals.totalAssets}</h3>
            <p>Total Assets ({totals.assignedAssets} assigned)</p>
          </div>
          <div className="card">
            <div className="card-icon green">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <h3>{totals.totalLicenses}</h3>
            <p>Total Licenses ({totals.usedLicenses} in use)</p>
          </div>
          <div className="card">
            <div className="card-icon purple">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
              </svg>
            </div>
            <h3>{totals.activeServices}</h3>
            <p>Active Services ({formatCurrency(totals.monthlyCost)}/mo)</p>
          </div>
          <div className="card">
            <div className="card-icon orange">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <h3>{totals.totalEmployees}</h3>
            <p>Employees with Assets</p>
          </div>
        </div>

        {/* Location Breakdown Table */}
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e3a5f', marginBottom: 12 }}>
          Asset Distribution by Location
        </h3>
        <div className="table-container">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Code</th>
                  <th>Total Assets</th>
                  <th>Assigned</th>
                  <th>Available</th>
                  <th>Utilization</th>
                  <th>Employees</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const util = loc.totalAssets > 0
                    ? Math.round((loc.assignedAssets / loc.totalAssets) * 100)
                    : 0;
                  return (
                    <tr key={loc.locationId}>
                      <td style={{ fontWeight: 600 }}>{loc.locationName}</td>
                      <td><span className="status-badge status-active">{loc.locationCode}</span></td>
                      <td>{loc.totalAssets}</td>
                      <td>{loc.assignedAssets}</td>
                      <td>{loc.availableAssets}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="stock-bar" style={{ width: 80 }}>
                            <div
                              className={`stock-fill ${util > 75 ? 'high' : util > 40 ? 'medium' : 'low'}`}
                              style={{ width: `${util}%` }}
                            />
                          </div>
                          <span>{util}%</span>
                        </div>
                      </td>
                      <td>{loc.employees}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
                  <td>TOTAL</td>
                  <td></td>
                  <td>{totals.totalAssets}</td>
                  <td>{totals.assignedAssets}</td>
                  <td>{totals.availableAssets}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="stock-bar" style={{ width: 80 }}>
                        <div
                          className={`stock-fill ${overallUtil > 75 ? 'high' : overallUtil > 40 ? 'medium' : 'low'}`}
                          style={{ width: `${overallUtil}%` }}
                        />
                      </div>
                      <span>{overallUtil}%</span>
                    </div>
                  </td>
                  <td>{totals.totalEmployees}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Company-wide License & Service Summary */}
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e3a5f', marginTop: 28, marginBottom: 12 }}>
          Company-wide License & Service Summary
        </h3>
        <div className="dashboard-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="card">
            <h3>{totals.totalLicenses}</h3>
            <p>Total Licenses</p>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
              {totals.usedLicenses} in use &bull; {totals.availableLicenses} available
            </div>
          </div>
          <div className="card">
            <h3>{totals.activeServices}</h3>
            <p>Active Services</p>
          </div>
          <div className="card">
            <h3 className="card-small">{formatCurrency(totals.monthlyCost)}</h3>
            <p>Monthly Service Cost</p>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
              {formatCurrency(totals.monthlyCost * 12)}/year (est.)
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderAssetUtilization = () => {
    if (!filteredData || !filteredData.breakdown) return null;
    return (
      <>
        <div className="card" style={{ marginBottom: 20, display: 'inline-block', padding: 20 }}>
          <h3>{data?.overall ?? 0}%</h3>
          <p>Overall Asset Utilization</p>
        </div>
        <div className="table-container">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total</th>
                  <th>Assigned</th>
                  <th>Available</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.breakdown && filteredData.breakdown.map((row, i) => (
                  <tr key={i}>
                    <td>{getCategoryLabel(row.category)}</td>
                    <td>{row.total}</td>
                    <td>{row.assigned}</td>
                    <td>{row.available}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="stock-bar" style={{ width: 100 }}>
                          <div
                            className={`stock-fill ${row.utilization > 75 ? 'high' : row.utilization > 40 ? 'medium' : 'low'}`}
                            style={{ width: `${row.utilization}%` }}
                          ></div>
                        </div>
                        <span>{row.utilization}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderLicenseUtilization = () => {
    if (!filteredData || !data) return null;
    return (
      <>
        {/* Summary Cards */}
        <div className="dashboard-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
          <div className="card">
            <div className="card-icon blue">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <h3>{data.total}</h3>
            <p>Total Licenses</p>
          </div>
          <div className="card">
            <div className="card-icon purple">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <h3>{data.used}</h3>
            <p>In Use</p>
          </div>
          <div className="card">
            <div className="card-icon green">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h3>{data.available}</h3>
            <p>Available</p>
          </div>
          <div className="card">
            <div className="card-icon orange">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
              </svg>
            </div>
            <h3>{data.utilization}%</h3>
            <p>Utilization Rate</p>
          </div>
        </div>

        {/* License Detail Table */}
        {filteredData.licenses && filteredData.licenses.length > 0 && (
          <div className="table-container">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>License Name</th>
                    <th>Total Seats</th>
                    <th>Used</th>
                    <th>Available</th>
                    <th>Utilization</th>
                    <th>Days Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.licenses.map((lic) => (
                    <tr key={lic.id}>
                      <td style={{ fontWeight: 500 }}>{lic.name}</td>
                      <td>{lic.quantity}</td>
                      <td>{lic.used}</td>
                      <td>{lic.available}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="stock-bar" style={{ width: 80 }}>
                            <div
                              className={`stock-fill ${lic.utilization > 75 ? 'high' : lic.utilization > 40 ? 'medium' : 'low'}`}
                              style={{ width: `${lic.utilization}%` }}
                            />
                          </div>
                          <span>{lic.utilization}%</span>
                        </div>
                      </td>
                      <td>{lic.daysRemaining != null ? `${lic.daysRemaining} days` : '-'}</td>
                      <td>
                        <span className={`status-badge ${lic.status === 'Active' ? 'status-active' : lic.status === 'Expiring Soon' ? 'status-expiring' : 'status-expired'}`}>
                          {lic.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderServiceCosts = () => {
    if (!filteredData || !data) return null;
    return (
      <>
        <div className="dashboard-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 20 }}>
          <div className="card">
            <h3 className="card-small">{formatCurrency(data?.totalMonthly ?? 0)}</h3>
            <p>Total Monthly Cost</p>
          </div>
          <div className="card">
            <h3 className="card-small">{formatCurrency(data?.totalYearly ?? 0)}</h3>
            <p>Total Yearly Cost</p>
          </div>
        </div>
        <div className="table-container">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Service Type</th>
                  <th>Count</th>
                  <th>Monthly Cost</th>
                  <th>Yearly Cost</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.breakdown && filteredData.breakdown.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`service-type-badge type-${row.type.toLowerCase()}`}>{row.type}</span>
                    </td>
                    <td>{row.count}</td>
                    <td className="cost-display">{formatCurrency(row.monthlyCost)}</td>
                    <td className="cost-display">{formatCurrency(row.yearlyCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderEmployeeSummary = () => {
    const items = filteredData;
    if (!items || !Array.isArray(items)) return null;
    return (
      <div className="table-container">
        <div className="table-scroll">
          {items.length === 0 ? (
            <div className="empty-state">{q ? 'No employees match your search.' : 'No active assignments found.'}</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Assets</th>
                  <th>Licenses</th>
                  <th>Assigned Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div>{a.empName}</div>
                      {a.empEmail && <div style={{ fontSize: '0.75rem', color: '#999' }}>{a.empEmail}</div>}
                    </td>
                    <td>{a.empId}</td>
                    <td>{a.department?.name || '-'}</td>
                    <td>{a.orgLocationName || '-'}</td>
                    <td>
                      {a.assets && a.assets.length > 0
                        ? a.assets.map((aa, i) => (
                            <span key={i} className="status-badge status-active" style={{ marginRight: 5, marginBottom: 3 }}>
                              {aa.asset?.name || '-'}{aa.asset?.serialNo ? ` (${aa.asset.serialNo})` : ''}
                            </span>
                          ))
                        : <span style={{ color: '#999' }}>None</span>}
                    </td>
                    <td>
                      {a.licenses && a.licenses.length > 0
                        ? a.licenses.map((al, i) => (
                            <span key={i} className="status-badge status-pending" style={{ marginRight: 5, marginBottom: 3 }}>
                              {al.license?.name || '-'}
                            </span>
                          ))
                        : <span style={{ color: '#999' }}>None</span>}
                    </td>
                    <td>{formatDate(a.assignDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderRenewals = () => {
    const items = filteredData;
    if (!items || !Array.isArray(items)) return null;
    return (
      <div className="table-container">
        <div className="table-scroll">
          {items.length === 0 ? (
            <div className="empty-state">{q ? 'No renewals match your search.' : 'No upcoming renewals in the next 30 days.'}</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Renewal Date</th>
                  <th>Days Remaining</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => {
                  const daysLeft = Math.ceil((new Date(r.date) - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>
                        <span className={`status-badge ${r.type === 'License' ? 'status-expiring' : 'status-pending'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td>{formatDate(r.date)}</td>
                      <td>
                        <span className={`status-badge ${daysLeft <= 7 ? 'status-expired' : daysLeft <= 15 ? 'status-expiring' : 'status-active'}`}>
                          {daysLeft} days
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (loading) return <div className="loading">Loading report...</div>;
    switch (activeReport) {
      case 'location-summary': return renderLocationSummary();
      case 'asset-utilization': return renderAssetUtilization();
      case 'license-utilization': return renderLicenseUtilization();
      case 'service-costs': return renderServiceCosts();
      case 'employee-summary': return renderEmployeeSummary();
      case 'renewals': return renderRenewals();
      default: return <div className="empty-state">Select a report</div>;
    }
  };

  // Search available on all tabs
  const showSearch = true;

  return (
    <>
      <div className="category-tabs">
        {REPORT_TABS.map((tab) => (
          <span
            key={tab.key}
            className={`category-tab ${activeReport === tab.key ? 'active' : ''}`}
            onClick={() => setActiveReport(tab.key)}
          >
            {tab.label}
          </span>
        ))}
      </div>

      {/* Search + Export Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        padding: '10px 16px',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            activeReport === 'employee-summary'
              ? 'Search by employee name, ID, email, department, location...'
              : activeReport === 'location-summary'
              ? 'Search by location name or code...'
              : activeReport === 'license-utilization'
              ? 'Search by license name, status...'
              : activeReport === 'renewals'
              ? 'Search by name, type...'
              : 'Search...'
          }
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '0.9rem',
            background: 'transparent',
            padding: '4px 0',
            minWidth: 200,
          }}
        />
        {q && (
          <>
            {resultCount !== null && (
              <span style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                {resultCount} result{resultCount !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                fontSize: '1.1rem',
                padding: '0 4px',
                lineHeight: 1,
              }}
              title="Clear search"
            >
              &times;
            </button>
          </>
        )}

        {/* Export buttons — visible to admin/manager */}
        {isAdminOrManager && (
          <>
            <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 4px' }} />
            <button
              className="btn-outline btn-export-csv"
              onClick={() => handleExport('csv')}
              disabled={exporting || loading}
              style={{ padding: '5px 14px', fontSize: '0.82rem' }}
            >
              Export CSV
            </button>
            <button
              className="btn-outline btn-export-pdf"
              onClick={() => handleExport('pdf')}
              disabled={exporting || loading}
              style={{ padding: '5px 14px', fontSize: '0.82rem' }}
            >
              Export PDF
            </button>
          </>
        )}
      </div>

      {renderReport()}
    </>
  );
}
