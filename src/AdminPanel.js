import React, { useState } from 'react';
import { styles } from './utils/styles';

// Import all panel components from their respective folders
import { 
  GRNPanel, 
  PurchaseReturnPanel, 
  ProductCatalogPanel, 
  ReorderPanel, 
  SuppliersPanel 
} from './components/inventory';

import { 
  SalesInvoicePanel, 
  SalesReturnPanel 
} from './components/sales';

import { 
  RepairBillingPanel, 
  WorkersPanel 
} from './components/workshop';

import { 
  ExpensesPanel, 
  ReportsPanel 
} from './components/finance';

export default function AdminPanel({ onLogout, user }) {
  const [activeTab, setActiveTab] = useState('grn');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredTab, setHoveredTab] = useState(null);

  // Modern menu groups
  const menuGroups = [
    {
      title: "INVENTORY",
      icon: "📦",
      items: [
        { id: 'grn', label: 'Purchase GRN', icon: '📥', color: '#3b82f6' },
        { id: 'purreturn', label: 'Purchase Return', icon: '🔄', color: '#ef4444' },
        { id: 'products', label: 'Product Catalog', icon: '🏷️', color: '#8b5cf6' },
        { id: 'reorder', label: 'Reorder Alert', icon: '⚠️', color: '#f59e0b' },
        { id: 'suppliers', label: 'Suppliers', icon: '🏢', color: '#10b981' },
      ]
    },
    {
      title: "SALES & RETURNS",
      icon: "💰",
      items: [
        { id: 'sales', label: 'Sales Invoice', icon: '🛒', color: '#06b6d4' },
        { id: 'salesreturn', label: 'Sales Return', icon: '↩️', color: '#ec489a' },
      ]
    },
    {
      title: "WORKSHOP",
      icon: "🔧",
      items: [
        { id: 'billing', label: 'Repair Billing', icon: '🔧', color: '#f97316' },
        { id: 'workers', label: 'Workers', icon: '👥', color: '#84cc16' },
      ]
    },
    {
      title: "FINANCE",
      icon: "💳",
      items: [
        { id: 'expenses', label: 'Expenses', icon: '💸', color: '#dc2626' },
        { id: 'reports', label: 'Reports', icon: '📊', color: '#6366f1' },
      ]
    }
  ];

  // Flatten tabs for quick lookup
  const allTabs = menuGroups.flatMap(g => g.items);

  return (
    <div style={styles.appContainer}>
      {/* 3D Glassmorphism Sidebar */}
      <aside style={{
        ...styles.sidebar,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        boxShadow: sidebarOpen ? '20px 0 40px rgba(0,0,0,0.05), -5px 0 15px rgba(0,0,0,0.03)' : 'none',
      }}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo3d}>
            <div style={styles.logoGlow}></div>
            <span style={styles.logoIcon}>📱</span>
            <div>
              <div style={styles.logoName}>PhoneRepair</div>
              <div style={styles.logoSub}>Pro ERP</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={styles.sidebarToggle}
            className="sidebar-toggle"
          >
            ◀
          </button>
        </div>

        <div style={styles.sidebarNav}>
          {menuGroups.map((group, idx) => (
            <div key={idx} style={styles.menuGroup}>
              <div style={styles.menuGroupTitle}>
                <span style={styles.menuGroupIcon}>{group.icon}</span>
                <span>{group.title}</span>
              </div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  style={{
                    ...styles.menuItem,
                    ...(activeTab === item.id ? styles.menuItemActive : {}),
                    ...(hoveredTab === item.id ? styles.menuItemHover : {}),
                  }}
                  onClick={() => setActiveTab(item.id)}
                  onMouseEnter={() => setHoveredTab(item.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                >
                  <span style={{ ...styles.menuItemIcon, color: item.color }}>{item.icon}</span>
                  <span style={styles.menuItemLabel}>{item.label}</span>
                  {activeTab === item.id && <span style={styles.activeIndicator} />}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              {(user?.username || 'A')[0].toUpperCase()}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{user?.username || 'Admin'}</div>
              <div style={styles.userRole}>{user?.role === 'admin' ? 'Administrator' : 'Worker'}</div>
            </div>
            <button style={styles.logoutBtn} onClick={onLogout}>
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{
        ...styles.mainContent,
        marginLeft: sidebarOpen ? '280px' : '0',
      }}>
        {/* Modern Top Bar */}
        <header style={styles.topBar}>
          <button
            style={styles.hamburger}
            onClick={() => setSidebarOpen(true)}
            className={sidebarOpen ? 'hidden' : ''}
          >
            ☰
          </button>
          <div style={styles.topBarRight}>
            <div style={styles.searchBar}>
              <span>🔍</span>
              <input type="text" placeholder="Search anything..." />
            </div>
            <div style={styles.notificationBell}>
              🔔
              <span style={styles.notificationBadge}>3</span>
            </div>
            <div style={styles.topUserBadge}>
              <div style={styles.topAvatar}>{(user?.username || 'A')[0].toUpperCase()}</div>
              <span>{user?.username || 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={styles.contentArea}>
          {/* Animated page title bar */}
          <div style={styles.pageHeader}>
            <div>
              <h1 style={styles.pageTitle}>
                {allTabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
              </h1>
              <p style={styles.pageSubtitle}>Manage your store operations seamlessly</p>
            </div>
            <div style={styles.dateBadge}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>

          {/* Tab Panels - with glassmorphism cards */}
          <div style={styles.panelContainer}>
            {activeTab === 'grn' && <GRNPanel user={user} />}
            {activeTab === 'purreturn' && <PurchaseReturnPanel />}
            {activeTab === 'sales' && <SalesInvoicePanel user={user} />}
            {activeTab === 'salesreturn' && <SalesReturnPanel />}
            {activeTab === 'products' && <ProductCatalogPanel />}
            {activeTab === 'reorder' && <ReorderPanel />}
            {activeTab === 'suppliers' && <SuppliersPanel />}
            {activeTab === 'billing' && <RepairBillingPanel user={user} />}
            {activeTab === 'workers' && <WorkersPanel user={user} />}
            {activeTab === 'expenses' && <ExpensesPanel />}
            {activeTab === 'reports' && <ReportsPanel user={user} />}
          </div>
        </div>
      </main>
    </div>
  );
}