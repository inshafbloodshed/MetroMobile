import React, { useState } from 'react';
import { load, save, toast } from '../utils/storage';
import { SK } from '../utils/constants';
import { styles } from '../utils/styles';
import { GlassCard } from './common/GlassCard';
import { Modal } from './common/Modal';
import { Field } from './common/Field';
import { FormGrid } from './common/FormGrid';
import { PriceProvider } from '../context/PriceContext';

export default function WorkerPanel({ onLogout, user }) {
  const [activeTab, setActiveTab] = useState('sales');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredTab, setHoveredTab] = useState(null);

  const menuGroups = [
    {
      title: "SALES",
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
      ]
    }
  ];

  const allTabs = menuGroups.flatMap(g => g.items);

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
                <div style={styles.userRole}>Worker</div>
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
              </div>
            </div>
          </header>

          <div style={styles.contentArea}>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>
                  {allTabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
                </h1>
                <p style={styles.pageSubtitle}>Worker operations panel</p>
              </div>
              <div style={styles.dateBadge}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div style={styles.panelContainer}>
              {activeTab === 'sales' && <div>Sales Invoice Panel (Worker View)</div>}
              {activeTab === 'salesreturn' && <div>Sales Return Panel (Worker View)</div>}
              {activeTab === 'billing' && <div>Repair Billing Panel (Worker View)</div>}
            </div>
          </div>
        </main>
      </div>
    </PriceProvider>
  );
}