import { useState, useEffect, useRef } from 'react';
import { assignmentsApi, assetsApi, licensesApi, importApi, exportApi, employeesApi, locationsApi } from '../services/api';
import { formatDate, getCategoryLabel, todayStr } from '../utils';

const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'Engineering', 'Design'];
const PAGE_SIZE = 1000;

const emptyForm = () => ({
  empName: '',
  empId: '',
  department: '',
  empEmail: '',
  location: '',
  designation: '',
  locationId: '',
  assignDate: todayStr(),
  notes: '',
});

function Assignments({ showAlert, user }) {
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [selectedLicenses, setSelectedLicenses] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupSuccess, setLookupSuccess] = useState(false);
  const [orgLocations, setOrgLocations] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');

  // Edit mode
  const [editingId, setEditingId] = useState(null);

  const [totalCount, setTotalCount] = useState(0);

  const isAdmin = user?.role === 'admin';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Fetch organizational locations
  useEffect(() => {
    locationsApi.list().then(res => {
      const all = res.data || [];
      if (isAdmin) {
        setOrgLocations(all);
      } else {
        const userLocIds = (user?.locations || []).map(l => l.id);
        setOrgLocations(all.filter(l => userLocIds.includes(l.id)));
      }
    }).catch(() => {});
  }, [user, isAdmin]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await assignmentsApi.list({ page: 1, limit: PAGE_SIZE });
      setAssignments(res.data || []);
      const meta = res.meta || {};
      setTotalCount(meta.total || 0);
    } catch {
      showAlert('Failed to load assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const [assetRes, licenseRes] = await Promise.all([
        assetsApi.list({ limit: 100 }),
        licensesApi.list({ limit: 100 }),
      ]);
      setAssets(assetRes.data || []);
      setLicenses(licenseRes.data || []);
    } catch {
      showAlert('Failed to load inventory', 'error');
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchInventory();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleEmpIdBlur = async () => {
    if (editingId) return; // Don't lookup when editing
    const empId = form.empId.trim();
    if (!empId) { setLookupError(''); setLookupSuccess(false); return; }
    setLookupLoading(true); setLookupError(''); setLookupSuccess(false);
    try {
      const res = await employeesApi.lookup(empId);
      if (res.success && res.data) {
        setForm((prev) => ({
          ...prev,
          empName: res.data.empName || prev.empName,
          department: res.data.department || prev.department,
          empEmail: res.data.email || prev.empEmail,
          location: res.data.location || prev.location,
          designation: res.data.designation || prev.designation,
        }));
        setLookupSuccess(true);
      }
    } catch (err) {
      if (err?.error?.code === 'NOT_FOUND') {
        setLookupError('Employee not found. Please enter details manually.');
      } else {
        setLookupError('Lookup failed. You can enter details manually.');
      }
    } finally { setLookupLoading(false); }
  };

  const toggleAsset = (id) => {
    setSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleLicense = (id) => {
    setSelectedLicenses((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  // ── Edit: populate form from assignment row ──────────────────────────────
  const handleEdit = (a) => {
    setEditingId(a.id);
    setForm({
      empName: a.empName || '',
      empId: a.empId || '',
      department: a.department?.name || '',
      empEmail: a.empEmail || '',
      location: a.location || '',
      designation: a.designation || '',
      locationId: a.locationId ? String(a.locationId) : '',
      assignDate: a.assignDate ? a.assignDate.slice(0, 10) : todayStr(),
      notes: a.notes || '',
    });
    setSelectedAssets([]);
    setSelectedLicenses([]);
    setLookupSuccess(false);
    setLookupError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setLookupSuccess(false);
    setLookupError('');
  };

  // ── Submit: create or update ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.empName || !form.empId) {
      showAlert('Please fill in required employee fields', 'error');
      return;
    }

    // ── UPDATE mode ──
    if (editingId) {
      try {
        await assignmentsApi.update(editingId, {
          empName: form.empName,
          empId: form.empId,
          departmentName: form.department,
          empEmail: form.empEmail,
          location: form.location,
          designation: form.designation,
          locationId: form.locationId ? Number(form.locationId) : null,
          assignDate: form.assignDate,
          notes: form.notes,
        });
        showAlert('Assignment updated successfully');
        cancelEdit();
        fetchAssignments();
      } catch {
        showAlert('Failed to update assignment', 'error');
      }
      return;
    }

    // ── CREATE mode ──
    if (selectedAssets.length === 0 && selectedLicenses.length === 0) {
      showAlert('Please select at least one asset or license to assign', 'error');
      return;
    }
    if (!form.locationId) {
      showAlert('Please select an organizational location', 'error');
      return;
    }
    try {
      await assignmentsApi.create({
        empName: form.empName,
        empId: form.empId,
        departmentName: form.department,
        empEmail: form.empEmail,
        location: form.location,
        designation: form.designation,
        locationId: Number(form.locationId),
        assignDate: form.assignDate,
        notes: form.notes,
        assetIds: selectedAssets,
        licenseIds: selectedLicenses,
      });
      showAlert('Assignment created successfully');
      setForm(emptyForm());
      setSelectedAssets([]);
      setSelectedLicenses([]);
      setLookupSuccess(false);
      setLookupError('');
      fetchAssignments();
      fetchInventory();
    } catch {
      showAlert('Failed to create assignment', 'error');
    }
  };

  const handleRemove = async (id, empName) => {
    if (!window.confirm(`Remove assignment for "${empName}"? Items will be returned to inventory.`)) return;
    try {
      await assignmentsApi.delete(id);
      showAlert('Assignment removed. Items returned to inventory.');
      fetchAssignments();
      fetchInventory();
    } catch {
      showAlert('Failed to remove assignment', 'error');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importApi.assignments(file);
      setImportResult(res.data || res);
      showAlert(`Imported ${res.data?.imported || 0} assignments successfully`);
      fetchAssignments();
      fetchInventory();
    } catch (err) {
      showAlert(err?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = async (format) => {
    try {
      await exportApi.download('assignments', format);
      showAlert(`Assignments exported as ${format.toUpperCase()}`);
    } catch {
      showAlert('Export failed', 'error');
    }
  };

  const availableAssets = assets.filter((a) => (a.available || 0) > 0);
  const availableLicenses = licenses.filter((l) => (l.available || 0) > 0);

  // Global search filter
  const filteredAssignments = assignments.filter(a => {
    if (!globalSearch.trim()) return true;
    const q = globalSearch.toLowerCase().trim();
    const s = (v) => String(v || '').toLowerCase();
    return (
      s(a.empName).includes(q) ||
      s(a.empId).includes(q) ||
      s(a.empEmail).includes(q) ||
      s(a.department?.name).includes(q) ||
      s(a.designation).includes(q) ||
      s(a.location).includes(q) ||
      s(a.orgLocationName).includes(q) ||
      s(a.notes).includes(q) ||
      (a.assets || []).some(aa => s(aa.asset?.name).includes(q) || s(aa.asset?.serialNo).includes(q)) ||
      (a.licenses || []).some(al => s(al.license?.name).includes(q))
    );
  });

  return (
    <div>
      {/* Employee Form */}
      <div className="form-container" ref={formRef}>
        <h3 className="section-title">
          {editingId ? 'Edit Assignment' : 'Assign Assets & Licenses'}
        </h3>
        {editingId && (
          <div style={{ marginBottom: 12, padding: '8px 14px', background: '#fef3c7', borderRadius: 8, fontSize: '0.85rem', color: '#92400e' }}>
            Editing assignment — update employee details below, then click "Update Assignment".
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Employee ID *</label>
              <input name="empId" value={form.empId} onChange={handleChange} onBlur={handleEmpIdBlur} placeholder="e.g. 3088" />
              {lookupLoading && <span style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>Looking up...</span>}
              {lookupSuccess && <span style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: 2 }}>Employee found</span>}
              {lookupError && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2 }}>{lookupError}</span>}
            </div>
            <div className="form-group">
              <label>Employee Name *</label>
              <input name="empName" value={form.empName} onChange={handleChange} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input name="department" list="dept-list" value={form.department} onChange={handleChange} placeholder="e.g. IT" />
              <datalist id="dept-list">
                {departments.map((d) => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input name="empEmail" type="email" value={form.empEmail} onChange={handleChange} placeholder="employee@company.com" />
            </div>
            <div className="form-group">
              <label>Designation</label>
              <input name="designation" value={form.designation} onChange={handleChange} placeholder="e.g. Sr. Engineer" />
            </div>
            <div className="form-group">
              <label>Sub Location</label>
              <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Control Room" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Org. Location *</label>
              <select name="locationId" value={form.locationId} onChange={handleChange} required>
                <option value="">-- Select Location --</option>
                {orgLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Assignment Date</label>
              <input name="assignDate" type="date" value={form.assignDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes" />
            </div>
          </div>

          {/* Two-Column Selection — only show in Create mode */}
          {!editingId && (
            <div className="selection-container">
              <div className="selection-box">
                <h4>Select Assets</h4>
                {availableAssets.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px' }}>No available assets</div>
                ) : (
                  availableAssets.map((a) => {
                    const avail = a.available || 0;
                    return (
                      <div className="selection-item" key={a.id}>
                        <input
                          type="checkbox"
                          id={`asset-${a.id}`}
                          checked={selectedAssets.includes(a.id)}
                          onChange={() => toggleAsset(a.id)}
                        />
                        <label htmlFor={`asset-${a.id}`}>
                          {getCategoryLabel(a.category)} - {a.name}{a.serialNo ? ` (${a.serialNo})` : ''}
                        </label>
                        <span className={`available-tag${avail <= 5 ? ' low' : ''}`}>{avail} avail</span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="selection-box">
                <h4>Select Licenses</h4>
                {availableLicenses.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px' }}>No available licenses</div>
                ) : (
                  availableLicenses.map((l) => {
                    const avail = l.available || 0;
                    return (
                      <div className="selection-item" key={l.id}>
                        <input
                          type="checkbox"
                          id={`license-${l.id}`}
                          checked={selectedLicenses.includes(l.id)}
                          onChange={() => toggleLicense(l.id)}
                        />
                        <label htmlFor={`license-${l.id}`}>
                          {l.name}
                        </label>
                        <span className={`available-tag${avail <= 5 ? ' low' : ''}`}>{avail} avail</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Assignment' : 'Create Assignment'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={cancelEdit}
                style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Import/Export Toolbar */}
      <div className="import-export-toolbar">
        <div className="btn-group">
          <input type="file" ref={fileInputRef} className="file-input-hidden" accept=".csv,.xlsx" onChange={handleImport} />
          <button className="btn-outline btn-import" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Import CSV/Excel'}
          </button>
          <button className="btn-outline btn-template" onClick={() => importApi.downloadTemplate('assignments')}>
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
              {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{typeof err === 'string' ? err : `Row ${err.row}: ${err.reason}`}</li>)}
              {importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}
            </ul>
          )}
          <button className="btn-outline" style={{ marginTop: 8 }} onClick={() => setImportResult(null)}>Dismiss</button>
        </div>
      )}

      {/* Global Search + Count */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', margin: '16px 0', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '500px' }}>
          <input
            type="text"
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            placeholder="Search by name, ID, email, department, location, asset, serial no..."
            style={{ width: '100%', padding: '9px 38px 9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', transition: 'border-color 0.2s', background: '#f8fafc' }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1 }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {globalSearch.trim()
            ? `Showing ${filteredAssignments.length} of ${totalCount} assignments`
            : `Total: ${totalCount} assignments`}
        </span>
      </div>

      {/* Assignments Table */}
      <div className="table-container">
        <div className="table-scroll">
          {loading ? (
            <div className="loading">Loading assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="empty-state">{assignments.length === 0 ? 'No assignments found. Create your first assignment above.' : 'No assignments match your search.'}</div>
          ) : (
            <table style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Assets Assigned</th>
                  <th>Licenses</th>
                  {isAdminOrManager && (
                    <th style={{ position: 'sticky', right: 0, zIndex: 2, minWidth: '120px' }}>Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((a) => (
                  <tr key={a.id} style={editingId === a.id ? { background: '#fef9c3' } : {}}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.empName}</div>
                      {a.empEmail && <div style={{ fontSize: '0.72rem', color: '#999' }}>{a.empEmail}</div>}
                      {(a.designation || a.location) && (
                        <div style={{ fontSize: '0.72rem', color: '#b0b0b0' }}>
                          {[a.designation, a.location].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>{a.empId}</td>
                    <td>{a.department?.name || '-'}</td>
                    <td>{a.orgLocationName || '-'}</td>
                    <td>
                      {a.assets && a.assets.length > 0
                        ? a.assets.map((aa, i) => (
                            <span key={i} className="status-badge status-active" style={{ marginRight: '4px', marginBottom: '2px', fontSize: '0.75rem' }}>
                              {aa.asset?.name || '-'}{aa.asset?.serialNo ? ` (${aa.asset.serialNo})` : ''}
                            </span>
                          ))
                        : <span style={{ color: '#999' }}>-</span>}
                    </td>
                    <td>
                      {a.licenses && a.licenses.length > 0
                        ? a.licenses.map((al, i) => (
                            <span key={i} className="status-badge status-pending" style={{ marginRight: '4px', marginBottom: '2px', fontSize: '0.75rem' }}>
                              {al.license?.name || '-'}
                            </span>
                          ))
                        : <span style={{ color: '#999' }}>-</span>}
                    </td>
                    {isAdminOrManager && (
                      <td style={{ position: 'sticky', right: 0, background: editingId === a.id ? '#fef9c3' : '#fff', zIndex: 1, boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'nowrap' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => handleEdit(a)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => handleRemove(a.id, a.empName)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
    </div>
  );
}

export default Assignments;
