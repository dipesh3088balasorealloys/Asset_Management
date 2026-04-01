import { useState, useEffect, useCallback } from 'react';
import { usersApi, authApi, locationsApi } from '../services/api';

const emptyRegisterForm = () => ({
  employeeId: '',
  fullName: '',
  email: '',
  password: '',
  role: 'viewer',
  locationIds: [],
});

const emptyEditForm = () => ({
  employeeId: '',
  fullName: '',
  email: '',
  role: 'viewer',
  locationIds: [],
});

export default function UserManagement({ showAlert, user }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [allLocations, setAllLocations] = useState([]);

  // Fetch all locations for assignment
  useEffect(() => {
    locationsApi.list().then(res => setAllLocations(res.data || [])).catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      const res = await usersApi.list(params);
      setUsers(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch {
      showAlert('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, showAlert]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
  };

  const toggleRegisterLocation = (locId) => {
    setRegisterForm(prev => {
      const ids = prev.locationIds.includes(locId)
        ? prev.locationIds.filter(id => id !== locId)
        : [...prev.locationIds, locId];
      return { ...prev, locationIds: ids };
    });
  };

  const toggleEditLocation = (locId) => {
    setEditForm(prev => {
      const ids = prev.locationIds.includes(locId)
        ? prev.locationIds.filter(id => id !== locId)
        : [...prev.locationIds, locId];
      return { ...prev, locationIds: ids };
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      await authApi.register(registerForm);
      showAlert('User registered successfully');
      setRegisterForm(emptyRegisterForm());
      setPage(1);
      fetchUsers();
    } catch (err) {
      showAlert(err?.message || 'Failed to register user', 'error');
    }
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setEditForm({
      employeeId: u.employeeId || '',
      fullName: u.fullName || '',
      email: u.email || '',
      role: u.role || 'viewer',
      locationIds: (u.locations || []).map(l => l.id),
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await usersApi.update(editId, {
        ...editForm,
        email: editForm.email.trim() || null,
        locationIds: editForm.locationIds,
      });
      showAlert('User updated successfully');
      setShowEditModal(false);
      setEditId(null);
      fetchUsers();
    } catch (err) {
      showAlert(err?.message || 'Failed to update user', 'error');
    }
  };

  const handleToggleActive = async (u) => {
    try {
      if (u.isActive) {
        await usersApi.deactivate(u.id);
        showAlert(`${u.fullName} has been deactivated`);
      } else {
        await usersApi.update(u.id, { isActive: true });
        showAlert(`${u.fullName} has been activated`);
      }
      fetchUsers();
    } catch (err) {
      showAlert(err?.message || 'Failed to update user status', 'error');
    }
  };

  const openResetPassword = (u) => {
    setResetUserId(u.id);
    setResetUserName(u.fullName);
    setNewPassword('');
    setShowResetModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      showAlert('Please enter a new password', 'error');
      return;
    }
    try {
      await usersApi.resetPassword(resetUserId, newPassword);
      showAlert(`Password reset successfully for ${resetUserName}`);
      setShowResetModal(false);
      setResetUserId(null);
      setNewPassword('');
    } catch (err) {
      showAlert(err?.message || 'Failed to reset password', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Register User Form */}
      <div className="form-container">
        <h3 className="section-title">Register User</h3>
        <form onSubmit={handleRegisterSubmit}>
          <div className="form-row-4">
            <div className="form-group">
              <label>Employee ID *</label>
              <input
                type="text"
                name="employeeId"
                value={registerForm.employeeId}
                onChange={handleRegisterChange}
                placeholder="e.g. EMP001"
                required
              />
            </div>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={registerForm.fullName}
                onChange={handleRegisterChange}
                placeholder="e.g. Dipesh Mondal"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={registerForm.email}
                onChange={handleRegisterChange}
                placeholder="e.g. dipesh.mondal@balasorealloys.com"
              />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={registerForm.password}
                onChange={handleRegisterChange}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="form-row-4" style={{ marginTop: 10 }}>
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={registerForm.role} onChange={handleRegisterChange}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {registerForm.role !== 'admin' && (
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label>Assigned Locations {registerForm.role !== 'admin' ? '*' : ''}</label>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                  {allLocations.map(loc => (
                    <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={registerForm.locationIds.includes(loc.id)}
                        onChange={() => toggleRegisterLocation(loc.id)}
                      />
                      {loc.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 10 }}>Register User</button>
        </form>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search users by name, employee ID, or email..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* Users Table */}
      <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ width: '100%' }}>
          {loading ? (
            <div className="loading">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="empty-state">No users found</div>
          ) : (
            <table style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '90px' }}>Employee ID</th>
                  <th style={{ minWidth: '140px' }}>Name</th>
                  <th style={{ minWidth: '180px' }}>Email</th>
                  <th style={{ minWidth: '80px' }}>Role</th>
                  <th style={{ minWidth: '120px' }}>Locations</th>
                  <th style={{ minWidth: '70px' }}>Status</th>
                  <th style={{ minWidth: '100px' }}>Last Login</th>
                  <th style={{ minWidth: '220px', position: 'sticky', right: 0, zIndex: 2 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.employeeId || '—'}</strong></td>
                    <td>{u.fullName}</td>
                    <td>{u.email || '—'}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          u.role === 'admin'
                            ? 'status-expired'
                            : u.role === 'manager'
                            ? 'status-expiring'
                            : 'status-pending'
                        }`}
                      >
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </td>
                    <td>
                      {u.role === 'admin' ? (
                        <span style={{ fontSize: '0.78rem', color: '#1a56db' }}>All Locations</span>
                      ) : u.locations && u.locations.length > 0 ? (
                        u.locations.map((l, i) => (
                          <span key={l.id} className="status-badge status-active" style={{ marginRight: 4, marginBottom: 2, fontSize: '0.72rem' }}>
                            {l.code || l.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.78rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${u.isActive ? 'status-active' : 'status-cancelled'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(u.lastLogin)}</td>
                    <td style={{ position: 'sticky', right: 0, background: '#fff', zIndex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', alignItems: 'center' }}>
                        <button className="btn btn-edit" style={{ padding: '5px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap' }} onClick={() => openEdit(u)}>Edit</button>
                        <button
                          className={`btn ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                          style={{ padding: '5px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                          onClick={() => handleToggleActive(u)}
                          disabled={u.id === user?.id}
                          title={u.id === user?.id ? 'Cannot deactivate yourself' : ''}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn"
                          style={{ padding: '5px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap', background: '#7b1fa2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          onClick={() => openResetPassword(u)}
                        >
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {meta.page} of {meta.totalPages} ({meta.total} users)</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit User</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  value={editForm.employeeId}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={editForm.fullName}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Role</label>
                <select name="role" value={editForm.role} onChange={handleEditChange}>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              {editForm.role !== 'admin' && (
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label>Assigned Locations</label>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
                    {allLocations.map(loc => (
                      <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={editForm.locationIds.includes(loc.id)}
                          onChange={() => toggleEditLocation(loc.id)}
                        />
                        {loc.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Password for {resetUserName}</h3>
            <form onSubmit={handleResetPasswordSubmit}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
