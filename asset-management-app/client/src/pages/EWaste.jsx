import { useState, useEffect, useCallback, useRef } from 'react';
import { ewasteApi } from '../services/api';
import { formatDate, formatCurrency, todayStr } from '../utils';
import { useDebounce } from '../hooks/useDebounce';

const emptyForm = () => ({
  title: '', billingNumber: '', disposalDate: todayStr(), disposedTo: '',
  disposalCost: '', reason: '', remarks: '',
});

export default function EWaste({ showAlert }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [assetNames, setAssetNames] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [editAssetNames, setEditAssetNames] = useState(['']);
  const [photoModal, setPhotoModal] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const addPhotoRef = useRef(null);
  const debouncedSearch = useDebounce(search, 300);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (sortField) { params.sort = sortField; params.order = sortDir; }
      const res = await ewasteApi.list(params);
      setItems(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch {
      showAlert('Failed to load e-waste records', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, sortField, sortDir, showAlert]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  // Asset names helpers (add form)
  const handleAssetNameChange = (index, value) => {
    const updated = [...assetNames];
    updated[index] = value;
    setAssetNames(updated);
  };
  const addAssetName = () => setAssetNames([...assetNames, '']);
  const removeAssetName = (index) => {
    if (assetNames.length <= 1) return;
    setAssetNames(assetNames.filter((_, i) => i !== index));
  };

  // Asset names helpers (edit form)
  const handleEditAssetNameChange = (index, value) => {
    const updated = [...editAssetNames];
    updated[index] = value;
    setEditAssetNames(updated);
  };
  const addEditAssetName = () => setEditAssetNames([...editAssetNames, '']);
  const removeEditAssetName = (index) => {
    if (editAssetNames.length <= 1) return;
    setEditAssetNames(editAssetNames.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showAlert('E-Waste title is required', 'error');
      return;
    }
    const filteredNames = assetNames.filter((n) => n.trim());
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      if (form.billingNumber) fd.append('billingNumber', form.billingNumber);
      fd.append('assetNames', JSON.stringify(filteredNames));
      if (form.disposalDate) fd.append('disposalDate', form.disposalDate);
      if (form.disposedTo) fd.append('disposedTo', form.disposedTo);
      if (form.disposalCost) fd.append('disposalCost', form.disposalCost);
      if (form.reason) fd.append('reason', form.reason);
      if (form.remarks) fd.append('remarks', form.remarks);
      selectedFiles.forEach((file) => fd.append('photos', file));
      await ewasteApi.create(fd);
      showAlert('E-Waste record added successfully');
      setForm(emptyForm());
      setAssetNames(['']);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPage(1);
      fetchItems();
    } catch {
      showAlert('Failed to add e-waste record', 'error');
    }
  };

  const openEdit = (item) => {
    setEditForm({
      title: item.title || '',
      billingNumber: item.billingNumber || '',
      disposalDate: item.disposalDate ? item.disposalDate.split('T')[0] : '',
      disposedTo: item.disposedTo || '',
      disposalCost: item.disposalCost || '',
      reason: item.reason || '',
      remarks: item.remarks || '',
    });
    // Parse asset_names from JSON
    let names = [''];
    if (item.assetNames) {
      const parsed = typeof item.assetNames === 'string' ? JSON.parse(item.assetNames) : item.assetNames;
      if (Array.isArray(parsed) && parsed.length > 0) names = parsed;
    }
    setEditAssetNames(names);
    setEditModal(item);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const filteredNames = editAssetNames.filter((n) => n.trim());
      await ewasteApi.update(editModal.id, {
        ...editForm,
        assetNames: filteredNames,
      });
      showAlert('E-Waste record updated');
      setEditModal(null);
      fetchItems();
    } catch {
      showAlert('Failed to update record', 'error');
    }
  };

  const confirmDelete = async () => {
    try {
      await ewasteApi.delete(deleteConfirm.id);
      showAlert('E-Waste record deleted');
      setDeleteConfirm(null);
      fetchItems();
    } catch {
      showAlert('Failed to delete record', 'error');
    }
  };

  const openPhotoModal = async (item) => {
    try {
      const res = await ewasteApi.getById(item.id);
      setPhotoModal({ ...res.data });
    } catch {
      showAlert('Failed to load photos', 'error');
    }
  };

  const handleAddPhotos = async (files) => {
    if (!files || files.length === 0 || !photoModal) return;
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('photos', f));
      await ewasteApi.addPhotos(photoModal.id, fd);
      showAlert('Photos uploaded');
      const res = await ewasteApi.getById(photoModal.id);
      setPhotoModal({ ...res.data });
      fetchItems();
    } catch {
      showAlert('Failed to upload photos', 'error');
    }
    if (addPhotoRef.current) addPhotoRef.current.value = '';
  };

  const handleDeletePhoto = async (photoId) => {
    if (!photoModal) return;
    try {
      await ewasteApi.deletePhoto(photoModal.id, photoId);
      showAlert('Photo deleted');
      const res = await ewasteApi.getById(photoModal.id);
      setPhotoModal({ ...res.data });
      fetchItems();
    } catch {
      showAlert('Failed to delete photo', 'error');
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

  const sortIcon = (field) => {
    if (sortField !== field) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const getAssetCount = (item) => {
    if (!item.assetNames) return 0;
    const arr = typeof item.assetNames === 'string' ? JSON.parse(item.assetNames) : item.assetNames;
    return Array.isArray(arr) ? arr.length : 0;
  };

  const getAssetList = (item) => {
    if (!item.assetNames) return [];
    const arr = typeof item.assetNames === 'string' ? JSON.parse(item.assetNames) : item.assetNames;
    return Array.isArray(arr) ? arr : [];
  };

  return (
    <div>
      {/* Add New E-Waste Form */}
      <div className="form-container">
        <h3 className="section-title">Add E-Waste Record (Bulk Disposal)</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row-4">
            <div className="form-group">
              <label>E-Waste Title *</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Q1 2026 IT Disposal" />
            </div>
            <div className="form-group">
              <label>Billing Number</label>
              <input name="billingNumber" value={form.billingNumber} onChange={handleChange} placeholder="e.g. INV-2026-001" />
            </div>
            <div className="form-group">
              <label>Disposal Date</label>
              <input type="date" name="disposalDate" value={form.disposalDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Disposed To</label>
              <input name="disposedTo" value={form.disposedTo} onChange={handleChange} placeholder="Vendor / Organization" />
            </div>
          </div>
          <div className="form-row-4">
            <div className="form-group">
              <label>Disposal Cost / Value</label>
              <input type="number" name="disposalCost" value={form.disposalCost} onChange={handleChange} placeholder="0.00" step="0.01" min="0" />
            </div>
            <div className="form-group">
              <label>Reason</label>
              <input name="reason" value={form.reason} onChange={handleChange} placeholder="Reason for disposal" />
            </div>
            <div className="form-group">
              <label>Remarks</label>
              <input name="remarks" value={form.remarks} onChange={handleChange} placeholder="Additional notes" />
            </div>
            <div className="form-group">
              <label>Photos</label>
              <input type="file" ref={fileInputRef} multiple accept="image/*"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files))} />
              {selectedFiles.length > 0 && (
                <div className="photo-preview-grid">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="photo-preview-item">
                      <img src={URL.createObjectURL(file)} alt={file.name} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bulk Asset Names Input */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>E-Waste Asset Names (Bulk)</label>
            <div className="bulk-asset-names">
              {assetNames.map((name, index) => (
                <div key={index} className="bulk-asset-row">
                  <span className="bulk-asset-index">{index + 1}.</span>
                  <input
                    value={name}
                    onChange={(e) => handleAssetNameChange(index, e.target.value)}
                    placeholder={`Asset name ${index + 1}`}
                  />
                  {assetNames.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeAssetName(index)} title="Remove">&times;</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={addAssetName}>+ Add Asset Name</button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">Add E-Waste</button>
        </form>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          placeholder="Search by title, billing number, disposed to, asset name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-scroll">
          {loading ? (
            <div className="loading">Loading e-waste records...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">No e-waste records found. Add your first record above.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="sortable-th" onClick={() => toggleSort('title')}>Title{sortIcon('title')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('billing_number')}>Billing No.{sortIcon('billing_number')}</th>
                  <th>Assets</th>
                  <th className="sortable-th" onClick={() => toggleSort('disposal_date')}>Disposal Date{sortIcon('disposal_date')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('disposed_to')}>Disposed To{sortIcon('disposed_to')}</th>
                  <th className="sortable-th" onClick={() => toggleSort('disposal_cost')}>Cost / Value{sortIcon('disposal_cost')}</th>
                  <th>Photos</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.title}</strong></td>
                    <td>{item.billingNumber || '-'}</td>
                    <td>
                      <span className="status-badge status-info" title={getAssetList(item).join(', ')}>
                        {getAssetCount(item)} asset{getAssetCount(item) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>{item.disposalDate ? formatDate(item.disposalDate) : '-'}</td>
                    <td>{item.disposedTo || '-'}</td>
                    <td>{item.disposalCost ? formatCurrency(item.disposalCost) : '-'}</td>
                    <td>
                      <span className="photo-count" onClick={() => openPhotoModal(item)} title="View photos">
                        <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
                          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                        </svg>
                        {item.photoCount || 0}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-edit" onClick={() => openEdit(item)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => setDeleteConfirm(item)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {meta.page} of {meta.totalPages} ({meta.total} records)</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit E-Waste Record</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-row-2">
                <div className="form-group">
                  <label>E-Waste Title *</label>
                  <input name="title" value={editForm.title} onChange={handleEditChange} />
                </div>
                <div className="form-group">
                  <label>Billing Number</label>
                  <input name="billingNumber" value={editForm.billingNumber} onChange={handleEditChange} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Disposal Date</label>
                  <input type="date" name="disposalDate" value={editForm.disposalDate} onChange={handleEditChange} />
                </div>
                <div className="form-group">
                  <label>Disposed To</label>
                  <input name="disposedTo" value={editForm.disposedTo} onChange={handleEditChange} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Disposal Cost / Value</label>
                  <input type="number" name="disposalCost" value={editForm.disposalCost} onChange={handleEditChange} step="0.01" min="0" />
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <input name="reason" value={editForm.reason} onChange={handleEditChange} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Remarks</label>
                  <input name="remarks" value={editForm.remarks} onChange={handleEditChange} />
                </div>
              </div>

              {/* Bulk Asset Names in Edit */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>E-Waste Asset Names (Bulk)</label>
                <div className="bulk-asset-names">
                  {editAssetNames.map((name, index) => (
                    <div key={index} className="bulk-asset-row">
                      <span className="bulk-asset-index">{index + 1}.</span>
                      <input
                        value={name}
                        onChange={(e) => handleEditAssetNameChange(index, e.target.value)}
                        placeholder={`Asset name ${index + 1}`}
                      />
                      {editAssetNames.length > 1 && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEditAssetName(index)} title="Remove">&times;</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addEditAssetName}>+ Add Asset Name</button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      {photoModal && (
        <div className="modal-overlay" onClick={() => setPhotoModal(null)}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>Photos - {photoModal.title}</h3>
            <div className="photo-gallery-grid">
              {(!photoModal.photos || photoModal.photos.length === 0) ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>No photos uploaded</div>
              ) : (
                photoModal.photos.map((photo) => (
                  <div key={photo.id} className="photo-gallery-item">
                    <img src={`/${photo.filePath}`} alt={photo.originalName || 'Photo'} />
                    <div className="photo-info">
                      <span className="photo-type-badge">{photo.photoType}</span>
                      <button className="photo-gallery-delete" onClick={() => handleDeletePhoto(photo.id)} title="Remove photo">&times;</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="photo-upload-area" onClick={() => addPhotoRef.current?.click()}>
              <input type="file" ref={addPhotoRef} multiple accept="image/*"
                onChange={(e) => handleAddPhotos(e.target.files)} />
              Click to add more photos
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPhotoModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.title}</strong>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
