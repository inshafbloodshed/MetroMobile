import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { padId } from '../../utils/helpers';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';
import { encryptCost, decryptCost } from '../../utils/encryption';
import { genBarcodeNumber, barcodeSVGString } from '../../utils/barcode';
import { BarcodePrintModal } from './BarcodePrintModal';

// ─────────────────────────────────────────────────────────────
//  MAIN GRNPanel
// ─────────────────────────────────────────────────────────────

export function GRNPanel({ user }) {
  const [products, setProducts] = useState(() => load(SK.PRODUCTS, []));
  const [suppliers, setSuppliers] = useState(() => load(SK.SUPPLIERS, []));
  const [grns, setGrns] = useState(() => load(SK.GRNS, []));

  const [lines, setLines] = useState([]);
  const [supplier, setSupplier] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billType, setBillType] = useState('CASH');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [settled, setSettled] = useState(true);

  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [histSearch, setHistSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [newProd, setNewProd] = useState({
    name: '', code: '', cost: 0, sell: 0, category: 'DISPLAY', stock: 0,
    brand: '', model: '', color: '', nature: '', storage: '',
    compatible: '', supplierWarranty: 'NO WARRANTY', customerWarranty: 'NO WARRANTY',
    supplierId: '',
  });
  const [pendingName, setPendingName] = useState('');

  // Add Line Modal states - REPLACES prompt()
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lineQty, setLineQty] = useState(1);
  const [lineCost, setLineCost] = useState(0);
  const [lineSell, setLineSell] = useState(0);

  // Barcode print modal state
  const [barcodesToPrint, setBarcodesToPrint] = useState([]);
  const [savedGrnId, setSavedGrnId] = useState('');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // ── helpers ──────────────────────────────────────────────

  const nextGRN = () => padId(grns, 'PUR');

  const filterSuggs = (term) => {
    setSearch(term);
    if (!term.trim()) { setSuggestions([]); return; }
    
    const matches = products.filter(p => {
      const fromSelectedSupplier = !supplier || p.supplierId === supplier;
      const isActive = p.active !== false;
      const matchesSearch = p.name?.toLowerCase().includes(term.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(term.toLowerCase());
      
      return fromSelectedSupplier && isActive && matchesSearch;
    });
    
    setSuggestions(matches);
  };

  // UPDATED: Opens modal instead of using prompt()
  const addLine = (prod) => {
    setSelectedProduct(prod);
    setLineQty(1);
    setLineCost(prod.cost || 0);
    setLineSell(prod.sell || 0);
    setShowAddLineModal(true);
  };

  // Confirms adding the line from modal
  const confirmAddLine = () => {
    if (!selectedProduct) {
      toast('No product selected');
      return;
    }

    const qty = Math.max(1, lineQty || 1);
    const cost = Math.max(0, lineCost || selectedProduct.cost || 0);
    const sell = Math.max(0, lineSell || selectedProduct.sell || 0);

    setLines(prev => {
      const existing = prev.find(l => l.id === selectedProduct.id);
      
      if (existing) {
        return prev.map(l => 
          l.id === selectedProduct.id
            ? { 
                ...l, 
                qty: l.qty + qty, 
                costPrice: cost,
                sellPrice: sell,
                total: (l.qty + qty) * cost 
              }
            : l
        );
      }
      
      return [...prev, {
        id: selectedProduct.id,
        name: selectedProduct.name,
        code: selectedProduct.code || '',
        qty,
        costPrice: cost,
        sellPrice: sell,
        total: qty * cost,
        brand: selectedProduct.brand || '',
        model: selectedProduct.model || '',
      }];
    });

    setShowAddLineModal(false);
    setSelectedProduct(null);
    setSearch('');
    setSuggestions([]);
    toast(`✅ Added ${qty}×${selectedProduct.name}`);
  };

  const createAndAdd = () => {
    if (!newProd.name || !newProd.code || !newProd.cost) {
      toast('Name, Code, Cost required'); return;
    }
    if (!supplier) {
      toast('Please select a supplier first'); return;
    }
    
    const sup = suppliers.find(s => s.id === supplier);
    
    const p = {
      id: products.length ? Math.max(...products.map(x => x.id)) + 1 : 1,
      ...newProd,
      supplierId: supplier,
      supplierName: sup?.name || '',
      compatible: newProd.compatible ? newProd.compatible.split(',').map(s => s.trim()).filter(s => s) : [],
      margin: (((newProd.sell - newProd.cost) / newProd.cost) * 100).toFixed(1),
      stock: 0, active: true, reorderLevel: 5,
      supplierWarranty: newProd.supplierWarranty || 'NO WARRANTY',
      customerWarranty: newProd.customerWarranty || 'NO WARRANTY',
    };
    const updated = [...products, p];
    save(SK.PRODUCTS, updated);
    setProducts(updated);
    setShowModal(false);
    // Open add line modal for the new product
    setSelectedProduct(p);
    setLineQty(1);
    setLineCost(p.cost || 0);
    setLineSell(p.sell || 0);
    setShowAddLineModal(true);
  };

  // ── SAVE GRN ──────────────────────────────────────────────

  const saveGRN = () => {
    if (!supplier) { toast('Select supplier'); return; }
    if (!lines.length) { toast('Add products'); return; }

    const sup = suppliers.find(s => s.id === supplier);
    const sub = lines.reduce((s, l) => s + l.total, 0);
    const grnId = nextGRN();
    const grnSeqNum = parseInt(grnId.replace(/\D/g, '')) || 0;

    const linesWithBarcodes = lines.map((l, i) => ({
      ...l,
      barcodeNum: genBarcodeNumber(l.id, grnSeqNum, i),
      encryptedCost: encryptCost(l.costPrice),
    }));

    const grn = {
      id: grnId,
      supplierId: supplier,
      supplierName: sup?.name || '',
      billNo, billType, date,
      lines: linesWithBarcodes,
      subTotal: sub,
      discount: +discount,
      netTotal: sub - discount,
      amtPaid: +paid,
      settled,
      createdBy: user?.username || 'ADMIN',
    };

    const updGrns = [...grns, grn];
    setGrns(updGrns);
    save(SK.GRNS, updGrns);

    const updProds = products.map(p => {
      const l = linesWithBarcodes.find(x => x.id === p.id);
      if (!l) return p;
      return {
        ...p,
        stock: p.stock + l.qty,
        cost: l.costPrice,
        sell: l.sellPrice,
        active: true,
        barcode: l.barcodeNum,
        margin: (((l.sellPrice - l.costPrice) / l.costPrice) * 100).toFixed(1),
      };
    });
    save(SK.PRODUCTS, updProds);
    setProducts(updProds);

    toast(`✅ ${grnId} saved — opening barcode print`);

    setBarcodesToPrint(linesWithBarcodes);
    setSavedGrnId(grnId);
    setShowBarcodeModal(true);

    setLines([]); setSearch(''); setBillNo(''); setPaid(0); setDiscount(0);
  };

  // ── Derived values ────────────────────────────────────────

  const sub = lines.reduce((s, l) => s + l.total, 0);
  const balance = Math.max(0, sub - discount - paid);
  const filtered = [...grns].reverse().filter(g =>
    !histSearch ||
    g.id.toLowerCase().includes(histSearch.toLowerCase()) ||
    g.supplierName.toLowerCase().includes(histSearch.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div>

      {/* ── Purchase GRN Header ───────────────────────────── */}
      <GlassCard title="📋 Purchase GRN" badge={nextGRN()}>
        <div style={styles.grid2}>

          <div>
            <FormGrid>
              <Field label="Supplier *">
                <select style={styles.input} value={supplier} onChange={e => {
                  setSupplier(e.target.value);
                  setSuggestions([]);
                }}>
                  <option value="">-- Select --</option>
                  {suppliers.filter(s => s.active !== false).map(s =>
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  )}
                </select>
              </Field>
              <Field label="Bill Number">
                <input style={styles.input} value={billNo}
                  onChange={e => setBillNo(e.target.value)} placeholder="INV-001" />
              </Field>
              <Field label="Bill Type">
                <select style={styles.input} value={billType} onChange={e => setBillType(e.target.value)}>
                  <option>CASH</option><option>CREDIT</option>
                </select>
              </Field>
              <Field label="Date">
                <input type="date" style={styles.input} value={date}
                  onChange={e => setDate(e.target.value)} />
              </Field>
            </FormGrid>
          </div>
          <div style={{ position: 'relative' }}>
            <Field label="🔍 Smart Product Search">
              <input
                style={styles.input}
                value={search}
                onChange={e => filterSuggs(e.target.value)}
                placeholder={`Type product name or code... ${supplier ? '(Filtered by supplier)' : '(Select supplier first)'}`}
                disabled={!supplier}
              />
              {!supplier && (
                <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                  ⚠️ Please select a supplier to search products
                </div>
              )}
              {suggestions.length > 0 && (
                <div style={styles.suggTableBox}>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                    Showing products from selected supplier ({suggestions.length} found)
                  </div>
                  <table style={styles.suggTable}>
                    <thead>
                      <tr style={styles.suggTableHeader}>
                        <th style={styles.suggTableTh}>Product Name</th>
                        <th style={styles.suggTableTh}>Code</th>
                        <th style={styles.suggTableTh}>Brand/Model</th>
                        <th style={styles.suggTableTh}>Price</th>
                        <th style={styles.suggTableTh}>Stock</th>
                        <th style={styles.suggTableTh}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestions.map(p => (
                        <tr
                          key={p.id}
                          style={styles.suggTableRow}
                          onClick={() => addLine(p)}
                          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          <td style={styles.suggTableTd}>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>{p.category || 'Uncategorized'}</div>
                          </td>
                          <td style={styles.suggTableTd}>
                            <span style={styles.codeBadge}>{p.code || 'N/A'}</span>
                          </td>
                          <td style={styles.suggTableTd}>
                            <div style={{ fontSize: 12 }}>{p.brand || '-'}</div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>{p.model || '-'}</div>
                          </td>
                          <td style={styles.suggTableTd}>
                            <span style={{ fontWeight: 700, color: '#059669' }}>LKR {p.sell}</span>
                            <div style={{ fontSize: 12, color: '#000000'}}>
                              Cost: LKR {p.cost}
                            </div>
                          </td>
                          <td style={styles.suggTableTd}>
                            <span style={p.stock <= 3 ? styles.badgeLow : styles.badgeOk}>
                              {p.stock} left
                            </span>
                          </td>
                          <td style={styles.suggTableTd}>
                            <button
                              style={styles.suggAddBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                addLine(p);
                              }}
                            >
                              + Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div
                    style={styles.suggCreate}
                    onClick={() => {
                      setPendingName(search);
                      setNewProd(n => ({
                        ...n,
                        name: search,
                        code: search.toUpperCase().replace(/ /g, '-').substring(0, 15),
                        supplierId: supplier,
                      }));
                      setShowModal(true);
                      setSuggestions([]);
                    }}
                  >
                    ➕ CREATE NEW PRODUCT: "{search}"
                  </div>
                </div>
              )}
            </Field>
          </div>

        </div>
      </GlassCard>

      {/* ── Products in GRN ──────────────────────────────── */}
      <GlassCard title="🛒 Products in GRN" badge={`${lines.length} items`}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Product', 'Qty', 'Cost (LKR)', 'Sell (LKR)', 'Total', ''].map(h =>
                <th key={h} style={styles.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {!lines.length && (
              <tr><td colSpan={6} style={styles.emptyTd}>Add products above</td></tr>
            )}
            {lines.map(l => (
              <tr key={l.id}>
                <td style={styles.td}>
                  <strong>{l.name}</strong>
                  <br />
                  <small style={{ color: '#94a3b8' }}>
                    ID:{l.id} {l.code ? `| ${l.code}` : ''}
                    {l.brand && ` | ${l.brand}`}
                    {l.model && ` | ${l.model}`}
                  </small>
                </td>
                <td style={styles.td}>
                  <input
                    style={{ ...styles.input, width: 70 }}
                    type="number" value={l.qty} min={1}
                    onChange={e => {
                      const q = +e.target.value || 1;
                      setLines(prev => prev.map(x =>
                        x.id === l.id ? { ...x, qty: q, total: q * x.costPrice } : x
                      ));
                    }}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={{ ...styles.input, width: 95 }}
                    type="number" value={l.costPrice}
                    onChange={e => {
                      const c = +e.target.value;
                      setLines(prev => prev.map(x =>
                        x.id === l.id ? { ...x, costPrice: c, total: x.qty * c } : x
                      ));
                    }}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={{ ...styles.input, width: 95 }}
                    type="number" value={l.sellPrice}
                    onChange={e => setLines(prev => prev.map(x =>
                      x.id === l.id ? { ...x, sellPrice: +e.target.value } : x
                    ))}
                  />
                </td>
                <td style={styles.td}>LKR {l.total.toLocaleString()}</td>
                <td style={styles.td}>
                  <button style={styles.btnDanger}
                    onClick={() => setLines(prev => prev.filter(x => x.id !== l.id))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 24,
          marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12,
        }}>
          <span>Total Qty: <strong>{lines.reduce((s, l) => s + l.qty, 0)}</strong></span>
          <span>Subtotal: <strong>LKR {sub.toLocaleString()}</strong></span>
        </div>
      </GlassCard>

      {/* ── Payment ──────────────────────────────────────── */}
      <GlassCard title="💰 Payment">
        <FormGrid cols={4}>
          <Field label="Discount">
            <input type="number" style={styles.input} value={discount}
              onChange={e => setDiscount(+e.target.value)} />
          </Field>
          <Field label="Paid (LKR)">
            <input type="number" style={styles.input} value={paid}
              onChange={e => setPaid(+e.target.value)} />
          </Field>
          <Field label="Balance">
            <input style={{ ...styles.input, color: '#ef4444', fontWeight: 700 }}
              readOnly value={balance.toFixed(2)} />
          </Field>
          <Field label="Settled">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10 }}>
              <input type="checkbox" checked={settled}
                onChange={e => setSettled(e.target.checked)} /> Fully Settled
            </label>
          </Field>
        </FormGrid>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button style={styles.btnPrimary} onClick={saveGRN}>
            💾 Save GRN &amp; Print Barcodes
          </button>
          <button style={styles.btnOutline} onClick={() => setLines([])}>
            📄 New GRN
          </button>
        </div>
      </GlassCard>

      {/* ── Purchase History ──────────────────────────────── */}
      <GlassCard title="📜 Purchase History" badge={filtered.length}>
        <input
          style={{ ...styles.input, marginBottom: 12 }}
          placeholder="Search by GRN ID or supplier..."
          value={histSearch}
          onChange={e => setHistSearch(e.target.value)}
        />
        {filtered.map(g => (
          <div key={g.id} style={{ ...styles.histItem, cursor: 'pointer' }}
            onClick={() => setSelectedGrn(g)}>
            <div>
              <strong>{g.id}</strong> | {g.date} | 🏢 {g.supplierName}
            </div>
            <div>
              LKR {g.subTotal.toLocaleString()} |&nbsp;
              {g.lines.reduce((s, l) => s + l.qty, 0)} units
            </div>
          </div>
        ))}
      </GlassCard>

      {/* ── GRN Detail Modal ──────────────────────────────── */}
      {selectedGrn && (
        <Modal title={`GRN Details: ${selectedGrn.id}`} onClose={() => setSelectedGrn(null)}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', minWidth: 520 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><strong>Supplier</strong><div>{selectedGrn.supplierName}</div></div>
              <div><strong>Date</strong><div>{selectedGrn.date}</div></div>
              <div><strong>Bill No.</strong><div>{selectedGrn.billNo || '—'}</div></div>
              <div><strong>Type</strong><div>{selectedGrn.billType || 'CASH'}</div></div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Product', 'Qty', 'Cost', 'Sell', 'Total', 'Barcode', 'Enc.Cost'].map(h =>
                      <th key={h} style={styles.th}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedGrn.lines.map(line => (
                    <tr key={line.id}>
                      <td style={styles.td}>{line.name}</td>
                      <td style={styles.td}>{line.qty}</td>
                      <td style={styles.td}>LKR {line.costPrice}</td>
                      <td style={styles.td}>LKR {line.sellPrice}</td>
                      <td style={styles.td}>LKR {line.total.toLocaleString()}</td>
                      <td style={styles.td}><small>{line.barcodeNum || '—'}</small></td>
                      <td style={{ ...styles.td, fontWeight: 700, color: '#16a34a' }}>
                        {line.encryptedCost || encryptCost(line.costPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: 16, fontWeight: 700,
            }}>
              <span>Total units: {selectedGrn.lines.reduce((s, l) => s + l.qty, 0)}</span>
              <span>Subtotal: LKR {selectedGrn.subTotal.toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <button
                style={styles.btnPrimary}
                onClick={() => {
                  const grnSeqNum = parseInt(selectedGrn.id.replace(/\D/g, '')) || 0;
                  setBarcodesToPrint(selectedGrn.lines.map((l, i) => ({
                    ...l,
                    barcodeNum: l.barcodeNum || genBarcodeNumber(l.id, grnSeqNum, i),
                    encryptedCost: l.encryptedCost || encryptCost(l.costPrice),
                  })));
                  setSavedGrnId(selectedGrn.id);
                  setSelectedGrn(null);
                  setShowBarcodeModal(true);
                }}
              >
                🏷️ Reprint Barcodes
              </button>
              <button style={styles.btnOutline} onClick={() => setSelectedGrn(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── New Product Modal ─────────────────────────────── */}
      {showModal && (
        <Modal title="➕ New Product" onClose={() => setShowModal(false)}>
          <FormGrid>
            <Field label="Product Name *">
              <input style={styles.input} value={newProd.name}
                onChange={e => setNewProd(n => ({ ...n, name: e.target.value }))} />
            </Field>
            <Field label="Product Code *">
              <input style={styles.input} value={newProd.code}
                onChange={e => setNewProd(n => ({ ...n, code: e.target.value }))} />
            </Field>
            <Field label="Brand">
              <input style={styles.input} value={newProd.brand || ''}
                onChange={e => setNewProd(n => ({ ...n, brand: e.target.value }))} />
            </Field>
            <Field label="Model">
              <input style={styles.input} value={newProd.model || ''}
                onChange={e => setNewProd(n => ({ ...n, model: e.target.value }))} />
            </Field>
            <Field label="Color">
              <input style={styles.input} value={newProd.color || ''}
                onChange={e => setNewProd(n => ({ ...n, color: e.target.value }))} />
            </Field>
            <Field label="Nature/Type">
              <input style={styles.input} value={newProd.nature || ''}
                onChange={e => setNewProd(n => ({ ...n, nature: e.target.value }))} />
            </Field>
            <Field label="Category">
              <select style={styles.input} value={newProd.category}
                onChange={e => setNewProd(n => ({ ...n, category: e.target.value }))}>
                {['ACCESSORY', 'BATTERY', 'CHARGER', 'DISPLAY', 'TOOLS'].map(c =>
                  <option key={c}>{c}</option>
                )}
              </select>
            </Field>
            <Field label="Purchase Cost">
              <input type="number" style={styles.input} value={newProd.cost}
                onChange={e => setNewProd(n => ({ ...n, cost: +e.target.value }))} />
            </Field>
            <Field label="Selling Price">
              <input type="number" style={styles.input} value={newProd.sell}
                onChange={e => setNewProd(n => ({ ...n, sell: +e.target.value }))} />
            </Field>
            <Field label="Initial Stock">
              <input type="number" style={styles.input} value={newProd.stock}
                onChange={e => setNewProd(n => ({ ...n, stock: +e.target.value }))} />
            </Field>
            <Field label="Storage Location">
              <input style={styles.input} value={newProd.storage || ''}
                onChange={e => setNewProd(n => ({ ...n, storage: e.target.value }))} />
            </Field>
            <Field label="Supplier Warranty">
              <select style={styles.input} value={newProd.supplierWarranty}
                onChange={e => setNewProd(n => ({ ...n, supplierWarranty: e.target.value }))}>
                {['NO WARRANTY', '7 DAYS', '14 DAYS', '30 DAYS'].map(w =>
                  <option key={w}>{w}</option>
                )}
              </select>
            </Field>
            <Field label="Customer Warranty">
              <select style={styles.input} value={newProd.customerWarranty}
                onChange={e => setNewProd(n => ({ ...n, customerWarranty: e.target.value }))}>
                {['NO WARRANTY', '7 DAYS', '14 DAYS', '30 DAYS'].map(w =>
                  <option key={w}>{w}</option>
                )}
              </select>
            </Field>
            <Field label="Supplier *">
              <input style={styles.input} value={suppliers.find(s => s.id === supplier)?.name || 'No supplier selected'} disabled />
              <input type="hidden" value={newProd.supplierId} />
            </Field>
          </FormGrid>
          <Field label="🔗 Compatible Devices (comma separated)">
            <textarea 
              style={{ ...styles.input, resize: 'vertical' }} 
              rows={3} 
              value={newProd.compatible || ''} 
              onChange={e => setNewProd(n => ({ ...n, compatible: e.target.value }))} 
              placeholder="e.g., iPhone 12, Samsung S21, Google Pixel 6"
            />
          </Field>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={styles.btnPrimary} onClick={createAndAdd}>
              💾 Save &amp; Add to GRN
            </button>
            <button style={styles.btnOutline} onClick={() => setShowModal(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Add Line Modal (REPLACES prompt()) ────────────── */}
      {showAddLineModal && selectedProduct && (
        <Modal 
          title={`Add ${selectedProduct.name} to GRN`} 
          onClose={() => setShowAddLineModal(false)}
        >
          <div style={{ padding: '10px 0' }}>
            <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><strong>Product:</strong> {selectedProduct.name}</div>
              <div><strong>Code:</strong> {selectedProduct.code || 'N/A'}</div>
              <div><strong>Current Cost:</strong> LKR {selectedProduct.cost}</div>
              <div><strong>Current Sell:</strong> LKR {selectedProduct.sell}</div>
              {selectedProduct.brand && <div><strong>Brand:</strong> {selectedProduct.brand}</div>}
              {selectedProduct.model && <div><strong>Model:</strong> {selectedProduct.model}</div>}
            </div>
            
            <FormGrid>
              <Field label="Quantity *">
                <input 
                  type="number" 
                  style={styles.input} 
                  value={lineQty} 
                  min={1}
                  onChange={e => setLineQty(parseInt(e.target.value) || 1)} 
                />
              </Field>
              <Field label="Purchase Cost (LKR)">
                <input 
                  type="number" 
                  style={styles.input} 
                  value={lineCost} 
                  min={0}
                  step={0.01}
                  onChange={e => setLineCost(parseFloat(e.target.value) || 0)} 
                />
              </Field>
              <Field label="Selling Price (LKR)">
                <input 
                  type="number" 
                  style={styles.input} 
                  value={lineSell} 
                  min={0}
                  step={0.01}
                  onChange={e => setLineSell(parseFloat(e.target.value) || 0)} 
                />
              </Field>
            </FormGrid>
            
            <div style={{ marginTop: 12, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
              <div><strong>Total:</strong> LKR {(lineQty * lineCost).toLocaleString()}</div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button style={styles.btnPrimary} onClick={confirmAddLine}>
                ✅ Add to GRN
              </button>
              <button style={styles.btnOutline} onClick={() => setShowAddLineModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Barcode Print Modal ───────────────────────────── */}
      {showBarcodeModal && (
        <BarcodePrintModal
          lines={barcodesToPrint}
          grnId={savedGrnId}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}

    </div>
  );
}