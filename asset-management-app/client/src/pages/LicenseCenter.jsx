import { useState, useEffect, useRef } from 'react';
import { licensesApi, importApi, exportApi } from '../services/api';
import { formatDate, getLicenseStatus, todayStr, futureDate } from '../utils';
import { useDebounce } from '../hooks/useDebounce';

const emptyForm = () => ({
  name: '',
  quantity: '',
  licenseKey: '',
  startDate: todayStr(),
  endDate: futureDate(1),
  vendor: '',
});

function LicenseCenter({ showAlert }) {
  const [licenses, setLicenses] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      const res = await importApi.licenses(file);
      setImportResult(res.data || res);
      showAlert(`Imported ${res.data?.imported || 0} licenses successfully`);
      fetchLicenses();
    } catch (err) {
      showAlert(err?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = async (format) => {
    try {
      await exportApi.download('licenses', format);
      showAlert(`Licenses exported as ${format.toUpperCase()}`);
    } catch {
      showAlert('Export failed', 'error');
    }
  };

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const res = await licensesApi.list({ page, limit: pageSize, search: debouncedSearch });
      setLicenses(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch {
      showAlert('Failed to load licenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLicenses(); }, [page, debouncedSearch]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.quantity || !form.vendor) {
      showAlert('Please fill in required fields', 'error');
      return;
    }
    try {
      await licensesApi.create({ ...form, quantity: Number(form.quantity) });
      showAlert('License added successfully');
      setForm(emptyForm());
      setPage(1);
      fetchLicenses();
    } catch {
      showAlert('Failed to add license', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await licensesApi.delete(deleteConfirm.id);
      showAlert('License deleted');
      setDeleteConfirm(null);
      fetchLicenses();
    } catch {
      showAlert('Failed to delete license', 'error');
    }
  };

  const openEdit = (lic) => setEditModal({ ...lic });

  const handleEditChange = (e) => setEditModal({ ...editModal, [e.target.name]: e.target.value });

  const handleEditSave = async () => {
    try {
      await licensesApi.update(editModal.id, {
        name: editModal.name,
        quantity: Number(editModal.quantity),
        licenseKey: editModal.licenseKey,
        startDate: editModal.startDate,
        endDate: editModal.endDate,
        vendor: editModal.vendor,
      });
      showAlert('License updated successfully');
      setEditModal(null);
      fetchLicenses();
    } catch {
      showAlert('Failed to update license', 'error');
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

  const sortedLicenses = [...licenses].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === 'available') {
      aVal = (a.quantity || 0) - (a.used || 0);
      bVal = (b.quantity || 0) - (b.used || 0);
    }
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const stats = licenses.reduce(
    (acc, l) => {
      const s = getLicenseStatus(l.endDate);
      if (s.text === 'Active') acc.active++;
      else if (s.text === 'Expiring Soon') acc.expiring++;
      else acc.expired++;
      return acc;
    },
    { active: 0, expiring: 0, expired: 0 }
  );

  return (
    <div>
      {/* Add License Form */}
      <div className="form-container">
        <h3 className="section-title">Add License</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>License Name *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Microsoft Office 365" />
            </div>
            <div className="form-group">
              <label>Quantity *</label>
              <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} placeholder="Number of licenses" />
            </div>
            <div className="form-group">
              <label>License Key</label>
              <input name="licenseKey" value={form.licenseKey} onChange={handleChange} placeholder="XXXX-XXXX-XXXX" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input name="startDate" type="date" value={form.startDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input name="endDate" type="date" value={form.endDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Vendor *</label>
              <input name="vendor" value={form.vendor} onChange={handleChange} placeholder="e.g. Microsoft" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Add License</button>
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
          <span>Expiring Soon (30 days): {stats.expiring}</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot red"></span>
          <span>Expired: {stats.expired}</span>
        </div>
      </div>

      {/* Import/Export Toolbar */}
      <div className="import-export-toolbar">
        <div className="btn-group">
          <input type="file" ref={fileInputRef} className="file-input-hidden" accept=".csv,.xlsx" onChange={handleImport} />
          <button className="btn-outline btn-import" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Import CSV/Excel'}
          </button>
          <button className="btn-outline btn-template" onClick={() => importApi.downloadTemplate('licenses')}>
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
          placeholder="Search licenses..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* License Table */}
      <div className="table-container">
        <div className="table-scroll">
          {loading ? (
            <div className="loading">Loading licenses...</div>
          ) : sortedLicenses.length === 0 ? (
            <div className="empty-state">No licenses found. Add your first license above.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="sortable-th" onClick={() => toggleSort('name')}>License Name{sortIndicator('name')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('vendor')}>Vendor{sortIndicator('vendor')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('quantity')}>Total{sortIndicator('quantity')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('used')}>Used{sortIndicator('used')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('available')}>Available{sortIndicator('available')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('startDate')}>Start Date{sortIndicator('startDate')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('endDate')}>End Date{sortIndicator('endDate')}</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedLicenses.map((l) => {
                  const status = getLicenseStatus(l.endDate);
                  return (
                    <tr key={l.id}>
                      <td>{l.name}</td>
                      <td>{l.vendor}</td>
                      <td>{l.quantity}</td>
                      <td>{l.used || 0}</td>
                      <td>{(l.quantity || 0) - (l.used || 0)}</td>
                      <td>{formatDate(l.startDate)}</td>
                      <td>{formatDate(l.endDate)}</td>
                      <td><span className={`status-badge ${status.className}`}>{status.text}</span></td>
                      <td>
                        <button className="btn btn-edit" onClick={() => openEdit(l)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => setDeleteConfirm(l)}>Delete</button>
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
            <h3>Edit License</h3>
            <div className="form-row-2">
              <div className="form-group">
                <label>License Name</label>
                <input name="name" value={editModal.name} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input name="quantity" type="number" min="1" value={editModal.quantity} onChange={handleEditChange} />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>License Key</label>
                <input name="licenseKey" value={editModal.licenseKey || ''} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Vendor</label>
                <input name="vendor" value={editModal.vendor} onChange={handleEditChange} />
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

export default LicenseCenter;
