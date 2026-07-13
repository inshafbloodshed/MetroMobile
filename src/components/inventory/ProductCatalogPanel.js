// src/components/inventory/ProductCatalogPanel.js
import React, { useState, useEffect } from 'react';
import { load, toast, SK } from '../../utils/storage';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function ProductCatalogPanel({ user, isWorkerView = false, isDiscountAdmin = false }) {
  // State for data - initialize as empty arrays
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  // ── Function to get discounted price ──────────────────────
  const getDisplayPrice = (product) => {
    if (isDiscountAdmin) {
      return Math.round((product.sell || 0) * 0.6);
    }
    return product.sell || 0;
  };

  // ── Refresh function ──────────────────────────────────────
  const refreshData = async () => {
    try {
      setLoading(true);
      
      const [productsData, suppliersData] = await Promise.all([
        window.api.getProducts(false),
        window.api.getSuppliers()
      ]);
      
      setProducts(productsData || []);
      setSuppliers(suppliersData || []);
      
      console.log('📊 Refreshed - Products:', productsData?.length || 0);
      console.log('📊 Refreshed - Suppliers:', suppliersData?.length || 0);
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast('Error refreshing data');
    } finally {
      setLoading(false);
    }
  };

  // ── Load data on component mount ──────────────────────────
  useEffect(() => {
    refreshData();
  }, []);

  // ── Derived values ──────────────────────────────────────

  const productsArray = Array.isArray(products) ? products : [];
  const suppliersArray = Array.isArray(suppliers) ? suppliers : [];

  const filtered = productsArray.filter(p => {
    const matchesName = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = (p.brand || '').toLowerCase().includes(brandSearch.toLowerCase());
    const matchesSupplier = !supplierFilter || p.supplier_id === supplierFilter || p.supplierId === supplierFilter;
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
    
    let compatibleValue = '';
    if (p.compatible) {
      if (Array.isArray(p.compatible)) {
        compatibleValue = p.compatible.join(', ');
      } else if (typeof p.compatible === 'string') {
        try {
          const parsed = JSON.parse(p.compatible);
          compatibleValue = Array.isArray(parsed) ? parsed.join(', ') : p.compatible;
        } catch {
          compatibleValue = p.compatible;
        }
      }
    }
    
    setForm({ 
      ...p, 
      compatible: compatibleValue,
      supplierId: p.supplier_id || p.supplierId || '',
      active: p.active === 1 || p.active === true
    }); 
    setShowModal(true); 
  };

  const saveProduct = async () => {
    if (!form.name || !form.code || !form.cost) { 
      toast('Name, Code, Cost required'); 
      return; 
    }

    // ✅ IMPORTANT: If no supplier is selected, set supplierId to null
    const selectedSupplierId = form.supplierId || null;
    const sup = suppliersArray.find(s => s.id === selectedSupplierId);
    
    let compatibleValue = null;
    if (form.compatible) {
      const parts = form.compatible.split(',').map(s => s.trim()).filter(s => s);
      if (parts.length > 0) {
        compatibleValue = JSON.stringify(parts);
      }
    }
    
    // ✅ Ensure all fields are properly set
    const productData = {
      name: form.name.trim(),
      code: form.code.trim(),
      barcode: form.barcode || null,
      brand: form.brand || null,
      model: form.model || null,
      color: form.color || null,
      nature: form.nature || null,
      category: form.category || 'DISPLAY',
      cost: parseFloat(form.cost) || 0,
      sell: parseFloat(form.sell) || 0,
      stock: parseInt(form.stock) || 0,
      reorder_level: parseInt(form.reorderLevel) || 5,
      storage: form.storage || null,
      supplier_id: selectedSupplierId, // ✅ This is the key field
      supplier_name: sup?.name || null,
      compatible: compatibleValue,
      margin: form.sell && form.cost ? (((parseFloat(form.sell) - parseFloat(form.cost)) / parseFloat(form.cost)) * 100).toFixed(1) : null,
      active: form.active === true || form.active === 'true' ? 1 : 0,
      supplier_warranty: form.supplierWarranty || 'NO WARRANTY',
      customer_warranty: form.customerWarranty || 'NO WARRANTY'
    };
    
    console.log('💾 Saving product with supplier_id:', productData.supplier_id);
    
    try {
      let result;
      if (editId) {
        // Update existing product
        result = await window.api.updateProduct(editId, productData);
        console.log('✅ Product updated:', result);
      } else {
        // Create new product
        result = await window.api.createProduct(productData);
        console.log('✅ Product created:', result);
      }
      
      setShowModal(false);
      toast(editId ? '✅ Product updated' : '✅ Product added');
      
      // ✅ Refresh data to show the updated list
      await refreshData();
      
    } catch (error) {
      console.error('Error saving product:', error);
      toast('Error saving product: ' + error.message);
    }
  };

  const autoRestock = async (productId) => {
    try {
      const product = productsArray.find(p => p.id === productId);
      if (!product) return;
      
      const reorderQty = product.reorder_level || 5;
      const updatedProduct = { 
        ...product, 
        stock: reorderQty, 
        active: 1 
      };
      
      await window.api.updateProduct(productId, updatedProduct);
      
      // ✅ Refresh data
      await refreshData();
      
      toast(`✅ ${product.name} restocked to ${reorderQty} units`);
    } catch (error) {
      console.error('Error restocking:', error);
      toast('Error restocking product');
    }
  };

  // ── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <GlassCard title="🏷️ Product Catalog">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          <div>Loading products...</div>
        </div>
      </GlassCard>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <GlassCard title="🏷️ Product Catalog">
      {/* Discount Banner */}
      {isDiscountAdmin && (
        <div style={{
          background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
          borderLeft: '6px solid #10b981',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
        }}>
          <span style={{ fontSize: 24 }}>💰</span>
          <div>
            <span style={{ fontWeight: 700, color: '#065f46' }}>Discount Mode Active - </span>
            <span style={{ color: '#047857', fontSize: 14 }}>
              All prices shown with <strong>40% discount</strong>
            </span>
          </div>
          <span style={{ 
            marginLeft: 'auto', 
            background: '#10b981', 
            color: '#fff', 
            padding: '4px 14px', 
            borderRadius: 20, 
            fontSize: 13, 
            fontWeight: 700 
          }}>
            40% OFF
          </span>
        </div>
      )}

      {/* Refresh Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {isDiscountAdmin 
            ? '💰 Discount Mode - 40% off applied' 
            : isWorkerView 
              ? '👁️ View Mode - Cost price hidden' 
              : '📊 Full Access - Cost price visible'}
        </div>
        <button 
          onClick={refreshData}
          style={{ ...styles.btnOutline, padding: '6px 16px', fontSize: 12 }}
        >
          🔄 Refresh Data
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input style={{ ...styles.input, width: 180 }} placeholder="Search name..." value={search} onChange={e => setSearch(e.target.value)} />
          <input style={{ ...styles.input, width: 140 }} placeholder="Brand..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} />
          <select style={{ ...styles.input, width: 180 }} value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliersArray.filter(s => s.active !== false).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button style={styles.btnPrimary} onClick={openNew}>+ New Product</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#0284c7', fontSize: 12, fontWeight: 600 }}>TOTAL PRODUCTS</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#0369a1' }}>{productsArray.length}</div>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>LOW STOCK</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#b91c1c' }}>
            {productsArray.filter(p => (p.stock || 0) <= (p.reorder_level || 5)).length}
          </div>
        </div>
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#d97706', fontSize: 12, fontWeight: 600 }}>UNIQUE SUPPLIERS</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#b45309' }}>
            {new Set(productsArray.map(p => p.supplier_id || p.supplierId).filter(Boolean)).size}
          </div>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['ID', 'Code', 'Name', 'Brand', 'Model', 'Category', 
                // ✅ Conditionally show/hide Cost column
                ...(isWorkerView ? [] : ['Cost']), 
                'Sell Price', 'Stock', 'Supplier', 'Compatible', 'Warranty', 'Action'
              ].map(h => 
                <th key={h} style={styles.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isWorkerView ? 12 : 13} style={styles.emptyTd}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📦</div>
                  <div>No products found</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    Click "New Product" to add your first product
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(p => {
              const isLowStock = (p.stock || 0) <= (p.reorder_level || 5);
              const isOutOfStock = (p.stock || 0) <= 0;
              const supplier = suppliersArray.find(s => s.id === (p.supplier_id || p.supplierId));
              const displayPrice = getDisplayPrice(p);
              const originalPrice = p.sell;
              
              let compatibleDisplay = '-';
              if (p.compatible) {
                try {
                  const parsed = JSON.parse(p.compatible);
                  compatibleDisplay = Array.isArray(parsed) ? parsed.join(', ') : p.compatible;
                } catch {
                  compatibleDisplay = p.compatible;
                }
              }
              
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
                  {/* ✅ Conditionally show/hide Cost column */}
                  {!isWorkerView && (
                    <td style={styles.td}>LKR {p.cost}</td>
                  )}
                  <td style={styles.td}>
                    {isDiscountAdmin ? (
                      <div>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>LKR {displayPrice}</span>
                        <div style={{ fontSize: 10, color: '#94a3b8', textDecoration: 'line-through' }}>
                          LKR {originalPrice}
                        </div>
                      </div>
                    ) : (
                      <span>LKR {originalPrice}</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{ 
                      background: isOutOfStock ? '#fee2e2' : isLowStock ? '#fef3c7' : '#dcfce7', 
                      color: isOutOfStock ? '#b91c1c' : isLowStock ? '#92400e' : '#166534', 
                      padding: '3px 10px', 
                      borderRadius: 20, 
                      fontSize: 12, 
                      fontWeight: 600 
                    }}>
                      {p.stock || 0}
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
                      <div style={{ fontSize: 9, color: '#64748b' }}>{p.supplier_id || p.supplierId || 'N/A'}</div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {compatibleDisplay}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: 11 }}>
                      {p.customer_warranty || 'NO WARRANTY'}
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
              <Field key={key} label={label}>
                <input type={type} style={styles.input} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </Field>
            ))}
            <Field label="Category">
              <select style={styles.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['ACCESSORY', 'BATTERY', 'CHARGER', 'DISPLAY', 'TOOLS'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Purchase Cost">
              <input type="number" style={styles.input} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} />
            </Field>
            <Field label="Selling Price">
              <input type="number" style={styles.input} value={form.sell} onChange={e => setForm(f => ({ ...f, sell: +e.target.value }))} />
            </Field>
            <Field label="Initial Stock">
              <input type="number" style={styles.input} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} />
            </Field>
            <Field label="Reorder Level">
              <input type="number" style={styles.input} value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: +e.target.value }))} />
            </Field>
            <Field label="Storage Location">
              <input style={styles.input} value={form.storage || ''} onChange={e => setForm(f => ({ ...f, storage: e.target.value }))} />
            </Field>
            <Field label="Supplier *">
              <select 
                style={styles.input} 
                value={form.supplierId || ''} 
                onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
              >
                <option value="">-- Select Supplier --</option>
                {suppliersArray.filter(s => s.active !== false).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                ⚡ Selected: {form.supplierId ? suppliersArray.find(s => s.id === form.supplierId)?.name || 'None' : 'None'}
              </div>
            </Field>
            <Field label="Supplier Warranty">
              <select style={styles.input} value={form.supplierWarranty} onChange={e => setForm(f => ({ ...f, supplierWarranty: e.target.value }))}>
                {['NO WARRANTY', '7 DAYS', '14 DAYS', '30 DAYS'].map(w => <option key={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Customer Warranty">
              <select style={styles.input} value={form.customerWarranty} onChange={e => setForm(f => ({ ...f, customerWarranty: e.target.value }))}>
                {['NO WARRANTY', '7 DAYS', '14 DAYS', '30 DAYS'].map(w => <option key={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Active">
              <select style={styles.input} value={String(form.active)} onChange={e => setForm(f => ({ ...f, active: e.target.value === 'true' }))}>
                <option value="true">YES</option>
                <option value="false">NO</option>
              </select>
            </Field>
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