import { useState } from 'react';
import { ASSET_CATEGORY_TREE } from '../config/categoryTree';

const OTHER_NAV_ITEMS = [
  { id: 'licenses', label: 'License Center', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
  { id: 'services', label: 'Services', icon: 'M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z' },
  { id: 'ewaste', label: 'E-Waste', icon: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z' },
];

const BACKUP_CHILDREN = [
  { id: 'backup-server', label: 'Server Backup' },
  { id: 'backup-db', label: 'DB Backup' },
  { id: 'backup-employee', label: 'Employee Backup' },
];

const OPS_ITEMS = [
  { id: 'assignments', label: 'Assign Assets', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
  { id: 'reports', label: 'Reports', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z' },
];

const ADMIN_ITEMS = [
  { id: 'audit-log', label: 'Audit Log', icon: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
  { id: 'user-management', label: 'User Management', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
];

function TreeNode({ node, depth, activeCategoryNode, onCategorySelect, expanded, onToggle }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded[node.id];
  const isActive = activeCategoryNode === node.id;

  const handleClick = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node.id);
    }
    onCategorySelect(node.id);
  };

  return (
    <>
      <div
        className={`tree-node tree-depth-${depth} ${isActive ? 'active' : ''}`}
        onClick={handleClick}
      >
        <span
          className={`tree-toggle ${hasChildren ? (isExpanded ? 'expanded' : '') : 'leaf'}`}
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              onToggle(node.id);
            }
          }}
        >
          {hasChildren ? '▶' : '•'}
        </span>
        <span className="tree-label">{node.label}</span>
      </div>
      {hasChildren && isExpanded && node.children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          activeCategoryNode={activeCategoryNode}
          onCategorySelect={onCategorySelect}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

function NavItem({ item, active, onClick }) {
  return (
    <li className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path d={item.icon} />
      </svg>
      <span>{item.label}</span>
    </li>
  );
}

export default function Sidebar({ activeSection, onNavigate, activeCategoryNode, onCategorySelect, user }) {
  const isAdmin = user?.role === 'admin';
  const [expanded, setExpanded] = useState({
    'all-assets': true,
    'assets': true,
    'components': false,
  });
  const [backupOpen, setBackupOpen] = useState(
    activeSection?.startsWith('backup-') || false
  );

  const handleToggle = (nodeId) => {
    setExpanded((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleTreeNodeClick = (nodeId) => {
    onCategorySelect(nodeId);
    // Navigate to asset-hub section when clicking any tree node
    if (activeSection !== 'asset-hub') {
      onNavigate('asset-hub');
    }
  };

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/BAL_logo.png" alt="BAL Logo" className="logo-img" />
        <div className="logo-text">
          <span>Infra ManageEngine</span>
        </div>
      </div>
      <ul className="nav-menu">
        {/* Dashboard */}
        <li
          className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
          <span>Dashboard</span>
        </li>

        {/* Inventory label */}
        <div className="nav-label">Inventory</div>

        {/* Asset Category Tree */}
        <div className="asset-tree">
          {ASSET_CATEGORY_TREE.map((rootNode) => (
            <TreeNode
              key={rootNode.id}
              node={rootNode}
              depth={0}
              activeCategoryNode={activeCategoryNode}
              onCategorySelect={handleTreeNodeClick}
              expanded={expanded}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Other inventory items */}
        {OTHER_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={activeSection === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}

        {/* Backup — collapsible parent with 3 children */}
        <li
          className={`nav-item ${activeSection?.startsWith('backup-') ? 'active' : ''}`}
          onClick={() => setBackupOpen((prev) => !prev)}
        >
          <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
          </svg>
          <span>Backup</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', opacity: 0.6, transition: 'transform 0.2s', transform: backupOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        </li>
        {backupOpen && BACKUP_CHILDREN.map((child) => (
          <li
            key={child.id}
            className={`nav-item nav-child ${activeSection === child.id ? 'active' : ''}`}
            onClick={() => onNavigate(child.id)}
          >
            <span style={{ width: 20 }} />
            <span style={{ fontSize: '0.85rem' }}>{child.label}</span>
          </li>
        ))}

        {/* Operations */}
        <div className="nav-label">Operations</div>
        {OPS_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={activeSection === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}

        {/* Admin — only visible to admin users */}
        {isAdmin && (
          <>
            <div className="nav-label">Admin</div>
            {ADMIN_ITEMS.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={activeSection === item.id}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
