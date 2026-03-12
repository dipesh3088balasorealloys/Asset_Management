import { useState, useEffect, useRef } from 'react';
import { servicesApi, importApi, exportApi } from '../services/api';
import { formatDate, formatCurrency, getServiceDisplayStatus, getServiceTypeBadge, getCategoryLabel, todayStr, futureDate } from '../utils';
import { useDebounce } from '../hooks/useDebounce';

const typeOptions = ['SaaS', 'Cloud', 'Maintenance', 'Support', 'Consulting', 'Hosting', 'Security', 'Other'];
const statusOptions = ['Active', 'Pending', 'Cancelled'];
const billingOptions = ['Monthly', 'Quarterly', 'Yearly', 'OneTime'];
const categoryTabs = ['All', 'SaaS', 'Cloud', 'Maintenance', 'Support', 'Other'];

const emptyForm = () => ({
  type: 'SaaS',
  name: '',
  provider: '',
  status: 'Active',
  cost: '',
  billingCycle: 'Monthly',
  startDate: todayStr(),
  endDate: futureDate(1),
  accountId: '',
  contactInfo: '',
  notes: '',
});

function Services({ showAlert }) {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeCategory, setActiveCategory] = useState('All');
  const [editModal, setEditModal] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileInputRef = useRef(null);
  const debouncedSearch = useDebounce(search, 300);
  const pageSize = 10;

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importApi.services(file);
      setImportResult(res.data || res);
      showAlert(`Imported ${res.data?.imported || 0} services successfully`);
      fetchServices();
    } catch (err) {
      showAlert(err?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = async (format) => {
    try {
      await exportApi.download('services', format);
      showAlert(`Services exported as ${format.toUpperCase()}`);
    } catch {
      showAlert('Export failed', 'error');
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = { page, limit: pageSize, search: debouncedSearch };
      if (activeCategory !== 'All') params.type = activeCategory;
      const res = await servicesApi.list(params);
      setServices(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch {
      showAlert('Failed to load services', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, [page, debouncedSearch, activeCategory]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.provider || !form.cost) {
      showAlert('Please fill in required fields', 'error');
      return;
    }
    try {
      await servicesApi.create({ ...form, cost: Number(form.cost) });
      showAlert('Service added successfully');
      setForm(emptyForm());
      setPage(1);
      fetchServices();
    } catch {
      showAlert('Failed to add service', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await servicesApi.delete(deleteConfirm.id);
      showAlert('Service deleted');
      setDeleteConfirm(null);
      fetchServices();
    } catch {
      showAlert('Failed to delete service', 'error');
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIndicator = (field) => {
    if (sortField !== field) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const sortedServices = [...services].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const openEdit = (svc) => setEditModal({ ...svc });

  const handleEditChange = (e) => setEditModal({ ...editModal, [e.target.name]: e.target.value });

  const handleEditSave = async () => {
    try {
      await servicesApi.update(editModal.id, {
        type: editModal.type,
        name: editModal.name,
        provider: editModal.provider,
        status: editModal.status,
        cost: Number(editModal.cost),
        billingCycle: editModal.billingCycle,
        startDate: editModal.startDate,
        endDate: editModal.endDate,
        accountId: editModal.accountId,
        contactInfo: editModal.contactInfo,
        notes: editModal.notes,
      });
      showAlert('Service updated successfully');
      setEditModal(null);
      fetchServices();
    } catch {
      showAlert('Failed to update service', 'error');
    }
  };

  const stats = services.reduce(
    (acc, s) => {
      const ds = getServiceDisplayStatus(s);
      if (ds.text === 'Active') acc.active++;
      else if (ds.text === 'Renewal Due') acc.renewal++;
      else if (ds.text === 'Expired') acc.expired++;
      else if (ds.text === 'Pending') acc.pending++;
      else if (ds.text === 'Cancelled') acc.cancelled++;
      return acc;
    },
    { active: 0, renewal: 0, expired: 0, pending: 0, cancelled: 0 }
  );

  return (
    <div>
      {/* Add Service Form */}
      <div className="form-container">
        <h3 className="section-title">Add Service</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row-4">
            <div className="form-group">
              <label>Type *</label>
              <select name="type" value={form.type} onChange={handleChange}>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Service Name *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. AWS Cloud Hosting" />
            </div>
            <div className="form-group">
              <label>Provider *</label>
              <input name="provider" value={form.provider} onChange={handleChange} placeholder="e.g. Amazon" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row-4">
            <div className="form-group">
              <label>Cost *</label>
              <input name="cost" type="number" min="0" step="0.01" value={form.cost} onChange={handleChange} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Billing Cycle</label>
              <select name="billingCycle" value={form.billingCycle} onChange={handleChange}>
                {billingOptions.map((b) => <option key={b} value={b}>{getCategoryLabel(b)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input name="startDate" type="date" value={form.startDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input name="endDate" type="date" value={form.endDate} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Account ID</label>
              <input name="accountId" value={form.accountId} onChange={handleChange} placeholder="Account identifier" />
            </div>
            <div className="form-group">
              <label>Contact Info</label>
              <input name="contactInfo" value={form.contactInfo} onChange={handleChange} placeholder="Support contact" />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="Additional notes" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Add Service</button>
        </form>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-dot green"></span>
          <span>Active: {stats.active}</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot orange"></span>
          <span>Renewal Due: {stats.renewal}</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot red"></span>
          <span>Expired: {stats.expired}</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot blue"></span>
          <span>Pending: {stats.pending}</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot gray"></span>
          <span>Cancelled: {stats.cancelled}</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {categoryTabs.map((tab) => (
          <span
            key={tab}
            className={`category-tab${activeCategory === tab ? ' active' : ''}`}
            onClick={() => { setActiveCategory(tab); setPage(1); }}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Import/Export Toolbar */}
      <div className="import-export-toolbar">
        <div className="btn-group">
          <input type="file" ref={fileInputRef} className="file-input-hidden" accept=".csv,.xlsx" onChange={handleImport} />
          <button className="btn-outline btn-import" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Import CSV/Excel'}
          </button>
          <button className="btn-outline btn-template" onClick={() => importApi.downloadTemplate('services')}>
            Download Template
          </button>
        </div>
        <div className="separator" />
        <div className="btn-group">
          <button className="btn-outline btn-export-csv" onClick={() => handleExport('csv')}>Export CSV</button>
          <button className="btn-outline btn-export-pdf" onClick={() => handleExport('pdf')}>Export PDF</button>
        </div>
      </div>

      {importResult && (
        <div className="import-result">
          <h4>Import Results</h4>
          <div className="result-stats">
            <span>Imported: <strong>{importResult.imported || 0}</strong></span>
            <span>Skipped: <strong>{importResult.skipped || 0}</strong></span>
          </div>
          {importResult.errors?.length > 0 && (
            <ul className="result-errors">
              {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
              {importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}
            </ul>
          )}
          <button className="btn-outline" style={{ marginTop: 8 }} onClick={() => setImportResult(null)}>Dismiss</button>
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <input
          placeholder="Search services..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Service Table */}
      <div className="table-container">
        <div className="table-scroll">
          {loading ? (
            <div className="loading">Loading services...</div>
          ) : sortedServices.length === 0 ? (
            <div className="empty-state">No services found. Add your first service above.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="sortable-th" onClick={() => toggleSort('name')}>Service Name{sortIndicator('name')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('type')}>Type{sortIndicator('type')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('provider')}>Provider{sortIndicator('provider')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('cost')}>Cost{sortIndicator('cost')}</th>
                  <th>Billing</th>
                  <th className="sortable-th" onClick={() => toggleSort('startDate')}>Start Date{sortIndicator('startDate')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('endDate')}>Renewal Date{sortIndicator('endDate')}</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedServices.map((s) => {
                  const displayStatus = getServiceDisplayStatus(s);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div>{s.name}</div>
                        {s.accountId && <div style={{ fontSize: '0.75rem', color: '#999' }}>{s.accountId}</div>}
                      </td>
                      <td><span className={`service-type-badge ${getServiceTypeBadge(s.type)}`}>{s.type}</span></td>
                      <td>{s.provider}</td>
                      <td><span className="cost-display">{formatCurrency(s.cost)}</span></td>
                      <td>{getCategoryLabel(s.billingCycle)}</td>
                      <td>{formatDate(s.startDate)}</td>
                      <td>{formatDate(s.endDate)}</td>
                      <td><span className={`status-badge ${displayStatus.className}`}>{displayStatus.text}</span></td>
                      <td>
                        <button className="btn btn-edit" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => setDeleteConfirm(s)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Service</h3>
            <div className="form-row-2">
              <div className="form-group">
                <label>Type</label>
                <select name="type" value={editModal.type} onChange={handleEditChange}>
                  {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Service Name</label>
                <input name="name" value={editModal.name} onChange={handleEditChange} />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Provider</label>
                <input name="provider" value={editModal.provider} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={editModal.status} onChange={handleEditChange}>
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Cost</label>
                <input name="cost" type="number" min="0" step="0.01" value={editModal.cost} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Billing Cycle</label>
                <select name="billingCycle" value={editModal.billingCycle} onChange={handleEditChange}>
                  {billingOptions.map((b) => <option key={b} value={b}>{getCategoryLabel(b)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Start Date</label>
                <input name="startDate" type="date" value={editModal.startDate ? editModal.startDate.split('T')[0] : ''} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input name="endDate" type="date" value={editModal.endDate ? editModal.endDate.split('T')[0] : ''} onChange={handleEditChange} />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Account ID</label>
                <input name="accountId" value={editModal.accountId || ''} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Contact Info</label>
                <input name="contactInfo" value={editModal.contactInfo || ''} onChange={handleEditChange} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Notes</label>
              <textarea name="notes" value={editModal.notes || ''} onChange={handleEditChange} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Services;
