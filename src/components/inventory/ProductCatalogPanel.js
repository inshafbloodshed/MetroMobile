// src/components/inventory/ProductCatalogPanel.js
import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function ProductCatalogPanel() {
  const [products, setProducts] = useState(() => load(SK.PRODUCTS, []));
  const [suppliers, setSuppliers] = useState(() => load(SK.SUPPLIERS, []));
  const [search, setSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ 
    name: '', code: '', barcode: '', brand: '', color: '', model: '', 
    nature: '', category: 'DISPLAY', cost: 0, sell: 0, stock: 0, 
    reorderLevel: 5, storage: '', supplierWarranty: 'NO WARRANTY', 
    customerWarranty: 'NO WARRANTY', compatible: '', active: true,
    supplierId: '' 
  });

  const filtered = products.filter(p => {
    const matchesName = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = (p.brand || '').toLowerCase().includes(brandSearch.toLowerCase());
    const matchesSupplier = !supplierFilter || p.supplierId === supplierFilter;
    return matchesName && matchesBrand && matchesSupplier;
  });

  const openNew = () => { 
    setEditId(null); 
    setForm({ 
      name: '', code: '', barcode: '', brand: '', color: '', model: '', 
      nature: '', category: 'DISPLAY', cost: 0, sell: 0, stock: 0, 
      reorderLevel: 5, storage: '', supplierWarranty: 'NO WARRANTY', 
      customerWarranty: 'NO WARRANTY', compatible: '', active: true,
      supplierId: '' 
    }); 
    setShowModal(true); 
  };
  
  const openEdit = (p) => { 
    setEditId(p.id); 
    setForm({ 
      ...p, 
      compatible: (p.compatible || []).join(', '),
      supplierId: p.supplierId || ''
    }); 
    setShowModal(true); 
  };

  const saveProduct = () => {
    if (!form.name || !form.code || !form.cost) { 
      toast('Name, Code, Cost required'); 
      return; 
    }
    
    const sup = suppliers.find(s => s.id === form.supplierId);
    
    const p = { 
      ...form, 
      id: editId || (products.length ? Math.max(...products.map(x => x.id)) + 1 : 1), 
      compatible: form.compatible.split(',').map(s => s.trim()).filter(s => s), 
      margin: (((form.sell - form.cost) / form.cost) * 100).toFixed(1), 
      active: form.active === true || form.active === 'true',
      supplierName: sup?.name || '',
    };
    
    const updated = editId ? products.map(x => x.id === editId ? p : x) : [...products, p];
    save(SK.PRODUCTS, updated); 
    setProducts(updated);
    setShowModal(false); 
    toast(editId ? 'Updated' : 'Product added');
  };

  const autoRestock = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const reorderQty = product.reorderLevel || 5;
    const upd = products.map(p => 
      p.id === productId 
        ? { ...p, stock: reorderQty, active: true } 
        : p
    );
    save(SK.PRODUCTS, upd); 
    setProducts(upd);
    toast(`✅ ${product.name} restocked to ${reorderQty} units`);
  };

  return (
    <GlassCard title="🏷️ Product Catalog">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input style={{ ...styles.input, width: 180 }} placeholder="Search name..." value={search} onChange={e => setSearch(e.target.value)} />
          <input style={{ ...styles.input, width: 140 }} placeholder="Brand..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} />
          <select style={{ ...styles.input, width: 180 }} value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.filter(s => s.active !== false).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button style={styles.btnPrimary} onClick={openNew}>+ New Product</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#0284c7', fontSize: 12, fontWeight: 600 }}>TOTAL PRODUCTS</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#0369a1' }}>{products.length}</div>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>LOW STOCK</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#b91c1c' }}>{products.filter(p => p.stock <= (p.reorderLevel || 5)).length}</div>
        </div>
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#d97706', fontSize: 12, fontWeight: 600 }}>UNIQUE SUPPLIERS</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#b45309' }}>
            {new Set(products.map(p => p.supplierId).filter(Boolean)).size}
          </div>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['ID', 'Code', 'Name', 'Brand', 'Model', 'Category', 'Cost', 'Sell', 'Stock', 'Supplier', 'Compatible', 'Warranty', 'Action'].map(h => 
                <th key={h} style={styles.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isLowStock = p.stock <= (p.reorderLevel || 5);
              const isOutOfStock = p.stock <= 0;
              const supplier = suppliers.find(s => s.id === p.supplierId);
              
              return (
                <tr key={p.id} style={{ 
                  background: isOutOfStock ? '#fee2e2' : isLowStock ? '#fffbeb' : '',
                  transition: 'background 0.3s ease'
                }}>
                  <td style={styles.td}>{p.id}</td>
                  <td style={styles.td}>{p.code}</td>
                  <td style={styles.td}><strong>{p.name}</strong></td>
                  <td style={styles.td}>{p.brand || '-'}</td>
                  <td style={styles.td}>{p.model || '-'}</td>
                  <td style={styles.td}>{p.category}</td>
                  <td style={styles.td}>LKR {p.cost}</td>
                  <td style={styles.td}>LKR {p.sell}</td>
                  <td style={styles.td}>
                    <span style={{ 
                      background: isOutOfStock ? '#fee2e2' : isLowStock ? '#fef3c7' : '#dcfce7', 
                      color: isOutOfStock ? '#b91c1c' : isLowStock ? '#92400e' : '#166534', 
                      padding: '3px 10px', 
                      borderRadius: 20, 
                      fontSize: 12, 
                      fontWeight: 600 
                    }}>
                      {p.stock}
                    </span>
                    {isLowStock && (
                      <span style={{ 
                        marginLeft: 6, 
                        fontSize: 10, 
                        color: isOutOfStock ? '#dc2626' : '#d97706',
                        fontWeight: 600 
                      }}>
                        {isOutOfStock ? '🔴 OUT' : '⚠️ LOW'}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: 11 }}>
                      {supplier?.name || '-'}
                      <div style={{ fontSize: 9, color: '#64748b' }}>{p.supplierId || 'N/A'}</div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(p.compatible || []).join(', ') || '-'}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: 11 }}>
                      {p.customerWarranty || 'NO WARRANTY'}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button 
                        style={{ ...styles.btnPrimary, padding: '5px 12px', fontSize: 12 }} 
                        onClick={() => openEdit(p)}
                      >
                        ✏️
                      </button>
                      {isLowStock && (
                        <button 
                          style={{ 
                            ...styles.btnPrimary, 
                            padding: '5px 12px', 
                            fontSize: 12, 
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                          }} 
                          onClick={() => autoRestock(p.id)}
                        >
                          📦 Restock
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

      {showModal && (
        <Modal title={editId ? '✏️ Edit Product' : '➕ New Product'} onClose={() => setShowModal(false)}>
          <FormGrid>
            {[['Product Name *', 'name', 'text'], ['Product Code *', 'code', 'text'], ['External Barcode', 'barcode', 'text'], ['Brand', 'brand', 'text'], ['Colour', 'color', 'text'], ['Model Number', 'model', 'text'], ['Nature/Type', 'nature', 'text']].map(([label, key, type]) => (
              <Field key={key} label={label}><input type={type} style={styles.input} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></Field>
            ))}
            <Field label="Category"><select style={styles.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{['ACCESSORY', 'BATTERY', 'CHARGER', 'DISPLAY', 'TOOLS'].map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Purchase Cost"><input type="number" style={styles.input} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} /></Field>
            <Field label="Selling Price"><input type="number" style={styles.input} value={form.sell} onChange={e => setForm(f => ({ ...f, sell: +e.target.value }))} /></Field>
            <Field label="Initial Stock"><input type="number" style={styles.input} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} /></Field>
            <Field label="Reorder Level"><input type="number" style={styles.input} value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: +e.target.value }))} /></Field>
            <Field label="Storage Location"><input style={styles.input} value={form.storage || ''} onChange={e => setForm(f => ({ ...f, storage: e.target.value }))} /></Field>
            <Field label="Supplier *">
              <select style={styles.input} value={form.supplierId || ''} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}>
                <option value="">-- Select Supplier --</option>
                {suppliers.filter(s => s.active !== false).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
            </Field>
            <Field label="Supplier Warranty"><select style={styles.input} value={form.supplierWarranty} onChange={e => setForm(f => ({ ...f, supplierWarranty: e.target.value }))}>{['NO WARRANTY', '7 DAYS', '14 DAYS', '30 DAYS'].map(w => <option key={w}>{w}</option>)}</select></Field>
            <Field label="Customer Warranty"><select style={styles.input} value={form.customerWarranty} onChange={e => setForm(f => ({ ...f, customerWarranty: e.target.value }))}>{['NO WARRANTY', '7 DAYS', '14 DAYS', '30 DAYS'].map(w => <option key={w}>{w}</option>)}</select></Field>
            <Field label="Active"><select style={styles.input} value={String(form.active)} onChange={e => setForm(f => ({ ...f, active: e.target.value === 'true' }))}><option value="true">YES</option><option value="false">NO</option></select></Field>
          </FormGrid>
          <Field label="🔗 Compatible Devices (comma separated)">
            <textarea 
              style={{ ...styles.input, resize: 'vertical' }} 
              rows={3} 
              value={form.compatible || ''} 
              onChange={e => setForm(f => ({ ...f, compatible: e.target.value }))} 
              placeholder="e.g., iPhone 12, Samsung S21, Google Pixel 6"
            />
          </Field>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={styles.btnPrimary} onClick={saveProduct}>💾 Save</button>
            <button style={styles.btnOutline} onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </GlassCard>
  );
}