// src/components/finance/WorkersPanel.js
import React, { useState, useEffect } from 'react';
import { load, save, toast, SK } from '../../utils/storage';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function WorkersPanel({ user }) {
  const [workers, setWorkers] = useState([]);
  const [sales, setSales] = useState([]);
  const [returns, setReturns] = useState([]);
  const [billed, setBilled] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    name: '', 
    username: '', 
    password: '123', 
    role: 'user',
    permissions: {
      salesInvoice: false,
      salesReturn: false,
      productCatalog: false,
      repairBilling: false,
      viewCostPrice: false
    }
  });

  // ── Load data on component mount ──────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [workersData, salesData, returnsData, billedData, productsData] = await Promise.all([
          load(SK.WORKERS, []),
          load(SK.SALES, []),
          load(SK.RETURNS, []),
          load(SK.BILLED, []),
          load(SK.PRODUCTS, [])
        ]);
        setWorkers(workersData || []);
        setSales(salesData || []);
        setReturns(returnsData || []);
        setBilled(billedData || []);
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
        toast('Error loading data');
        setWorkers([]);
        setSales([]);
        setReturns([]);
        setBilled([]);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ── Derived values ──────────────────────────────────────

  const workersArray = Array.isArray(workers) ? workers : [];
  const salesArray = Array.isArray(sales) ? sales : [];
  const returnsArray = Array.isArray(returns) ? returns : [];
  const billedArray = Array.isArray(billed) ? billed : [];
  const productsArray = Array.isArray(products) ? products : [];

  // ── Permission helpers ──────────────────────────────────

  const hasPermission = (worker, permission) => {
    if (!worker) return false;
    if (worker.role === 'admin') return true;
    return worker.permissions?.[permission] === true;
  };

  const canViewCostPrice = (worker) => {
    if (!worker) return false;
    if (worker.role === 'admin') return true;
    return worker.permissions?.viewCostPrice === true;
  };

  // ── Handlers ──────────────────────────────────────────────

  const register = async () => {
    if (!form.name || !form.username) { 
      toast('Fill all fields'); 
      return; 
    }
    if (workersArray.find(w => w.username === form.username)) { 
      toast('Username exists'); 
      return; 
    }
    
    const w = { 
      id: Date.now(), 
      ...form, 
      role: form.role || 'user', 
      active: true, 
      joinedDate: new Date().toISOString().slice(0, 10),
      permissions: form.permissions || {
        salesInvoice: false,
        salesReturn: false,
        productCatalog: false,
        repairBilling: false,
        viewCostPrice: false
      }
    };
    
    try {
      const upd = [...workersArray, w];
      setWorkers(upd);
      await save(SK.WORKERS, upd);
      setForm({ 
        name: '', 
        username: '', 
        password: '123', 
        role: 'user',
        permissions: {
          salesInvoice: false,
          salesReturn: false,
          productCatalog: false,
          repairBilling: false,
          viewCostPrice: false
        }
      });
      toast(`✅ ${form.name} registered`);
    } catch (error) {
      console.error('Error registering worker:', error);
      toast('Error registering worker');
    }
  };

  const toggle = async (id) => {
    try {
      const upd = workersArray.map(w => 
        w.id === id ? { ...w, active: !w.active } : w
      );
      setWorkers(upd);
      await save(SK.WORKERS, upd);
      toast('✅ Worker status toggled');
    } catch (error) {
      console.error('Error toggling worker:', error);
      toast('Error toggling worker');
    }
  };

  const updatePermissions = async (id, permissions) => {
    try {
      const upd = workersArray.map(w => 
        w.id === id ? { ...w, permissions: { ...w.permissions, ...permissions } } : w
      );
      setWorkers(upd);
      await save(SK.WORKERS, upd);
      toast('✅ Permissions updated');
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast('Error updating permissions');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this worker?')) return;
    
    try {
      const upd = workersArray.filter(w => w.id !== id);
      setWorkers(upd);
      await save(SK.WORKERS, upd);
      toast('🗑️ Worker deleted');
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast('Error deleting worker');
    }
  };

  // ── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <GlassCard title="👥 Workers Management">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          <div>Loading workers data...</div>
        </div>
      </GlassCard>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div>
      <GlassCard title="👥 Register New Worker">
        <div style={styles.grid2}>
          <FormGrid>
            <Field label="Full Name">
              <input 
                style={styles.input} 
                value={form.name} 
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                placeholder="Enter full name"
              />
            </Field>
            <Field label="Username">
              <input 
                style={styles.input} 
                value={form.username} 
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} 
                placeholder="Choose a username"
              />
            </Field>
            <Field label="Password">
              <input 
                style={styles.input} 
                type="password"
                value={form.password} 
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                placeholder="Enter password"
              />
            </Field>
            <Field label="Role">
              <select 
                style={styles.input} 
                value={form.role} 
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </FormGrid>
          <div style={{ 
            background: '#eff3ff', 
            padding: 16, 
            borderRadius: 12, 
            fontSize: 13,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>ℹ️</div>
            <div>Default password is <strong>"123"</strong></div>
            <div style={{ marginTop: 4, color: '#64748b' }}>
              Workers login with username &amp; password.
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#2563eb' }}>
              👤 {workersArray.filter(w => w.active !== false).length} active workers
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
              🔐 Admins have full access to all features
            </div>
          </div>
        </div>
        
        {/* Permissions Section */}
        <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>🔐 Permissions (for User role)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.permissions.salesInvoice}
                onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, salesInvoice: e.target.checked } }))}
              />
              📄 Sales Invoice
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.permissions.salesReturn}
                onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, salesReturn: e.target.checked } }))}
              />
              ↩️ Sales Return
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.permissions.productCatalog}
                onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, productCatalog: e.target.checked } }))}
              />
              🏷️ Product Catalog
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.permissions.repairBilling}
                onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, repairBilling: e.target.checked } }))}
              />
              🔧 Repair Billing
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.permissions.viewCostPrice}
                onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, viewCostPrice: e.target.checked } }))}
              />
              💰 View Cost Price
            </label>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            ⚡ Admins automatically have all permissions. These settings apply to User role only.
          </div>
        </div>

        <button style={{ ...styles.btnPrimary, marginTop: 16 }} onClick={register}>
          ➕ Register Worker
        </button>
      </GlassCard>
      
      <GlassCard title="📋 Workers" badge={`${workersArray.length} total`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Name', 'Username', 'Role', 'Permissions', 'Joined', 'Status', 'Activity', 'Action'].map(h => 
                  <th key={h} style={styles.th}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {!workersArray.length && (
                <tr>
                  <td colSpan={8} style={styles.emptyTd}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
                    <div>No workers registered yet</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      Register your first worker above
                    </div>
                  </td>
                </tr>
              )}
              {workersArray.map(w => { 
                const ws = salesArray.filter(s => 
                  s.soldBy === w.username || s.createdBy === w.username
                ); 
                const rev = ws.reduce((s, x) => s + (x.payable || x.total || 0), 0);
                const returnCount = returnsArray.filter(r => r.processedBy === w.username).length;
                const billedCount = billedArray.filter(b => b.billedBy === w.username).length;
                
                const hasPerm = (perm) => hasPermission(w, perm);
                
                return (
                  <tr key={w.id} style={{ 
                    opacity: w.active === false ? 0.5 : 1,
                    background: w.active === false ? '#f8fafc' : 'transparent'
                  }}>
                    <td style={styles.td}>
                      <strong>{w.name}</strong>
                      {w.role === 'admin' && (
                        <span style={{ 
                          marginLeft: 6, 
                          background: '#2563eb', 
                          color: '#fff', 
                          padding: '1px 8px', 
                          borderRadius: 12, 
                          fontSize: 9,
                          fontWeight: 600
                        }}>ADMIN</span>
                      )}
                    </td>
                    <td style={styles.td}>{w.username}</td>
                    <td style={styles.td}>
                      <span style={{ 
                        background: w.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                        color: w.role === 'admin' ? '#2563eb' : '#475569',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {(w.role || 'user').toUpperCase()}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, fontSize: 10 }}>
                        {w.role === 'admin' ? (
                          <span style={{ color: '#2563eb' }}>🔓 Full Access</span>
                        ) : (
                          <>
                            {hasPerm('salesInvoice') && <span style={{ background: '#dbeafe', padding: '1px 6px', borderRadius: 4 }}>📄</span>}
                            {hasPerm('salesReturn') && <span style={{ background: '#fce7f3', padding: '1px 6px', borderRadius: 4 }}>↩️</span>}
                            {hasPerm('productCatalog') && <span style={{ background: '#d1fae5', padding: '1px 6px', borderRadius: 4 }}>🏷️</span>}
                            {hasPerm('repairBilling') && <span style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>🔧</span>}
                            {hasPerm('viewCostPrice') && <span style={{ background: '#ede9fe', padding: '1px 6px', borderRadius: 4 }}>💰</span>}
                            {!hasPerm('salesInvoice') && !hasPerm('salesReturn') && !hasPerm('productCatalog') && !hasPerm('repairBilling') && (
                              <span style={{ color: '#94a3b8' }}>No permissions</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>{w.joinedDate}</td>
                    <td style={styles.td}>
                      <button 
                        style={{ 
                          ...styles.btnPrimary, 
                          padding: '4px 12px', 
                          fontSize: 12, 
                          background: w.active !== false ? '#10b981' : '#94a3b8',
                          minWidth: 80
                        }} 
                        onClick={() => toggle(w.id)}
                      >
                        {w.active !== false ? '✅ Active' : '❌ Inactive'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: 11 }}>
                        <div>📄 Sales: <strong>{ws.length}</strong></div>
                        <div>💵 Revenue: <strong style={{ color: '#0d9488' }}>LKR {rev.toLocaleString()}</strong></div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>
                          ↩️ Returns: {returnCount} | 🔧 Billed: {billedCount}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                        <button 
                          style={{ 
                            ...styles.btnDanger, 
                            padding: '4px 10px', 
                            fontSize: 11,
                            opacity: w.id === user?.id ? 0.5 : 1,
                            cursor: w.id === user?.id ? 'not-allowed' : 'pointer'
                          }} 
                          onClick={() => {
                            if (w.id === user?.id) {
                              toast('⚠️ Cannot delete yourself');
                              return;
                            }
                            del(w.id);
                          }}
                          disabled={w.id === user?.id}
                          title={w.id === user?.id ? 'Cannot delete yourself' : 'Delete worker'}
                        >
                          🗑️ Delete
                        </button>
                        {w.role !== 'admin' && w.id !== user?.id && (
                          <button 
                            style={{ 
                              ...styles.btnPrimary, 
                              padding: '4px 10px', 
                              fontSize: 10,
                              background: '#8b5cf6'
                            }} 
                            onClick={() => {
                              const newPerms = {
                                salesInvoice: !w.permissions?.salesInvoice,
                                salesReturn: !w.permissions?.salesReturn,
                                productCatalog: !w.permissions?.productCatalog,
                                repairBilling: !w.permissions?.repairBilling,
                                viewCostPrice: !w.permissions?.viewCostPrice
                              };
                              updatePermissions(w.id, newPerms);
                            }}
                          >
                            🔐 Toggle All
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        </div>
        
        {workersArray.length > 0 && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#f1f5f9', 
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
            flexWrap: 'wrap',
            gap: 8
          }}>
            <div>
              <span style={{ color: '#64748b' }}>Total Workers:</span>
              <strong style={{ marginLeft: 8 }}>{workersArray.length}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Active:</span>
              <strong style={{ marginLeft: 8, color: '#10b981' }}>
                {workersArray.filter(w => w.active !== false).length}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Inactive:</span>
              <strong style={{ marginLeft: 8, color: '#94a3b8' }}>
                {workersArray.filter(w => w.active === false).length}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Admins:</span>
              <strong style={{ marginLeft: 8, color: '#2563eb' }}>
                {workersArray.filter(w => w.role === 'admin').length}
              </strong>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}