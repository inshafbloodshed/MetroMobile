// src/components/WorkerPanel.js
import React, { useState } from 'react';
import { styles } from '../utils/styles';
import { PriceProvider } from '../context/PriceContext';
import { SalesInvoicePanel } from './sales/SalesInvoicePanel';
import { SalesReturnPanel } from './sales/SalesReturnPanel';
import { ProductCatalogPanel } from './inventory/ProductCatalogPanel';
import { RepairBillingPanel } from './workshop/RepairBillingPanel';
import { ExpensesPanel } from './finance/ExpensesPanel';

export default function WorkerPanel({ onLogout, user }) {
  const [activeTab, setActiveTab] = useState('sales');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredTab, setHoveredTab] = useState(null);

  // ✅ Check if user is discount admin (40% off)
  const isDiscountAdmin = user?.isDiscountAdmin === true;

  // ✅ Check if user has permission to view cost price
  const canViewCost = user?.permissions?.viewCostPrice !== false;

  const menuGroups = [
    {
      title: "SALES",
      icon: "💰",
      items: [
        { id: 'sales', label: 'Sales Invoice', icon: '🛒', color: '#06b6d4' },
        { id: 'salesreturn', label: 'Sales Return', icon: '↩️', color: '#ec489a' },
        { id: 'catalog', label: 'Product Catalog', icon: '📦', color: '#8b5cf6' },
      ]
    },
    {
      title: "WORKSHOP",
      icon: "🔧",
      items: [
        { id: 'billing', label: 'Repair Billing', icon: '🔧', color: '#f97316' },
        { id: 'expenses', label: 'Expenses', icon: '💰', color: '#10b981' },
      ]
    }
  ];

  const allTabs = menuGroups.flatMap(g => g.items);

  // ── Render active tab content ──────────────────────────────

  const renderContent = () => {
    switch (activeTab) {
      case 'sales':
        return <SalesInvoicePanel user={user} isWorkerView={!canViewCost} isDiscountAdmin={isDiscountAdmin} />;
      case 'salesreturn':
        return <SalesReturnPanel user={user} isWorkerView={!canViewCost} isDiscountAdmin={isDiscountAdmin} />;
      case 'catalog':
        return <ProductCatalogPanel user={user} isWorkerView={!canViewCost} isDiscountAdmin={isDiscountAdmin} />;
      case 'billing':
        return <RepairBillingPanel user={user} isWorkerView={!canViewCost} isDiscountAdmin={isDiscountAdmin} />;
      case 'expenses':
        return <ExpensesPanel user={user} isWorkerView={!canViewCost} isDiscountAdmin={isDiscountAdmin} />;
      default:
        return <div>Select a tab from the sidebar</div>;
    }
  };

  // ✅ If user doesn't have cost view permission, show warning banner
  const showCostWarning = !canViewCost && !isDiscountAdmin;

  return (
    <PriceProvider user={user}>
      <div style={styles.appContainer}>
        <aside style={{
          ...styles.sidebar,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}>
          <div style={styles.sidebarHeader}>
            <div style={styles.logo3d}>
              <span style={styles.logoIcon}>📱</span>
              <div>
                <div style={styles.logoName}>PhoneRepair</div>
                <div style={styles.logoSub}>Worker Portal</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={styles.sidebarToggle}>◀</button>
          </div>

          <div style={styles.sidebarNav}>
            {menuGroups.map((group, idx) => (
              <div key={idx} style={styles.menuGroup}>
                <div style={styles.menuGroupTitle}>
                  <span>{group.icon}</span>
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
              <div style={styles.userAvatar}>{(user?.username || 'W')[0].toUpperCase()}</div>
              <div style={styles.userInfo}>
                <div style={styles.userName}>{user?.username || 'Worker'}</div>
                <div style={styles.userRole}>
                  {isDiscountAdmin ? '💰 Discount Admin' : canViewCost ? 'Admin' : 'Worker'}
                </div>
              </div>
              <button style={styles.logoutBtn} onClick={onLogout}>🚪</button>
            </div>
          </div>
        </aside>

        <main style={{
          ...styles.mainContent,
          marginLeft: sidebarOpen ? '280px' : '0',
        }}>
          <header style={styles.topBar}>
            <button onClick={() => setSidebarOpen(true)} style={styles.hamburger} className={sidebarOpen ? 'hidden' : ''}>
              ☰
            </button>
            <div style={styles.topBarRight}>
              <div style={styles.topUserBadge}>
                <div style={styles.topAvatar}>{(user?.username || 'W')[0].toUpperCase()}</div>
                <span>{user?.username || 'Worker'}</span>
                {isDiscountAdmin && (
                  <span style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 600,
                    marginLeft: 8
                  }}>
                    💰 40% Off
                  </span>
                )}
                {!canViewCost && !isDiscountAdmin && (
                  <span style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 600,
                    marginLeft: 8
                  }}>
                    🔒 Limited
                  </span>
                )}
              </div>
            </div>
          </header>

          <div style={styles.contentArea}>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>
                  {allTabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
                </h1>
                <p style={styles.pageSubtitle}>
                  {isDiscountAdmin 
                    ? '💰 Discount Admin - 40% off on all products' 
                    : canViewCost 
                      ? 'Full access with cost price visibility' 
                      : 'Worker operations panel - Cost price hidden'}
                </p>
              </div>
              <div style={styles.dateBadge}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {showCostWarning && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <span style={{ fontSize: 20 }}>🔒</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#92400e' }}>Limited Access Mode</div>
                  <div style={{ fontSize: 13, color: '#78350f' }}>
                    Purchase costs and profit margins are hidden for workers
                  </div>
                </div>
              </div>
            )}

            <div style={styles.panelContainer}>
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </PriceProvider>
  );
}