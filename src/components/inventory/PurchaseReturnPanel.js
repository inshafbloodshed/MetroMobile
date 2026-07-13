// src/components/inventory/PurchaseReturnPanel.js
import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/storage';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function PurchaseReturnPanel() {
  // State for data
  const [products, setProducts] = useState([]);
  const [grns, setGrns] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selGrn, setSelGrn] = useState('');
  const [returnLines, setReturnLines] = useState([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [reason, setReason] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [discPct, setDiscPct] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showReturnQtyModal, setShowReturnQtyModal] = useState(false);
  const [selectedReturnLine, setSelectedReturnLine] = useState(null);
  const [returnQty, setReturnQty] = useState(1);

  // ── Load data on component mount ──────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Check if API is available (using window.api)
        if (window.api && typeof window.api.getProducts === 'function') {
          // Load from database via API
          const [productsData, grnsData, returnsData] = await Promise.all([
            window.api.getProducts(false),
            window.api.getGRNs(),
            window.api.getReturns()
          ]);
          
          console.log('📊 Loaded data:', {
            products: productsData?.length || 0,
            grns: grnsData?.length || 0,
            returns: returnsData?.length || 0
          });
          
          setProducts(productsData || []);
          setGrns(grnsData || []);
          setReturns(returnsData || []);
        } else {
          // Fallback to localStorage
          console.warn('⚠️ API not available, using localStorage fallback');
          const productsData = JSON.parse(localStorage.getItem('products') || '[]');
          const grnsData = JSON.parse(localStorage.getItem('grns') || '[]');
          const returnsData = JSON.parse(localStorage.getItem('returns') || '[]');
          setProducts(productsData);
          setGrns(grnsData);
          setReturns(returnsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast('Error loading data');
        // Fallback to localStorage
        try {
          const productsData = JSON.parse(localStorage.getItem('products') || '[]');
          const grnsData = JSON.parse(localStorage.getItem('grns') || '[]');
          const returnsData = JSON.parse(localStorage.getItem('returns') || '[]');
          setProducts(productsData);
          setGrns(grnsData);
          setReturns(returnsData);
        } catch (e) {
          setProducts([]);
          setGrns([]);
          setReturns([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // ── Derived values ──────────────────────────────────────

  const grnsArray = Array.isArray(grns) ? grns : [];
  const currentGrn = grnsArray.find(g => g.id === selGrn);

  const getAvailableProducts = () => {
    if (!currentGrn) return [];
    const existIds = returnLines.map(l => l.id);
    const lines = Array.isArray(currentGrn.lines) ? currentGrn.lines : [];
    return lines.filter(l => !existIds.includes(l.id));
  };

  const availableProducts = getAvailableProducts();

  // ── Handlers ──────────────────────────────────────────────

  const filterSuggs = (term) => {
    setSearch(term);
    if (!term || !currentGrn) { 
      setSuggestions([]); 
      return; 
    }
    const existIds = returnLines.map(l => l.id);
    const lines = Array.isArray(currentGrn.lines) ? currentGrn.lines : [];
    const matches = lines.filter(l => 
      !existIds.includes(l.id) && 
      l.name?.toLowerCase().includes(term.toLowerCase())
    );
    setSuggestions(matches);
  };

  const addReturnLine = (line) => {
    setSelectedReturnLine(line);
    setReturnQty(1);
    setShowReturnQtyModal(true);
  };

  const confirmReturnLine = () => {
    if (!selectedReturnLine) return;
    const qty = Math.min(returnQty, selectedReturnLine.qty || 1);
    if (qty <= 0) { 
      toast('Please enter a valid quantity'); 
      return; 
    }
    
    setReturnLines(prev => [...prev, { 
      ...selectedReturnLine, 
      returnQty: qty, 
      maxQty: selectedReturnLine.qty || 1, 
      refundTotal: qty * (selectedReturnLine.costPrice || selectedReturnLine.cost_price || 0), 
      grnRef: selGrn 
    }]);
    setSearch(''); 
    setSuggestions([]);
    setShowAllProducts(false);
    setShowReturnQtyModal(false);
    setSelectedReturnLine(null);
    toast(`✅ Added ${qty}×${selectedReturnLine.name} to return`);
  };

  const handleGrnChange = (grnId) => {
    setSelGrn(grnId);
    setReturnLines([]);
    setSearch('');
    setSuggestions([]);
    setShowAllProducts(true);
  };

  const sub = returnLines.reduce((s, l) => s + (l.refundTotal || 0), 0);
  const disc = sub * discPct / 100;
  const net = sub - disc;

  const saveReturn = async () => {
    if (!currentGrn || !returnLines.length) { 
      toast('Select GRN and add items'); 
      return; 
    }

    try {
      let returnId;
      
      // Check if API is available (using window.api)
      if (window.api && typeof window.api.getNextReturn === 'function') {
        // Get next ID from database
        returnId = await window.api.getNextReturn();
        console.log('📋 Generated return ID from API:', returnId);
      } else {
        // Generate ID from localStorage
        const existingReturns = JSON.parse(localStorage.getItem('returns') || '[]');
        const count = existingReturns.length + 1;
        returnId = `RTN${String(count).padStart(6, '0')}`;
        console.log('📋 Generated return ID from localStorage:', returnId);
      }
      
      const returnData = {
        id: returnId,
        grn_id: selGrn,
        supplier_name: currentGrn.supplierName || currentGrn.supplier_name,
        date: date,
        subtotal: sub,
        discount_percent: discPct,
        discount_amount: disc,
        net_total: net,
        pay_method: payMethod,
        reason: reason,
        lines: returnLines.map(l => ({
          product_id: l.id,
          name: l.name,
          code: l.code || null,
          return_qty: l.returnQty,
          max_qty: l.maxQty,
          cost_price: l.costPrice || l.cost_price || 0,
          refund_total: l.refundTotal,
          grn_ref: selGrn
        }))
      };

      console.log('📝 Saving purchase return:', returnData);

      // Save to database via API
      if (window.api && typeof window.api.createReturn === 'function') {
        console.log('💾 Calling API: createReturn');
        const result = await window.api.createReturn(returnData);
        console.log('✅ Database save result:', result);
      } else {
        console.warn('⚠️ API createReturn not available');
      }

      // Always save to localStorage as backup
      try {
        const existingReturns = JSON.parse(localStorage.getItem('returns') || '[]');
        // Check if already exists
        const exists = existingReturns.some(r => r.id === returnData.id);
        if (!exists) {
          const updatedReturns = [...existingReturns, returnData];
          localStorage.setItem('returns', JSON.stringify(updatedReturns));
          console.log('💾 Saved to localStorage backup');
        }
      } catch (e) {
        console.warn('Could not save to localStorage backup:', e);
      }

      // Update product stock in localStorage
      try {
        const existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
        const updatedProducts = existingProducts.map(p => {
          const line = returnLines.find(l => l.id === p.id);
          if (line) {
            const newStock = Math.max(0, (p.stock || 0) - (line.returnQty || 0));
            console.log(`📦 Updating product ${p.name} stock: ${p.stock} -> ${newStock}`);
            return { ...p, stock: newStock, active: newStock > 0 };
          }
          return p;
        });
        localStorage.setItem('products', JSON.stringify(updatedProducts));
        setProducts(updatedProducts);
      } catch (e) {
        console.warn('Could not update products in localStorage:', e);
      }

      // Refresh data from database via API
      if (window.api && typeof window.api.getReturns === 'function') {
        console.log('🔄 Refreshing data...');
        const [returnsData, productsData] = await Promise.all([
          window.api.getReturns(),
          window.api.getProducts(false)
        ]);
        console.log('📊 Refreshed returns:', returnsData?.length || 0);
        setReturns(returnsData || []);
        setProducts(productsData || []);
      } else {
        // Refresh from localStorage
        const returnsData = JSON.parse(localStorage.getItem('returns') || '[]');
        const productsData = JSON.parse(localStorage.getItem('products') || '[]');
        setReturns(returnsData);
        setProducts(productsData);
      }
      
      toast(`✅ Return ${returnId} processed successfully`);
      setReturnLines([]);
      setSelGrn('');
      setReason('');
      setDiscPct(0);
      setShowAllProducts(false);
      setSearch('');
      setSuggestions([]);
      
    } catch (error) {
      console.error('❌ Error saving return:', error);
      toast('Error saving return: ' + error.message);
    }
  };

  // ── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <GlassCard title="🔄 Purchase Return" badge="Loading...">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          <div>Loading data...</div>
        </div>
      </GlassCard>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div>
      <GlassCard title="🔄 Purchase Return" badge={`RTN${String((returns?.length || 0) + 1).padStart(6, '0')}`}>
        <div style={styles.grid2}>
          <div>
            <FormGrid>
              <Field label="Select GRN *">
                <select style={styles.input} value={selGrn} onChange={e => handleGrnChange(e.target.value)}>
                  <option value="">-- Select GRN --</option>
                  {grnsArray.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.id} | {g.supplierName || g.supplier_name} | {g.date}
                    </option>
                  ))}
                </select>
              </Field>
              {currentGrn && (
                <>
                  <Field label="Supplier">
                    <input style={styles.input} readOnly value={currentGrn.supplierName || currentGrn.supplier_name || ''} />
                  </Field>
                  <Field label="Return Date">
                    <input type="date" style={styles.input} value={date} onChange={e => setDate(e.target.value)} />
                  </Field>
                  <Field label="Pay Method">
                    <select style={styles.input} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                      <option>CASH</option>
                      <option>CARD</option>
                      <option>BANK TRANSFER</option>
                    </select>
                  </Field>
                </>
              )}
            </FormGrid>
          </div>
          
          <div>
            <Field label="🔍 Search Products from GRN">
              <div style={{ position: 'relative' }}>
                <input 
                  style={styles.input} 
                  value={search} 
                  onChange={e => filterSuggs(e.target.value)} 
                  placeholder="Type product name..." 
                  disabled={!currentGrn}
                  onFocus={() => {
                    if (currentGrn && availableProducts.length > 0) {
                      setShowAllProducts(true);
                      setSuggestions([]);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (suggestions.length === 0) {
                        setShowAllProducts(false);
                      }
                    }, 200);
                  }}
                />
                
                {currentGrn && showAllProducts && availableProducts.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: 280,
                    overflowY: 'auto',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    marginTop: 4,
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      fontWeight: 700,
                      fontSize: 12,
                      color: '#475569',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      borderRadius: '12px 12px 0 0',
                    }}>
                      <span>📦 Available Products ({availableProducts.length})</span>
                      <button 
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 16,
                          color: '#94a3b8',
                          padding: '0 4px',
                          borderRadius: '4px',
                        }}
                        onClick={() => setShowAllProducts(false)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    {availableProducts.map(p => (
                      <div 
                        key={p.id} 
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onClick={() => addReturnLine(p)}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            <span>📦 Qty: {p.qty}</span>
                            <span style={{ marginLeft: 12 }}>💰 Cost: LKR {p.costPrice || p.cost_price || 0}</span>
                            {p.code && <span style={{ marginLeft: 12 }}>🔖 {p.code}</span>}
                          </div>
                        </div>
                        <button 
                          style={{
                            padding: '4px 14px',
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 20,
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease',
                            boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            addReturnLine(p);
                          }}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                    
                    <div style={{
                      padding: '8px 14px',
                      background: '#f8fafc',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: 11,
                      color: '#94a3b8',
                      textAlign: 'center',
                      borderRadius: '0 0 12px 12px',
                    }}>
                      Click a product or press "Add" to include in return
                    </div>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: 280,
                    overflowY: 'auto',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    marginTop: 4,
                  }}>
                    {suggestions.map(p => (
                      <div 
                        key={p.id} 
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onClick={() => addReturnLine(p)}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            <span>📦 Qty: {p.qty}</span>
                            <span style={{ marginLeft: 12 }}>💰 Cost: LKR {p.costPrice || p.cost_price || 0}</span>
                          </div>
                        </div>
                        <button 
                          style={{
                            padding: '4px 14px',
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 20,
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            addReturnLine(p);
                          }}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {currentGrn && showAllProducts && availableProducts.length === 0 && returnLines.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    padding: '16px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    marginTop: 4,
                    textAlign: 'center',
                    color: '#64748b',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                    <div style={{ fontWeight: 600 }}>All products from this GRN have been added</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Total {returnLines.length} items in return list</div>
                    <button 
                      style={{
                        marginTop: 10,
                        padding: '6px 16px',
                        background: '#e2e8f0',
                        border: 'none',
                        borderRadius: 20,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#475569',
                      }}
                      onClick={() => setShowAllProducts(false)}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </Field>
            
            <Field label="Return Reason">
              <textarea 
                style={{ ...styles.input, resize: 'vertical' }} 
                rows={2} 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                placeholder="Reason for return (optional)" 
              />
            </Field>
          </div>
        </div>

        {/* Return Lines Table */}
        <div style={{ overflowX: 'auto', marginTop: 20 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['#', 'Product', 'Return Qty', 'Cost (LKR)', 'Total Refund (LKR)', 'Action'].map(h => 
                  <th key={h} style={styles.th}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {!returnLines.length && (
                <tr>
                  <td colSpan={6} style={styles.emptyTd}>
                    {currentGrn ? 'Select products from the dropdown above' : 'Select a GRN to start'}
                  </td>
                </tr>
              )}
              {returnLines.map((l, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fafafa' : 'transparent' }}>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={styles.td}>
                    <strong>{l.name}</strong>
                    {l.code && <div style={{ fontSize: 10, color: '#94a3b8' }}>Code: {l.code}</div>}
                  </td>
                  <td style={styles.td}>
                    <input 
                      style={{ ...styles.input, width: 70, textAlign: 'center' }} 
                      type="number" 
                      value={l.returnQty || 1} 
                      min={1} 
                      max={l.maxQty || 1} 
                      onChange={e => { 
                        const q = Math.min(+e.target.value, l.maxQty || 1) || 1; 
                        setReturnLines(prev => prev.map((x, j) => 
                          j === i ? { ...x, returnQty: q, refundTotal: q * (x.costPrice || x.cost_price || 0) } : x
                        )); 
                      }} 
                    />
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Max: {l.maxQty}</div>
                  </td>
                  <td style={styles.td}>LKR {(l.costPrice || l.cost_price || 0).toFixed(2)}</td>
                  <td style={styles.td}>
                    <strong style={{ color: '#0f766e' }}>LKR {(l.refundTotal || 0).toFixed(2)}</strong>
                  </td>
                  <td style={styles.td}>
                    <button 
                      style={styles.btnDanger} 
                      onClick={() => setReturnLines(prev => prev.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Return Qty Modal */}
        {showReturnQtyModal && selectedReturnLine && (
          <Modal 
            title={`Return Quantity - ${selectedReturnLine.name}`} 
            onClose={() => setShowReturnQtyModal(false)}
          >
            <div style={{ padding: '10px 0' }}>
              <div style={{ marginBottom: 16 }}>
                <div><strong>Product:</strong> {selectedReturnLine.name}</div>
                <div><strong>Available Quantity:</strong> {selectedReturnLine.qty || 0}</div>
                <div><strong>Cost Price:</strong> LKR {selectedReturnLine.costPrice || selectedReturnLine.cost_price || 0}</div>
              </div>
              
              <Field label="Return Quantity *">
                <input 
                  type="number" 
                  style={styles.input} 
                  value={returnQty} 
                  min={1} 
                  max={selectedReturnLine.qty || 1}
                  onChange={e => setReturnQty(Math.min(parseInt(e.target.value) || 1, selectedReturnLine.qty || 1))} 
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Max: {selectedReturnLine.qty || 0}
                </div>
              </Field>
              
              <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', borderRadius: 8 }}>
                <div><strong>Refund Amount:</strong> LKR {((returnQty || 0) * (selectedReturnLine.costPrice || selectedReturnLine.cost_price || 0)).toFixed(2)}</div>
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button style={styles.btnPrimary} onClick={confirmReturnLine}>
                  ✅ Add to Return
                </button>
                <button style={styles.btnOutline} onClick={() => setShowReturnQtyModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Summary */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4,1fr)', 
          gap: 12, 
          marginTop: 20,
        }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Subtotal</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>LKR {sub.toFixed(2)}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Discount %</div>
            <input type="number" style={{ ...styles.input, marginTop: 4 }} value={discPct} onChange={e => setDiscPct(+e.target.value)} min={0} max={100} />
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Discount Amount</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>LKR {disc.toFixed(2)}</div>
          </div>
          <div style={{ background: '#dbeafe', padding: 14, borderRadius: 12, border: '2px solid #2563eb' }}>
            <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>Net Refund</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>LKR {net.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={saveReturn}>
            💾 Process Return & Restock
          </button>
          <button 
            style={styles.btnOutline} 
            onClick={() => { 
              setReturnLines([]); 
              setSelGrn(''); 
              setReason(''); 
              setDiscPct(0);
              setShowAllProducts(false);
              setSearch('');
              setSuggestions([]);
            }}
          >
            🗑️ Clear All
          </button>
          {currentGrn && availableProducts.length > 0 && (
            <button 
              style={{ ...styles.btnOutline, background: showAllProducts ? '#dbeafe' : 'transparent' }} 
              onClick={() => setShowAllProducts(!showAllProducts)}
            >
              {showAllProducts ? '📦 Hide Products' : '📦 Show Products'}
            </button>
          )}
          {returnLines.length > 0 && (
            <button 
              style={{ ...styles.btnOutline, color: '#dc2626', borderColor: '#dc2626' }} 
              onClick={() => {
                if (window.confirm('Remove all items from return list?')) {
                  setReturnLines([]);
                }
              }}
            >
              🗑️ Clear Items
            </button>
          )}
        </div>
      </GlassCard>

      {/* Return History */}
      <GlassCard title="📋 Return History" badge={(returns?.length || 0)}>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {[...(returns || [])].reverse().map(r => (
            <div key={r.id} style={styles.histItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong style={{ color: '#2563eb' }}>{r.id}</strong>
                  <span style={{ marginLeft: 10, color: '#64748b' }}>📅 {r.date}</span>
                  <span style={{ marginLeft: 10 }}>🏢 {r.supplier_name || r.supplierName}</span>
                </div>
                <div>
                  <strong style={{ color: '#0f766e' }}>LKR {(r.net_total || r.netTotal || 0).toFixed(2)}</strong>
                  <span style={{ marginLeft: 10, background: '#e2e8f0', padding: '2px 10px', borderRadius: 12, fontSize: 11 }}>
                    {r.pay_method || r.payMethod || 'CASH'}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                GRN: {r.grn_id || r.grnId} | Items: {r.lines?.length || 0} | 
                {r.reason && <span> Reason: {r.reason}</span>}
              </div>
              {r.lines && r.lines.length > 0 && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  {r.lines.map((l, idx) => (
                    <span key={idx}>
                      {l.name} (×{l.return_qty || l.returnQty || l.qty || 1}){idx < r.lines.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!returns || returns.length === 0) && (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No return records yet</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}