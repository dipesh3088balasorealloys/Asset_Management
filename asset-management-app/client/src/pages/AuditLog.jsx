import React, { useState, useEffect, useCallback, useRef } from 'react';
import { auditApi } from '../services/api';

const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'UNASSIGN', 'IMPORT'];
const ENTITY_TYPE_OPTIONS = [
  'Asset', 'License', 'Service', 'Assignment',
  'EWaste', 'ServerBackup', 'DbBackup', 'EmployeeBackup', 'User',
];

const ACTION_COLORS = {
  CREATE: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  UPDATE: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  DELETE: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  ASSIGN: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  UNASSIGN: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  IMPORT: { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' },
};

const ENTITY_LABELS = {
  Asset: 'Asset',
  License: 'License',
  Service: 'Service',
  Assignment: 'Assignment',
  EWaste: 'E-Waste',
  ServerBackup: 'Server Backup',
  DbBackup: 'DB Backup',
  EmployeeBackup: 'Employee Backup',
  User: 'User',
};

function formatDateTime(d) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }) + ', ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// Convert camelCase key to readable label
function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// Format a value for display
function formatVal(val) {
  if (val === null || val === undefined || val === '') return '-';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export default function AuditLog({ showAlert }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef(null);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filters.action) params.action = filters.action;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.search) params.search = filters.search;

      const res = await auditApi.list(params);
      setLogs(Array.isArray(res.data) ? res.data : []);
      const meta = res.meta || {};
      setTotalPages(meta.totalPages || Math.ceil((meta.total || 0) / limit) || 1);
      setTotalCount(meta.total || 0);
    } catch {
      showAlert('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filters, showAlert]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
    setExpandedRow(null);
  };

  const handleSearchInput = (value) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value.trim() }));
      setPage(1);
      setExpandedRow(null);
    }, 400);
  };

  const clearFilters = () => {
    setFilters({ action: '', entityType: '', startDate: '', endDate: '', search: '' });
    setSearchInput('');
    setPage(1);
    setExpandedRow(null);
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const hasActiveFilters = filters.action || filters.entityType || filters.startDate || filters.endDate || filters.search;

  const renderChanges = (log) => {
    const oldValues = log.oldValues && typeof log.oldValues === 'object' ? log.oldValues : null;
    const newValues = log.newValues && typeof log.newValues === 'object' ? log.newValues : null;

    if (!oldValues && !newValues) {
      return (
        <div style={{ padding: '16px 24px', color: '#888', fontSize: '0.85rem', fontStyle: 'italic' }}>
          No change details recorded for this action.
        </div>
      );
    }

    // For UPDATE: show side-by-side old → new comparison
    if (oldValues && newValues) {
      // Show only fields that were actually changed (present in newValues)
      const updateKeys = Object.keys(newValues).filter((key) => {
        const oldVal = formatVal(oldValues[key]);
        const newVal = formatVal(newValues[key]);
        return oldVal !== newVal;
      });

      if (updateKeys.length === 0) {
        return (
          <div style={{ padding: '16px 24px', color: '#888', fontSize: '0.85rem', fontStyle: 'italic' }}>
            No visible changes detected.
          </div>
        );
      }

      return (
        <div style={{ padding: '16px 24px' }}>
          <div style={{
            fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
            color: '#1e40af', marginBottom: 10,
          }}>
            Changed Fields
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#555', fontWeight: 600, width: '30%' }}>Field</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#991b1b', fontWeight: 600, width: '35%' }}>Previous</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#166534', fontWeight: 600, width: '35%' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {updateKeys.map((key) => (
                <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500, color: '#444' }}>{formatKey(key)}</td>
                  <td style={{ padding: '8px 12px', color: '#991b1b', background: '#fef2f2', borderRadius: 4 }}>{formatVal(oldValues[key])}</td>
                  <td style={{ padding: '8px 12px', color: '#166534', background: '#f0fdf4', borderRadius: 4, fontWeight: 600 }}>{formatVal(newValues[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // For CREATE / DELETE: show a clean key-value table
    const data = newValues || oldValues;
    const isNew = !!newValues;
    // Filter out id (already shown in table) and null/empty fields for cleaner display
    const HIDE_KEYS = ['id', 'isDeleted', 'createdBy'];
    const entries = Object.entries(data).filter(
      ([key, val]) => !HIDE_KEYS.includes(key) && val !== null && val !== undefined && val !== ''
    );

    return (
      <div style={{ padding: '16px 24px' }}>
        <div style={{
          fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
          color: isNew ? '#166534' : '#991b1b', marginBottom: 10,
        }}>
          {isNew ? 'Created With' : 'Deleted Values'}
        </div>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem',
          background: isNew ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${isNew ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 8,
        }}>
          <tbody>
            {entries.map(([key, val]) => (
              <tr key={key} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: '9px 16px', fontWeight: 500, color: '#555', width: 200 }}>{formatKey(key)}</td>
                <td style={{ padding: '9px 16px', color: '#1e3a5f', fontWeight: 500 }}>{formatVal(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      {/* Search + Filters */}
      <div className="form-container" style={{ marginBottom: 20, padding: '18px 20px' }}>
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search audit logs... (user name, action, module, record data)"
            style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', background: '#f8fafc' }}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">All Actions</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Module</label>
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
            >
              <option value="">All Modules</option>
              {ENTITY_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{ENTITY_LABELS[t] || t}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
        {hasActiveFilters && (
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-outline" onClick={clearFilters} style={{ fontSize: '0.8rem' }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 14, fontSize: '0.85rem', color: '#666' }}>
        {totalCount > 0 ? `Showing ${logs.length} of ${totalCount} log entries` : 'No log entries found'}
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <p>No audit log entries found{hasActiveFilters ? ' matching the current filters' : ''}.</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Date/Time</th>
                  <th>Performed By</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Record ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedRow === log.id;
                  const hasChanges = log.oldValues || log.newValues;
                  const actionStyle = ACTION_COLORS[log.action] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        style={{ cursor: hasChanges ? 'pointer' : 'default' }}
                        onClick={() => hasChanges && toggleRow(log.id)}
                      >
                        <td style={{ textAlign: 'center' }}>
                          {hasChanges && (
                            <span style={{
                              display: 'inline-block',
                              transition: 'transform 0.2s',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              fontSize: '0.7rem',
                              color: '#999',
                            }}>
                              {'\u25B6'}
                            </span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#555' }}>
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e3a5f' }}>
                            {log.user?.fullName || '-'}
                          </div>
                          {log.user?.role && (
                            <div style={{ fontSize: '0.73rem', color: '#999', textTransform: 'capitalize', marginTop: 2 }}>
                              {log.user.role}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: 0.3,
                            background: actionStyle.bg,
                            color: actionStyle.color,
                            border: `1px solid ${actionStyle.border}`,
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.88rem', color: '#444' }}>
                          {ENTITY_LABELS[log.entityType] || log.entityType || '-'}
                        </td>
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            color: log.entityId ? '#1e3a5f' : '#ccc',
                            fontWeight: log.entityId ? 600 : 400,
                          }}>
                            {log.entityId || '-'}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{
                            background: '#f8fafc',
                            borderTop: '1px dashed #e2e8f0',
                            padding: 0,
                          }}>
                            {renderChanges(log)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 16 }}>
          <button
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => { setPage((p) => p - 1); setExpandedRow(null); }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: '#666' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => { setPage((p) => p + 1); setExpandedRow(null); }}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
