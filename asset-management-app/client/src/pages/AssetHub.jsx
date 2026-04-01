import { useState, useEffect, useCallback, useRef } from 'react';
import { assetsApi, importApi, exportApi, locationsApi } from '../services/api';
import { getStockStatus, getCategoryLabel, todayStr, futureDate } from '../utils';
import { useDebounce } from '../hooks/useDebounce';
import { CATEGORY_OPTGROUPS, SERIAL_REQUIRED_CATEGORIES, getSingleCategory } from '../config/categoryTree';

const emptyForm = () => ({
  category: 'Laptop',
  name: '',
  serialNo: '',
  quantity: '',
  vendor: '',
  purchaseDate: todayStr(),
  warrantyEnd: futureDate(3),
  locationId: '',
  poNumber: '',
  notes: '',
});

export default function AssetHub({ showAlert, user, externalCategoryFilter, activeCategoryNode }) {
  const [assets, setAssets] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [orgLocations, setOrgLocations] = useState([]);
  const fileInputRef = useRef(null);
  const debouncedSearch = useDebounce(search, 300);

  const isAdmin = user?.role === 'admin';

  // Fetch organizational locations
  useEffect(() => {
    locationsApi.list().then(res => {
      const all = res.data || [];
      // Admin sees all; manager/viewer only their permitted locations
      if (isAdmin) {
        setOrgLocations(all);
      } else {
        const userLocIds = (user?.locations || []).map(l => l.id);
        setOrgLocations(all.filter(l => userLocIds.includes(l.id)));
      }
    }).catch(() => {});
  }, [user, isAdmin]);

  const needsSerial = (cat) => SERIAL_REQUIRED_CATEGORIES.includes(cat);

  // Convert external category filter (array) to comma-separated string for API
  const categoryParam = externalCategoryFilter ? externalCategoryFilter.join(',') : null;

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importApi.assets(file);
      setImportResult(res.data || res);
      showAlert(`Imported ${res.data?.imported || 0} assets successfully`);
      fetchAssets();
    } catch (err) {
      showAlert(err?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = async (format) => {
    try {
      await exportApi.download('assets', format);
      showAlert(`Assets exported as ${format.toUpperCase()}`);
    } catch {
      showAlert('Export failed', 'error');
    }
  };

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (categoryParam) params.category = categoryParam;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await assetsApi.list(params);
      setAssets(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch {
      showAlert('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, categoryParam, debouncedSearch, showAlert]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset page when category filter changes from sidebar
  useEffect(() => {
    setPage(1);
  }, [categoryParam]);

  // Auto-set form category when a leaf node is clicked in sidebar
  useEffect(() => {
    const singleCat = getSingleCategory(activeCategoryNode);
    if (singleCat) {
      setForm((prev) => ({ ...prev, category: singleCat }));
    }
  }, [activeCategoryNode]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (needsSerial(form.category) && !form.serialNo.trim()) {
      showAlert('Serial No. is required for ' + getCategoryLabel(form.category), 'error');
      return;
    }
    try {
      if (!form.locationId) {
        showAlert('Please select an organizational location', 'error');
        return;
      }
      await assetsApi.create({
        category: form.category,
        name: form.name,
        serialNo: form.serialNo || null,
        quantity: needsSerial(form.category) ? 1 : Number(form.quantity) || 1,
        vendor: form.vendor,
        purchaseDate: form.purchaseDate,
        warrantyEnd: form.warrantyEnd,
        locationId: Number(form.locationId),
        poNumber: form.poNumber || null,
        notes: form.notes,
      });
      showAlert('Asset added successfully');
      setForm(emptyForm());
      setPage(1);
      fetchAssets();
    } catch {
      showAlert('Failed to add asset', 'error');
    }
  };

  const openEdit = (asset) => {
    setEditId(asset.id);
    setEditForm({
      category: asset.category || 'Laptop',
      name: asset.name || '',
      serialNo: asset.serialNo || '',
      quantity: String(asset.quantity || ''),
      vendor: asset.vendor || '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : todayStr(),
      warrantyEnd: asset.warrantyEnd ? asset.warrantyEnd.split('T')[0] : futureDate(3),
      locationId: asset.locationId ? String(asset.locationId) : '',
      poNumber: asset.poNumber || '',
      notes: asset.notes || '',
    });
    setShowModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (needsSerial(editForm.category) && !editForm.serialNo.trim()) {
      showAlert('Serial No. is required for ' + getCategoryLabel(editForm.category), 'error');
      return;
    }
    try {
      await assetsApi.update(editId, {
        category: editForm.category,
        name: editForm.name,
        serialNo: editForm.serialNo || null,
        quantity: needsSerial(editForm.category) ? 1 : Number(editForm.quantity) || 1,
        vendor: editForm.vendor,
        purchaseDate: editForm.purchaseDate,
        warrantyEnd: editForm.warrantyEnd,
        locationId: editForm.locationId ? Number(editForm.locationId) : null,
        poNumber: editForm.poNumber || null,
        notes: editForm.notes,
      });
      showAlert('Asset updated successfully');
      setShowModal(false);
      setEditId(null);
      fetchAssets();
    } catch {
      showAlert('Failed to update asset', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await assetsApi.delete(deleteConfirm.id);
      showAlert('Asset deleted successfully');
      setDeleteConfirm(null);
      fetchAssets();
    } catch {
      showAlert('Failed to delete asset', 'error');
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

  const filteredAssets = [...assets].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === 'available') {
      aVal = a.quantity - (a.assigned || 0);
      bVal = b.quantity - (b.assigned || 0);
    }
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Grouped category select renderer
  const renderCategorySelect = (name, value, onChange) => (
    <select name={name} value={value} onChange={onChange}>
      {CATEGORY_OPTGROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  return (
    <>
      {/* Add New Asset Form */}
      <div className="form-container">
        <h3 className="section-title">Add New Asset</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              {renderCategorySelect('category', form.category, handleFormChange)}
            </div>
            <div className="form-group">
              <label>Asset Name</label>
              <input type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Dell Latitude 5520" required />
            </div>
            {needsSerial(form.category) ? (
              <div className="form-group">
                <label>Asset Sl. No. *</label>
                <input type="text" name="serialNo" value={form.serialNo} onChange={handleFormChange} placeholder="e.g. SN-ABC123XYZ" required />
              </div>
            ) : (
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" name="quantity" value={form.quantity} onChange={handleFormChange} placeholder="1" min="1" />
              </div>
            )}
          </div>
          <div className="form-row">
            {!needsSerial(form.category) && (
              <div className="form-group">
                <label>Asset Sl. No.</label>
                <input type="text" name="serialNo" value={form.serialNo} onChange={handleFormChange} placeholder="Optional serial number" />
              </div>
            )}
            <div className="form-group">
              <label>Asset Company Name</label>
              <input type="text" name="vendor" value={form.vendor} onChange={handleFormChange} placeholder="e.g. Dell Technologies" />
            </div>
            <div className="form-group">
              <label>Purchase Date</label>
              <input type="date" name="purchaseDate" value={form.purchaseDate} onChange={handleFormChange} />
            </div>
            {needsSerial(form.category) && (
              <div className="form-group">
                <label>Warranty End</label>
                <input type="date" name="warrantyEnd" value={form.warrantyEnd} onChange={handleFormChange} />
              </div>
            )}
          </div>
          <div className="form-row">
            {!needsSerial(form.category) && (
              <div className="form-group">
                <label>Warranty End</label>
                <input type="date" name="warrantyEnd" value={form.warrantyEnd} onChange={handleFormChange} />
              </div>
            )}
            {needsSerial(form.category) && (
              <div className="form-group">
                <label>PO Number</label>
                <input type="text" name="poNumber" value={form.poNumber} onChange={handleFormChange} placeholder="e.g. PO-2026-001" />
              </div>
            )}
            <div className="form-group">
              <label>Location *</label>
              <select name="locationId" value={form.locationId} onChange={handleFormChange} required>
                <option value="">-- Select Location --</option>
                {orgLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleFormChange} placeholder="Additional notes..." />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Add Asset</button>
        </form>
      </div>

      {/* Quick Stats Legend */}
      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-dot green"></span>
          <span>In Stock (&gt;5)</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot orange"></span>
          <span>Low Stock (1-5)</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot red"></span>
          <span>In Use</span>
        </div>
      </div>

      {/* Import/Export Toolbar */}
      <div className="import-export-toolbar">
        <div className="btn-group">
          <input type="file" ref={fileInputRef} className="file-input-hidden" accept=".csv,.xlsx" onChange={handleImport} />
          <button className="btn-outline btn-import" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Import CSV/Excel'}
          </button>
          <button className="btn-outline btn-template" onClick={() => importApi.downloadTemplate('assets')}>
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

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search assets by name, serial no, company, or location..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* Asset Inventory Table */}
      <div className="table-container">
        <div className="table-scroll">
          {loading ? (
            <div className="loading">Loading assets...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="empty-state">No assets in inventory</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="sortable-th" onClick={() => toggleSort('category')}>Category{sortIndicator('category')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('name')}>Asset Name{sortIndicator('name')}</th>
                  <th>Sl. No.</th>
                  <th className="sortable-th" onClick={() => toggleSort('quantity')}>Qty{sortIndicator('quantity')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('assigned')}>Assigned{sortIndicator('assigned')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('available')}>Available{sortIndicator('available')}</th>
                  <th>Stock Status</th>
                  <th className="sortable-th" onClick={() => toggleSort('vendor')}>Company{sortIndicator('vendor')}</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => {
                  const available = asset.quantity - (asset.assigned || 0);
                  const status = getStockStatus(available, asset.quantity);
                  return (
                    <tr key={asset.id}>
                      <td>{getCategoryLabel(asset.category)}</td>
                      <td>{asset.name}</td>
                      <td>{asset.serialNo || '-'}</td>
                      <td>{asset.quantity}</td>
                      <td>{asset.assigned || 0}</td>
                      <td>
                        {available}
                        <div className="stock-bar">
                          <div
                            className={`stock-fill ${status.barClass}`}
                            style={{ width: `${asset.quantity > 0 ? (available / asset.quantity) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${status.className}`}>{status.text}</span>
                      </td>
                      <td>{asset.vendor || '-'}</td>
                      <td>{asset.locationName || '-'}</td>
                      <td>
                        <button className="btn btn-edit" onClick={() => openEdit(asset)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => setDeleteConfirm(asset)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {meta.page} of {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>{deleteConfirm.serialNo ? ` (${deleteConfirm.serialNo})` : ''}? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Asset</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Category</label>
                  {renderCategorySelect('category', editForm.category, handleEditFormChange)}
                </div>
                <div className="form-group">
                  <label>Asset Name</label>
                  <input type="text" name="name" value={editForm.name} onChange={handleEditFormChange} required />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Asset Sl. No.{needsSerial(editForm.category) ? ' *' : ''}</label>
                  <input type="text" name="serialNo" value={editForm.serialNo} onChange={handleEditFormChange}
                    placeholder={needsSerial(editForm.category) ? 'Required for this category' : 'Optional'}
                    required={needsSerial(editForm.category)} />
                </div>
                {!needsSerial(editForm.category) && (
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" name="quantity" value={editForm.quantity} onChange={handleEditFormChange} min="0" />
                  </div>
                )}
                {needsSerial(editForm.category) && (
                  <div className="form-group">
                    <label>Asset Company Name</label>
                    <input type="text" name="vendor" value={editForm.vendor} onChange={handleEditFormChange} />
                  </div>
                )}
              </div>
              <div className="form-row-2">
                {!needsSerial(editForm.category) && (
                  <div className="form-group">
                    <label>Asset Company Name</label>
                    <input type="text" name="vendor" value={editForm.vendor} onChange={handleEditFormChange} />
                  </div>
                )}
                <div className="form-group">
                  <label>Location</label>
                  <select name="locationId" value={editForm.locationId} onChange={handleEditFormChange}>
                    <option value="">-- Select Location --</option>
                    {orgLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                {needsSerial(editForm.category) && (
                  <div className="form-group">
                    <label>PO Number</label>
                    <input type="text" name="poNumber" value={editForm.poNumber} onChange={handleEditFormChange} placeholder="e.g. PO-2026-001" />
                  </div>
                )}
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Purchase Date</label>
                  <input type="date" name="purchaseDate" value={editForm.purchaseDate} onChange={handleEditFormChange} />
                </div>
                <div className="form-group">
                  <label>Warranty End</label>
                  <input type="date" name="warrantyEnd" value={editForm.warrantyEnd} onChange={handleEditFormChange} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Notes</label>
                <textarea name="notes" value={editForm.notes} onChange={handleEditFormChange} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
