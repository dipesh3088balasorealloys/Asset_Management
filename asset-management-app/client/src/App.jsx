import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AssetHub from './pages/AssetHub';
import LicenseCenter from './pages/LicenseCenter';
import Services from './pages/Services';
import Assignments from './pages/Assignments';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import UserManagement from './pages/UserManagement';
import EWaste from './pages/EWaste';
import Backup from './pages/Backup';
import Login from './pages/Login';
import Alert from './components/Alert';
import { getLeafCategories, getNodeLabel } from './config/categoryTree';
import './App.css';

const SECTIONS = {
  dashboard: { title: 'Dashboard', component: Dashboard },
  'asset-hub': { title: 'All Assets', component: AssetHub },
  licenses: { title: 'License Center', component: LicenseCenter },
  services: { title: 'Services', component: Services },
  ewaste: { title: 'E-Waste', component: EWaste },
  'backup-server': { title: 'Backup — Server', component: Backup },
  'backup-db': { title: 'Backup — Database', component: Backup },
  'backup-employee': { title: 'Backup — Employee', component: Backup },
  assignments: { title: 'Assign Assets', component: Assignments },
  reports: { title: 'Reports', component: Reports },
  'audit-log': { title: 'Audit Log', component: AuditLog, adminOnly: true },
  'user-management': { title: 'User Management', component: UserManagement, adminOnly: true },
};

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeCategoryNode, setActiveCategoryNode] = useState('all-assets');
  const [alert, setAlert] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setAuthChecked(true);
  }, []);

  const showAlert = useCallback((message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setActiveSection('dashboard');
  };

  if (!authChecked) return null;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const sectionConfig = SECTIONS[activeSection];
  const isAdminSection = sectionConfig?.adminOnly;
  const isAdmin = user?.role === 'admin';
  const Section = (isAdminSection && !isAdmin) ? Dashboard : (sectionConfig?.component || Dashboard);
  const initials = user.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // Resolve tree node to category filter for AssetHub
  const categoryFilter = getLeafCategories(activeCategoryNode);

  // Dynamic title: show tree node label when on asset-hub
  const pageTitle = activeSection === 'asset-hub'
    ? getNodeLabel(activeCategoryNode)
    : (SECTIONS[activeSection]?.title || 'Dashboard');

  return (
    <div className="app">
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        activeCategoryNode={activeCategoryNode}
        onCategorySelect={setActiveCategoryNode}
        user={user}
      />
      <div className="main-content">
        <div className="header">
          <h1>{pageTitle}</h1>
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{user.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'capitalize' }}>{user.role}</div>
              <div style={{ fontSize: '0.7rem', color: '#1a56db', marginTop: 1 }}>
                {isAdmin ? 'All Locations' : (
                  user.locations && user.locations.length > 0
                    ? user.locations.map(l => l.name).join(', ')
                    : 'No Location'
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: '#666',
                marginLeft: 10,
              }}
            >
              Logout
            </button>
          </div>
        </div>
        {alert && <Alert message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}
        {activeSection === 'asset-hub' ? (
          <Section showAlert={showAlert} user={user} externalCategoryFilter={categoryFilter} activeCategoryNode={activeCategoryNode} />
        ) : activeSection?.startsWith('backup-') ? (
          <Section showAlert={showAlert} user={user} subSection={activeSection.replace('backup-', '')} />
        ) : (
          <Section showAlert={showAlert} user={user} />
        )}
      </div>
    </div>
  );
}

export default App;
