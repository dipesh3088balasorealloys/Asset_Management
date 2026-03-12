import { useState, useEffect, useCallback } from 'react';
import { backupApi } from '../services/api';
import { formatDate, todayStr } from '../utils';
import { useDebounce } from '../hooks/useDebounce';

const TABS = [
  { id: 'server', label: 'Server Backup' },
  { id: 'db', label: 'DB Backup' },
  { id: 'employee', label: 'Employee Backup' },
];

const BACKUP_TYPES = ['Full', 'Incremental', 'Differential'];
const DB_BACKUP_TYPES = ['Full', 'Incremental', 'Differential', 'Log'];
const SCHEDULES = ['Daily', 'Weekly', 'Monthly'];
const STORAGE_LOCATIONS = ['Local', 'NAS', 'Cloud', 'Tape'];
const STATUSES = ['Success', 'Failed', 'Partial'];
const DB_ENGINES = ['MySQL', 'PostgreSQL', 'MSSQL', 'Oracle', 'MongoDB', 'Other'];

function statusBadge(s) {
  const map = { Success: 'status-active', Failed: 'status-expired', Partial: 'status-expiring' };
  return map[s] || '';
}

function BoolBadge({ value }) {
  return value ? (
    <span className="status-badge status-active">Yes</span>
  ) : (
    <span className="status-badge status-expired">No</span>
  );
}

// ==================== SERVER BACKUP TAB ====================
function ServerBackupTab({ showAlert }) {
  const emptyForm = () => ({
    serverName: '', serverIp: '', backupType: 'Full', backupSchedule: 'Daily',
    storageLocation: 'Local', storagePath: '', lastBackupDate: todayStr(),
    lastBackupStatus: 'Success', backupSizeGb: '', retentionDays: '',
    responsiblePerson: '', remarks: '',
  });

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const debouncedSearch = useDebounce(search, 300);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (sortField) { params.sort = sortField; params.order = sortDir; }
      const res = await backupApi.listServer(params);
      setItems(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch { showAlert('Failed to load server backups', 'error'); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, sortField, sortDir, showAlert]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.serverName.trim()) { showAlert('Server name is required', 'error'); return; }
    try {
      await backupApi.createServer(form);
      showAlert('Server backup record added!');
      setForm(emptyForm());
      setPage(1);
      fetchItems();
    } catch { showAlert('Failed to add record', 'error'); }
  };

  const openEdit = (item) => {
    setEditForm({
      serverName: item.serverName || '', serverIp: item.serverIp || '',
      backupType: item.backupType || 'Full', backupSchedule: item.backupSchedule || 'Daily',
      storageLocation: item.storageLocation || 'Local', storagePath: item.storagePath || '',
      lastBackupDate: item.lastBackupDate ? item.lastBackupDate.split('T')[0] : '',
      lastBackupStatus: item.lastBackupStatus || 'Success',
      backupSizeGb: item.backupSizeGb || '', retentionDays: item.retentionDays || '',
      responsiblePerson: item.responsiblePerson || '', remarks: item.remarks || '',
    });
    setEditModal(item);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await backupApi.updateServer(editModal.id, editForm);
      showAlert('Server backup updated');
      setEditModal(null);
      fetchItems();
    } catch { showAlert('Failed to update', 'error'); }
  };

  const confirmDelete = async () => {
    try {
      await backupApi.deleteServer(deleteConfirm.id);
      showAlert('Record deleted');
      setDeleteConfirm(null);
      fetchItems();
    } catch { showAlert('Failed to delete', 'error'); }
  };

  const toggleSort = (f) => { if (sortField === f) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } };
  const sortIcon = (f) => sortField !== f ? ' \u2195' : sortDir === 'asc' ? ' \u2191' : ' \u2193';

  return (
    <>
      <div className="form-container">
        <h3 className="section-title">Add Server Backup</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row-4">
            <div className="form-group"><label>Server Name *</label><input name="serverName" value={form.serverName} onChange={handleChange} placeholder="e.g. PROD-DB-01" /></div>
            <div className="form-group"><label>Server IP</label><input name="serverIp" value={form.serverIp} onChange={handleChange} placeholder="192.168.1.100" /></div>
            <div className="form-group"><label>Backup Type</label><select name="backupType" value={form.backupType} onChange={handleChange}>{BACKUP_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label>Schedule</label><select name="backupSchedule" value={form.backupSchedule} onChange={handleChange}>{SCHEDULES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="form-row-4">
            <div className="form-group"><label>Storage Location</label><select name="storageLocation" value={form.storageLocation} onChange={handleChange}>{STORAGE_LOCATIONS.map(l => <option key={l}>{l}</option>)}</select></div>
            <div className="form-group"><label>Storage Path</label><input name="storagePath" value={form.storagePath} onChange={handleChange} placeholder="/backups/server/" /></div>
            <div className="form-group"><label>Last Backup Date</label><input type="date" name="lastBackupDate" value={form.lastBackupDate} onChange={handleChange} /></div>
            <div className="form-group"><label>Status</label><select name="lastBackupStatus" value={form.lastBackupStatus} onChange={handleChange}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="form-row-4">
            <div className="form-group"><label>Size (GB)</label><input type="number" name="backupSizeGb" value={form.backupSizeGb} onChange={handleChange} step="0.01" min="0" /></div>
            <div className="form-group"><label>Retention (days)</label><input type="number" name="retentionDays" value={form.retentionDays} onChange={handleChange} min="1" /></div>
            <div className="form-group"><label>Responsible Person</label><input name="responsiblePerson" value={form.responsiblePerson} onChange={handleChange} /></div>
            <div className="form-group"><label>Remarks</label><input name="remarks" value={form.remarks} onChange={handleChange} placeholder="Additional notes" /></div>
          </div>
          <button type="submit" className="btn btn-primary">Add Record</button>
        </form>
      </div>

      <div className="search-bar">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by server name, IP, responsible person..." />
      </div>

      <div className="table-container">
        <div className="table-scroll">
        {loading ? <div className="loading">Loading server backups...</div> : items.length === 0 ? <div className="empty-state">No server backup records found. Add your first record above.</div> : (
          <table><thead><tr>
            <th className="sortable-th" onClick={() => toggleSort('server_name')}>Server{sortIcon('server_name')}</th>
            <th>IP</th><th>Type</th><th>Schedule</th><th>Storage</th>
            <th className="sortable-th" onClick={() => toggleSort('last_backup_date')}>Last Backup{sortIcon('last_backup_date')}</th>
            <th className="sortable-th" onClick={() => toggleSort('last_backup_status')}>Status{sortIcon('last_backup_status')}</th>
            <th className="sortable-th" onClick={() => toggleSort('backup_size_gb')}>Size (GB){sortIcon('backup_size_gb')}</th>
            <th>Actions</th>
          </tr></thead><tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><strong>{item.serverName}</strong></td>
                <td>{item.serverIp || '-'}</td>
                <td>{item.backupType}</td>
                <td>{item.backupSchedule}</td>
                <td>{item.storageLocation}</td>
                <td>{item.lastBackupDate ? formatDate(item.lastBackupDate) : '-'}</td>
                <td><span className={`status-badge ${statusBadge(item.lastBackupStatus)}`}>{item.lastBackupStatus}</span></td>
                <td>{item.backupSizeGb || '-'}</td>
                <td>
                  <button className="btn btn-edit" onClick={() => openEdit(item)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => setDeleteConfirm(item)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody></table>
        )}
        </div>
      </div>

      {meta.totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {meta.page} of {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Server Backup</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-row-4">
                <div className="form-group"><label>Server Name</label><input name="serverName" value={editForm.serverName} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Server IP</label><input name="serverIp" value={editForm.serverIp} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Backup Type</label><select name="backupType" value={editForm.backupType} onChange={handleEditChange}>{BACKUP_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="form-group"><label>Schedule</label><select name="backupSchedule" value={editForm.backupSchedule} onChange={handleEditChange}>{SCHEDULES.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="form-row-4">
                <div className="form-group"><label>Storage Location</label><select name="storageLocation" value={editForm.storageLocation} onChange={handleEditChange}>{STORAGE_LOCATIONS.map(l => <option key={l}>{l}</option>)}</select></div>
                <div className="form-group"><label>Storage Path</label><input name="storagePath" value={editForm.storagePath} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Last Backup Date</label><input type="date" name="lastBackupDate" value={editForm.lastBackupDate} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Status</label><select name="lastBackupStatus" value={editForm.lastBackupStatus} onChange={handleEditChange}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="form-row-4">
                <div className="form-group"><label>Size (GB)</label><input type="number" name="backupSizeGb" value={editForm.backupSizeGb} onChange={handleEditChange} step="0.01" min="0" /></div>
                <div className="form-group"><label>Retention (days)</label><input type="number" name="retentionDays" value={editForm.retentionDays} onChange={handleEditChange} min="1" /></div>
                <div className="form-group"><label>Responsible Person</label><input name="responsiblePerson" value={editForm.responsiblePerson} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Remarks</label><input name="remarks" value={editForm.remarks} onChange={handleEditChange} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>Delete <strong>{deleteConfirm.serverName}</strong>?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== DB BACKUP TAB ====================
function DbBackupTab({ showAlert }) {
  const emptyForm = () => ({
    databaseName: '', serverName: '', dbEngine: 'MySQL', backupType: 'Full',
    backupSchedule: 'Daily', storageLocation: 'Local', storagePath: '',
    lastBackupDate: todayStr(), lastBackupStatus: 'Success', backupSizeGb: '',
    retentionDays: '', responsiblePerson: '', remarks: '',
  });

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const debouncedSearch = useDebounce(search, 300);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (sortField) { params.sort = sortField; params.order = sortDir; }
      const res = await backupApi.listDb(params);
      setItems(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch { showAlert('Failed to load DB backups', 'error'); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, sortField, sortDir, showAlert]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.databaseName.trim()) { showAlert('Database name is required', 'error'); return; }
    try {
      await backupApi.createDb(form);
      showAlert('DB backup record added!');
      setForm(emptyForm());
      setPage(1);
      fetchItems();
    } catch { showAlert('Failed to add record', 'error'); }
  };

  const openEdit = (item) => {
    setEditForm({
      databaseName: item.databaseName || '', serverName: item.serverName || '',
      dbEngine: item.dbEngine || 'MySQL', backupType: item.backupType || 'Full',
      backupSchedule: item.backupSchedule || 'Daily', storageLocation: item.storageLocation || 'Local',
      storagePath: item.storagePath || '',
      lastBackupDate: item.lastBackupDate ? item.lastBackupDate.split('T')[0] : '',
      lastBackupStatus: item.lastBackupStatus || 'Success',
      backupSizeGb: item.backupSizeGb || '', retentionDays: item.retentionDays || '',
      responsiblePerson: item.responsiblePerson || '', remarks: item.remarks || '',
    });
    setEditModal(item);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try { await backupApi.updateDb(editModal.id, editForm); showAlert('DB backup updated'); setEditModal(null); fetchItems(); }
    catch { showAlert('Failed to update', 'error'); }
  };

  const confirmDelete = async () => {
    try { await backupApi.deleteDb(deleteConfirm.id); showAlert('Record deleted'); setDeleteConfirm(null); fetchItems(); }
    catch { showAlert('Failed to delete', 'error'); }
  };

  const toggleSort = (f) => { if (sortField === f) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } };
  const sortIcon = (f) => sortField !== f ? ' \u2195' : sortDir === 'asc' ? ' \u2191' : ' \u2193';

  return (
    <>
      <div className="form-container">
        <h3 className="section-title">Add DB Backup</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row-4">
            <div className="form-group"><label>Database Name *</label><input name="databaseName" value={form.databaseName} onChange={handleChange} placeholder="e.g. asset_mgmt" /></div>
            <div className="form-group"><label>Server Name / Host</label><input name="serverName" value={form.serverName} onChange={handleChange} placeholder="localhost" /></div>
            <div className="form-group"><label>DB Engine</label><select name="dbEngine" value={form.dbEngine} onChange={handleChange}>{DB_ENGINES.map(e => <option key={e}>{e}</option>)}</select></div>
            <div className="form-group"><label>Backup Type</label><select name="backupType" value={form.backupType} onChange={handleChange}>{DB_BACKUP_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="form-row-4">
            <div className="form-group"><label>Schedule</label><select name="backupSchedule" value={form.backupSchedule} onChange={handleChange}>{SCHEDULES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="form-group"><label>Storage Location</label><select name="storageLocation" value={form.storageLocation} onChange={handleChange}>{STORAGE_LOCATIONS.map(l => <option key={l}>{l}</option>)}</select></div>
            <div className="form-group"><label>Storage Path</label><input name="storagePath" value={form.storagePath} onChange={handleChange} /></div>
            <div className="form-group"><label>Last Backup Date</label><input type="date" name="lastBackupDate" value={form.lastBackupDate} onChange={handleChange} /></div>
          </div>
          <div className="form-row-4">
            <div className="form-group"><label>Status</label><select name="lastBackupStatus" value={form.lastBackupStatus} onChange={handleChange}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="form-group"><label>Size (GB)</label><input type="number" name="backupSizeGb" value={form.backupSizeGb} onChange={handleChange} step="0.01" min="0" /></div>
            <div className="form-group"><label>Retention (days)</label><input type="number" name="retentionDays" value={form.retentionDays} onChange={handleChange} min="1" /></div>
            <div className="form-group"><label>Responsible Person</label><input name="responsiblePerson" value={form.responsiblePerson} onChange={handleChange} /></div>
          </div>
          <button type="submit" className="btn btn-primary">Add Record</button>
        </form>
      </div>

      <div className="search-bar">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by database name, server, responsible person..." />
      </div>

      <div className="table-container">
        <div className="table-scroll">
        {loading ? <div className="loading">Loading DB backups...</div> : items.length === 0 ? <div className="empty-state">No DB backup records found. Add your first record above.</div> : (
          <table><thead><tr>
            <th className="sortable-th" onClick={() => toggleSort('database_name')}>Database{sortIcon('database_name')}</th>
            <th>Server</th>
            <th className="sortable-th" onClick={() => toggleSort('db_engine')}>Engine{sortIcon('db_engine')}</th>
            <th>Type</th><th>Schedule</th>
            <th className="sortable-th" onClick={() => toggleSort('last_backup_date')}>Last Backup{sortIcon('last_backup_date')}</th>
            <th className="sortable-th" onClick={() => toggleSort('last_backup_status')}>Status{sortIcon('last_backup_status')}</th>
            <th>Size (GB)</th><th>Actions</th>
          </tr></thead><tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><strong>{item.databaseName}</strong></td>
                <td>{item.serverName || '-'}</td>
                <td><span className="status-badge status-pending">{item.dbEngine}</span></td>
                <td>{item.backupType}</td>
                <td>{item.backupSchedule}</td>
                <td>{item.lastBackupDate ? formatDate(item.lastBackupDate) : '-'}</td>
                <td><span className={`status-badge ${statusBadge(item.lastBackupStatus)}`}>{item.lastBackupStatus}</span></td>
                <td>{item.backupSizeGb || '-'}</td>
                <td>
                  <button className="btn btn-edit" onClick={() => openEdit(item)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => setDeleteConfirm(item)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody></table>
        )}
        </div>
      </div>

      {meta.totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {meta.page} of {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit DB Backup</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-row-4">
                <div className="form-group"><label>Database Name</label><input name="databaseName" value={editForm.databaseName} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Server</label><input name="serverName" value={editForm.serverName} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Engine</label><select name="dbEngine" value={editForm.dbEngine} onChange={handleEditChange}>{DB_ENGINES.map(e => <option key={e}>{e}</option>)}</select></div>
                <div className="form-group"><label>Type</label><select name="backupType" value={editForm.backupType} onChange={handleEditChange}>{DB_BACKUP_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="form-row-4">
                <div className="form-group"><label>Schedule</label><select name="backupSchedule" value={editForm.backupSchedule} onChange={handleEditChange}>{SCHEDULES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="form-group"><label>Storage Location</label><select name="storageLocation" value={editForm.storageLocation} onChange={handleEditChange}>{STORAGE_LOCATIONS.map(l => <option key={l}>{l}</option>)}</select></div>
                <div className="form-group"><label>Storage Path</label><input name="storagePath" value={editForm.storagePath} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Last Backup</label><input type="date" name="lastBackupDate" value={editForm.lastBackupDate} onChange={handleEditChange} /></div>
              </div>
              <div className="form-row-4">
                <div className="form-group"><label>Status</label><select name="lastBackupStatus" value={editForm.lastBackupStatus} onChange={handleEditChange}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="form-group"><label>Size (GB)</label><input type="number" name="backupSizeGb" value={editForm.backupSizeGb} onChange={handleEditChange} step="0.01" /></div>
                <div className="form-group"><label>Retention</label><input type="number" name="retentionDays" value={editForm.retentionDays} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Remarks</label><input name="remarks" value={editForm.remarks} onChange={handleEditChange} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3><p>Delete <strong>{deleteConfirm.databaseName}</strong>?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== EMPLOYEE BACKUP TAB ====================
function EmployeeBackupTab({ showAlert }) {
  const emptyForm = () => ({
    slNo: '', emailId: '', userName: '', emailBackup: false,
    onedriveBackup: false, desktopLaptopBackup: false, diskName: '', remarks: '',
  });

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const debouncedSearch = useDebounce(search, 300);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (sortField) { params.sort = sortField; params.order = sortDir; }
      const res = await backupApi.listEmployee(params);
      setItems(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch { showAlert('Failed to load employee backups', 'error'); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, sortField, sortDir, showAlert]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({ ...editForm, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.emailId.trim() || !form.userName.trim()) { showAlert('Email and user name are required', 'error'); return; }
    try {
      await backupApi.createEmployee(form);
      showAlert('Employee backup record added!');
      setForm(emptyForm());
      setPage(1);
      fetchItems();
    } catch { showAlert('Failed to add record', 'error'); }
  };

  const openEdit = (item) => {
    setEditForm({
      slNo: item.slNo || '', emailId: item.emailId || '', userName: item.userName || '',
      emailBackup: !!item.emailBackup, onedriveBackup: !!item.onedriveBackup,
      desktopLaptopBackup: !!item.desktopLaptopBackup,
      diskName: item.diskName || '', remarks: item.remarks || '',
    });
    setEditModal(item);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try { await backupApi.updateEmployee(editModal.id, editForm); showAlert('Employee backup updated'); setEditModal(null); fetchItems(); }
    catch { showAlert('Failed to update', 'error'); }
  };

  const confirmDelete = async () => {
    try { await backupApi.deleteEmployee(deleteConfirm.id); showAlert('Record deleted'); setDeleteConfirm(null); fetchItems(); }
    catch { showAlert('Failed to delete', 'error'); }
  };

  const toggleSort = (f) => { if (sortField === f) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } };
  const sortIcon = (f) => sortField !== f ? ' \u2195' : sortDir === 'asc' ? ' \u2191' : ' \u2193';

  return (
    <>
      <div className="form-container">
        <h3 className="section-title">Add Employee Backup</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row-4">
            <div className="form-group"><label>Sl. No.</label><input type="number" name="slNo" value={form.slNo} onChange={handleChange} min="1" /></div>
            <div className="form-group"><label>Email ID *</label><input type="email" name="emailId" value={form.emailId} onChange={handleChange} placeholder="user@company.com" /></div>
            <div className="form-group"><label>User Name *</label><input name="userName" value={form.userName} onChange={handleChange} placeholder="Full name" /></div>
            <div className="form-group"><label>Disk Name</label><input name="diskName" value={form.diskName} onChange={handleChange} placeholder="e.g. Disk-A" /></div>
          </div>
          <div className="form-row-4">
            <div className="form-group-checkbox">
              <input type="checkbox" id="emailBackup" name="emailBackup" checked={form.emailBackup} onChange={handleChange} />
              <label htmlFor="emailBackup">Email Backup</label>
            </div>
            <div className="form-group-checkbox">
              <input type="checkbox" id="onedriveBackup" name="onedriveBackup" checked={form.onedriveBackup} onChange={handleChange} />
              <label htmlFor="onedriveBackup">OneDrive Backup</label>
            </div>
            <div className="form-group-checkbox">
              <input type="checkbox" id="desktopLaptopBackup" name="desktopLaptopBackup" checked={form.desktopLaptopBackup} onChange={handleChange} />
              <label htmlFor="desktopLaptopBackup">Desktop/Laptop Backup</label>
            </div>
            <div className="form-group"><label>Remarks</label><input name="remarks" value={form.remarks} onChange={handleChange} placeholder="Additional notes" /></div>
          </div>
          <button type="submit" className="btn btn-primary">Add Record</button>
        </form>
      </div>

      <div className="search-bar">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, email, disk name..." />
      </div>

      <div className="table-container">
        <div className="table-scroll">
        {loading ? <div className="loading">Loading employee backups...</div> : items.length === 0 ? <div className="empty-state">No employee backup records found. Add your first record above.</div> : (
          <table><thead><tr>
            <th className="sortable-th" onClick={() => toggleSort('sl_no')}>Sl.No{sortIcon('sl_no')}</th>
            <th className="sortable-th" onClick={() => toggleSort('email_id')}>Email{sortIcon('email_id')}</th>
            <th className="sortable-th" onClick={() => toggleSort('user_name')}>User Name{sortIcon('user_name')}</th>
            <th>Email Backup</th><th>OneDrive</th><th>Desktop/Laptop</th>
            <th>Disk Name</th><th>Remarks</th><th>Actions</th>
          </tr></thead><tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.slNo || '-'}</td>
                <td>{item.emailId}</td>
                <td><strong>{item.userName}</strong></td>
                <td><BoolBadge value={item.emailBackup} /></td>
                <td><BoolBadge value={item.onedriveBackup} /></td>
                <td><BoolBadge value={item.desktopLaptopBackup} /></td>
                <td>{item.diskName || '-'}</td>
                <td>{item.remarks || '-'}</td>
                <td>
                  <button className="btn btn-edit" onClick={() => openEdit(item)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => setDeleteConfirm(item)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody></table>
        )}
        </div>
      </div>

      {meta.totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {meta.page} of {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Employee Backup</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-row-4">
                <div className="form-group"><label>Sl. No.</label><input type="number" name="slNo" value={editForm.slNo} onChange={handleEditChange} min="1" /></div>
                <div className="form-group"><label>Email ID</label><input type="email" name="emailId" value={editForm.emailId} onChange={handleEditChange} /></div>
                <div className="form-group"><label>User Name</label><input name="userName" value={editForm.userName} onChange={handleEditChange} /></div>
                <div className="form-group"><label>Disk Name</label><input name="diskName" value={editForm.diskName} onChange={handleEditChange} /></div>
              </div>
              <div className="form-row-4">
                <div className="form-group-checkbox">
                  <input type="checkbox" id="editEmailBackup" name="emailBackup" checked={editForm.emailBackup} onChange={handleEditChange} />
                  <label htmlFor="editEmailBackup">Email Backup</label>
                </div>
                <div className="form-group-checkbox">
                  <input type="checkbox" id="editOnedriveBackup" name="onedriveBackup" checked={editForm.onedriveBackup} onChange={handleEditChange} />
                  <label htmlFor="editOnedriveBackup">OneDrive Backup</label>
                </div>
                <div className="form-group-checkbox">
                  <input type="checkbox" id="editDesktopLaptopBackup" name="desktopLaptopBackup" checked={editForm.desktopLaptopBackup} onChange={handleEditChange} />
                  <label htmlFor="editDesktopLaptopBackup">Desktop/Laptop Backup</label>
                </div>
                <div className="form-group"><label>Remarks</label><input name="remarks" value={editForm.remarks} onChange={handleEditChange} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3><p>Delete <strong>{deleteConfirm.userName}</strong>?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== MAIN BACKUP COMPONENT ====================
export default function Backup({ showAlert, subSection }) {
  const [activeTab, setActiveTab] = useState(subSection || 'server');

  useEffect(() => {
    if (subSection) setActiveTab(subSection);
  }, [subSection]);

  return (
    <>
      <div className="category-tabs" style={{ marginBottom: 25 }}>
        {TABS.map((tab) => (
          <span key={tab.id} className={`category-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </span>
        ))}
      </div>

      {activeTab === 'server' && <ServerBackupTab showAlert={showAlert} />}
      {activeTab === 'db' && <DbBackupTab showAlert={showAlert} />}
      {activeTab === 'employee' && <EmployeeBackupTab showAlert={showAlert} />}
    </>
  );
}
