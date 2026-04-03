import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.reload();
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Assets
export const assetsApi = {
  list: (params) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
};

// Licenses
export const licensesApi = {
  list: (params) => api.get('/licenses', { params }),
  getById: (id) => api.get(`/licenses/${id}`),
  create: (data) => api.post('/licenses', data),
  update: (id, data) => api.put(`/licenses/${id}`, data),
  delete: (id) => api.delete(`/licenses/${id}`),
};

// Services
export const servicesApi = {
  list: (params) => api.get('/services', { params }),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

// Assignments
export const assignmentsApi = {
  list: (params) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
};

// Employees (external lookup)
export const employeesApi = {
  lookup: (empId) => api.get(`/employees/lookup/${encodeURIComponent(empId)}`),
};

// Locations
export const locationsApi = {
  list: () => api.get('/locations'),
};

// Reports
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  assetUtilization: () => api.get('/reports/asset-utilization'),
  licenseUtilization: () => api.get('/reports/license-utilization'),
  serviceCosts: () => api.get('/reports/service-costs'),
  employeeSummary: () => api.get('/reports/employee-summary'),
  renewals: (days) => api.get('/reports/renewals', { params: { days } }),
  locationSummary: () => api.get('/reports/location-summary'),
};

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Users
export const usersApi = {
  list: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  deactivate: (id) => api.put(`/users/${id}/deactivate`),
};

// Audit Logs
export const auditApi = {
  list: (params) => api.get('/audit-logs', { params }),
  entityHistory: (entityType, entityId) => api.get(`/audit-logs/entity/${entityType}/${entityId}`),
};

// Import
export const importApi = {
  assets: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/import/assets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  licenses: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/import/licenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  services: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/import/services', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  assignments: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/import/assignments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  downloadTemplate: async (type) => {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`/api/import/template/${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Template download failed');
    const blob = await res.blob();
    const filename = `import-${type}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// Export — these return blob downloads, so we use axios directly
export const exportApi = {
  download: async (entity, format = 'csv') => {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`/api/export/${entity}?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');
    const filename = disposition?.match(/filename="?(.+?)"?$/)?.[1] || `${entity}.${format}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  downloadReport: async (reportType, format = 'csv') => {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`/api/export/report/${reportType}?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Report export failed');
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');
    const filename = disposition?.match(/filename="?(.+?)"?$/)?.[1] || `${reportType}-report.${format}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// E-Waste
export const ewasteApi = {
  list: (params) => api.get('/ewaste', { params }),
  getById: (id) => api.get(`/ewaste/${id}`),
  create: (formData) => api.post('/ewaste', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/ewaste/${id}`, data),
  delete: (id) => api.delete(`/ewaste/${id}`),
  addPhotos: (id, formData) => api.post(`/ewaste/${id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePhoto: (id, photoId) => api.delete(`/ewaste/${id}/photos/${photoId}`),
};

// Backups
export const backupApi = {
  listServer: (params) => api.get('/backups/server', { params }),
  getServer: (id) => api.get(`/backups/server/${id}`),
  createServer: (data) => api.post('/backups/server', data),
  updateServer: (id, data) => api.put(`/backups/server/${id}`, data),
  deleteServer: (id) => api.delete(`/backups/server/${id}`),
  listDb: (params) => api.get('/backups/db', { params }),
  getDb: (id) => api.get(`/backups/db/${id}`),
  createDb: (data) => api.post('/backups/db', data),
  updateDb: (id, data) => api.put(`/backups/db/${id}`, data),
  deleteDb: (id) => api.delete(`/backups/db/${id}`),
  listEmployee: (params) => api.get('/backups/employee', { params }),
  getEmployee: (id) => api.get(`/backups/employee/${id}`),
  createEmployee: (data) => api.post('/backups/employee', data),
  updateEmployee: (id, data) => api.put(`/backups/employee/${id}`, data),
  deleteEmployee: (id) => api.delete(`/backups/employee/${id}`),
};

export default api;
