import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';

export function ReorderPanel() {
  const [products, setProducts] = useState(() => load(SK.PRODUCTS, []));
  const [search, setSearch] = useState('');
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState(10);

  // Show products that are out of stock OR below reorder level
  const reorderProds = products.filter(p => 
    p.stock <= (p.reorderLevel || 5) && 
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Sort by stock level (lowest first)
  const sortedReorderProds = [...reorderProds].sort((a, b) => a.stock - b.stock);

  const doRestock = (productId, qty) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const upd = products.map(p => 
      p.id === productId 
        ? { ...p, stock: qty, active: true } 
        : p
    );
    save(SK.PRODUCTS, upd); 
    setProducts(upd);
    toast(`✅ ${product.name} restocked to ${qty} units`);
    setRestockId(null);
  };

  // Auto-restock to reorder level
  const autoRestockToLevel = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const reorderQty = product.reorderLevel || 5;
    doRestock(productId, reorderQty);
  };

  return (
    <GlassCard title="⚠️ Products Need Reorder" badge={`${reorderProds.length} items`}>
      <div style={{ marginBottom: 12 }}>
        <input 
          style={{ ...styles.input }} 
          placeholder="Search products..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          marginTop: 8, 
          fontSize: 12, 
          color: '#64748b' 
        }}>
          <span>🟥 Out of Stock: {reorderProds.filter(p => p.stock <= 0).length}</span>
          <span>🟨 Low Stock: {reorderProds.filter(p => p.stock > 0 && p.stock <= (p.reorderLevel || 5)).length}</span>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['ID', 'Code', 'Name', 'Brand', 'Category', 'Current Stock', 'Reorder Level', 'Cost', 'Sell', 'Action'].map(h => 
                <th key={h} style={styles.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {!sortedReorderProds.length && (
              <tr>
                <td colSpan={10} style={styles.emptyTd}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 600 }}>All products are well stocked!</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>No products need reordering at this time.</div>
                </td>
              </tr>
            )}
            {sortedReorderProds.map(p => {
              const isOutOfStock = p.stock <= 0;
              const isLowStock = p.stock > 0 && p.stock <= (p.reorderLevel || 5);
              const isRestocking = restockId === p.id;
              
              return (
                <tr key={p.id} style={{ 
                  background: isOutOfStock ? '#fee2e2' : isLowStock ? '#fffbeb' : '',
                  borderLeft: isOutOfStock ? '4px solid #dc2626' : isLowStock ? '4px solid #f59e0b' : '4px solid transparent'
                }}>
                  <td style={styles.td}>{p.id}</td>
                  <td style={styles.td}>{p.code}</td>
                  <td style={styles.td}><strong>{p.name}</strong></td>
                  <td style={styles.td}>{p.brand || '-'}</td>
                  <td style={styles.td}>{p.category}</td>
                  <td style={styles.td}>
                    <span style={{ 
                      background: isOutOfStock ? '#fee2e2' : isLowStock ? '#fef3c7' : '#dcfce7',
                      color: isOutOfStock ? '#b91c1c' : isLowStock ? '#92400e' : '#166534',
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 700
                    }}>
                      {p.stock}
                    </span>
                    {isOutOfStock && <span style={{ marginLeft: 6, color: '#dc2626' }}>🔴</span>}
                    {isLowStock && !isOutOfStock && <span style={{ marginLeft: 6, color: '#d97706' }}>⚠️</span>}
                  </td>
                  <td style={styles.td}>{p.reorderLevel || 5}</td>
                  <td style={styles.td}>LKR {p.cost}</td>
                  <td style={styles.td}>LKR {p.sell}</td>
                  <td style={styles.td}>
                    {isRestocking ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input 
                          type="number" 
                          style={{ ...styles.input, width: 70 }} 
                          value={restockQty} 
                          onChange={e => setRestockQty(+e.target.value)} 
                          min={1} 
                        />
                        <button 
                          style={{ ...styles.btnPrimary, padding: '6px 12px', fontSize: 12, background: '#10b981' }} 
                          onClick={() => {
                            doRestock(p.id, restockQty);
                            setRestockQty(10);
                          }}
                        >
                          Confirm
                        </button>
                        <button 
                          style={{ ...styles.btnOutline, padding: '6px 10px', fontSize: 11 }} 
                          onClick={() => setRestockId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button 
                          style={{ 
                            ...styles.btnPrimary, 
                            padding: '6px 14px', 
                            fontSize: 12, 
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                          }} 
                          onClick={() => setRestockId(p.id)}
                        >
                          📦 Restock
                        </button>
                        <button 
                          style={{ 
                            ...styles.btnOutline, 
                            padding: '6px 12px', 
                            fontSize: 11,
                            borderColor: '#10b981',
                            color: '#10b981'
                          }} 
                          onClick={() => autoRestockToLevel(p.id)}
                          title={`Restock to reorder level (${p.reorderLevel || 5})`}
                        >
                          ⚡ Auto
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}