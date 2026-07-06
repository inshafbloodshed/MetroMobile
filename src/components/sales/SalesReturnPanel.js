import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { padId } from '../../utils/helpers';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Field } from '../common/Field';

export function SalesReturnPanel() {
  const [products, setProducts] = useState(() => load(SK.PRODUCTS, []));
  const [sales] = useState(() => load(SK.SALES, []));
  const [srs, setSrs] = useState(() => load(SK.SR, []));
  const [invId, setInvId] = useState('');
  const [currentInv, setCurrentInv] = useState(null);
  const [checked, setChecked] = useState({});
  const [returnQty, setReturnQty] = useState({});
  const [reasons, setReasons] = useState({});
  const [restock, setRestock] = useState({});
  const [returnType, setReturnType] = useState('REFUND');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [restockFee, setRestockFee] = useState(0);
  const [refundRef, setRefundRef] = useState('');
  const [srRemarks, setSrRemarks] = useState('');
  const [exchangeCart, setExchangeCart] = useState([]);
  const [exchSearch, setExchSearch] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [histSearch, setHistSearch] = useState('');
  const [selectedSR, setSelectedSR] = useState(null);

  const nextSR = () => padId(srs, 'SR', 5);

  const loadInv = () => {
    const inv = sales.find(i => i.id === invId.toUpperCase().trim());
    if (!inv) { toast('❌ Invoice not found'); return; }
    setCurrentInv(inv);
    const qtyMap = {}, cbMap = {}, reasonMap = {}, restockMap = {};
    inv.lines.forEach((l, i) => { qtyMap[i] = l.qty; cbMap[i] = false; reasonMap[i] = 'DEFECTIVE'; restockMap[i] = true; });
    setReturnQty(qtyMap); setChecked(cbMap); setReasons(reasonMap); setRestock(restockMap);
    setExchangeCart([]);
    toast(`✅ Invoice ${inv.id} loaded`);
  };

  const returnedItems = currentInv ? currentInv.lines.filter((_, i) => checked[i]).map((l, _, __, idx = currentInv.lines.indexOf(l)) => ({
    productId: l.id, productName: l.name, returnQty: +returnQty[idx] || 1, sellPrice: l.sellPrice, refundAmt: (+returnQty[idx] || 1) * l.sellPrice, reason: reasons[idx] || 'DEFECTIVE', restock: restock[idx] !== false
  })) : [];

  const retSub = returnedItems.reduce((s, i) => s + i.refundAmt, 0);
  const netRefund = Math.max(0, retSub - restockFee);
  const exchVal = exchangeCart.reduce((s, i) => s + i.qty * i.price, 0);
  const netDue = returnType === 'EXCHANGE' ? netRefund - exchVal : netRefund;

  const addExch = (p) => { setExchangeCart(prev => { const ex = prev.find(i => i.id === p.id); return ex ? prev.map(i => i.id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock) } : i) : [...prev, { id: p.id, name: p.name, qty: 1, price: p.sell, maxStock: p.stock }]; }); };

  const processSR = () => {
    if (!currentInv || !returnedItems.length) { toast('Select items to return'); return; }
    const sr = { id: nextSR(), invoiceId: currentInv.id, customer: currentInv.customer, mobile: currentInv.mobile || '', invoiceDate: currentInv.date, returnDate, returnType, returnedItems, exchangeItems: [...exchangeCart], returnSubtotal: retSub, restockFee: +restockFee, netRefund, exchangeValue: exchVal, netBalance: netDue, refundMethod, refundRef, remarks: srRemarks, processedBy: 'ADMIN', createdAt: new Date().toISOString() };
    const updSrs = [...srs, sr]; setSrs(updSrs); save(SK.SR, updSrs);
    const updP = products.map(p => {
      const ri = returnedItems.find(i => i.productId === p.id);
      const ei = exchangeCart.find(i => i.id === p.id);
      let st = p.stock;
      if (ri && ri.restock) st += ri.returnQty;
      if (ei) st = Math.max(0, st - ei.qty);
      return st !== p.stock ? { ...p, stock: st, active: st > 0 } : p;
    });
    save(SK.PRODUCTS, updP); setProducts(updP);
    toast(`✅ Return ${sr.id} processed — LKR ${netRefund.toFixed(2)} refund`);
    clearSR();
  };

  const clearSR = () => { setCurrentInv(null); setInvId(''); setChecked({}); setReturnQty({}); setExchangeCart([]); setRestockFee(0); setSrRemarks(''); setRefundRef(''); setReturnType('REFUND'); };

  const filtHist = [...srs].reverse().filter(sr => !histSearch || sr.id.toLowerCase().includes(histSearch.toLowerCase()) || sr.invoiceId.toLowerCase().includes(histSearch.toLowerCase()) || sr.customer.toLowerCase().includes(histSearch.toLowerCase()));

  const exchProds = products.filter(p => p.active !== false && p.stock > 0 && p.name.toLowerCase().includes(exchSearch.toLowerCase()));

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#0d9488)', color: '#fff', borderRadius: '24px 24px 0 0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ fontSize: 20, fontWeight: 800 }}>↩️ Sales Return Center</div><div style={{ fontSize: 13, opacity: 0.85 }}>Full refund, exchange, or store credit</div></div>
        <span style={{ background: 'rgba(255,255,255,.2)', color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{nextSR()}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.3)', borderTop: 'none', borderRadius: '0 0 24px 24px', marginBottom: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div style={styles.grid2}>
          <div style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: '#0f766e' }}>Step 1: Find Sales Invoice</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input style={{ ...styles.input, flex: 1 }} value={invId} onChange={e => setInvId(e.target.value)} placeholder="e.g. INV00001" />
              <button style={{ ...styles.btnPrimary, background: '#0d9488', padding: '10px 16px' }} onClick={loadInv}>Load</button>
            </div>
            {currentInv && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#f0fdf9', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>CUSTOMER</div><div style={{ fontWeight: 700 }}>{currentInv.customer}</div></div>
                <div style={{ background: '#f0fdf9', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>INVOICE TOTAL</div><div style={{ fontWeight: 700 }}>LKR {(currentInv.payable || 0).toFixed(2)}</div></div>
              </div>
              <div style={{ fontWeight: 700, marginBottom: 10, color: '#0f766e' }}>Step 2: Select Items to Return</div>
              <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto', borderRadius: 10, border: '1px solid #99f6e4' }}>
                <table style={{ ...styles.table, minWidth: 580 }}>
                  <thead><tr style={{ background: '#0f766e', color: '#fff' }}>{['↩️', 'Product', 'Sold', 'Ret.Qty', 'Unit Price', 'Refund', 'Reason', 'Restock?'].map(h => <th key={h} style={{ ...styles.th, color: '#fff', background: 'transparent' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {currentInv.lines.map((l, i) => (
                      <tr key={i} style={{ background: checked[i] ? '#f0fdf9' : '' }}>
                        <td style={styles.td}><input type="checkbox" checked={!!checked[i]} onChange={e => setChecked(prev => ({ ...prev, [i]: e.target.checked }))} /></td>
                        <td style={styles.td}><strong>{l.name}</strong></td>
                        <td style={styles.td}>{l.qty}</td>
                        <td style={styles.td}><input type="number" style={{ ...styles.input, width: 65 }} disabled={!checked[i]} value={returnQty[i] || l.qty} min={1} max={l.qty} onChange={e => setReturnQty(prev => ({ ...prev, [i]: Math.min(+e.target.value, l.qty) || 1 }))} /></td>
                        <td style={styles.td}>LKR {(l.sellPrice || 0).toFixed(2)}</td><td style={{ ...styles.td, fontWeight: 700, color: '#0f766e' }}>LKR {checked[i] ? ((+returnQty[i] || l.qty) * (l.sellPrice || 0)).toFixed(2) : '0.00'}</td>
                        <td style={styles.td}>
                          <select style={{ ...styles.input, fontSize: 11, padding: '4px 6px' }} disabled={!checked[i]} value={reasons[i] || 'DEFECTIVE'} onChange={e => setReasons(prev => ({ ...prev, [i]: e.target.value }))}>
                            <option value="DEFECTIVE">Defective</option><option value="WRONG_ITEM">Wrong Item</option><option value="CUSTOMER_REQUEST">Cust. Request</option><option value="EXCHANGE">Exchange</option><option value="OTHER">Other</option>
                          </select>
                        </td> <td style={styles.td}><input type="checkbox" checked={restock[i] !== false} disabled={!checked[i]} onChange={e => setRestock(prev => ({ ...prev, [i]: e.target.checked }))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>}

            {returnType === 'EXCHANGE' && currentInv && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: 16, marginTop: 16 }}>
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 10 }}>🔄 Exchange Items</div>
                <input style={styles.input} placeholder="Search products..." value={exchSearch} onChange={e => setExchSearch(e.target.value)} />
                <div style={{ border: '1px solid #fcd34d', borderRadius: 8, overflow: 'auto', maxHeight: 180, marginTop: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#fef3c7' }}><th style={{ padding: 6, fontSize: 11 }}>Name</th><th style={{ padding: 6, fontSize: 11 }}>Price</th><th style={{ padding: 6, fontSize: 11 }}>Stock</th><th /></tr></thead>
                    <tbody>{exchProds.slice(0, 20).map(p => <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => addExch(p)}><td style={{ padding: 8, fontSize: 12 }}>{p.name}</td><td>LKR {p.sell}</td><td>{p.stock}</td><td><button style={{ ...styles.btnPrimary, padding: '4px 10px', fontSize: 11, background: '#0d9488' }}>Add</button></td></tr>)}</tbody>
                  </table>
                </div>
                {exchangeCart.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 13 }}>
                    <span>{item.name}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="number" value={item.qty} min={1} max={item.maxStock} onChange={e => setExchangeCart(prev => prev.map((x, j) => j === i ? { ...x, qty: Math.max(1, Math.min(+e.target.value, x.maxStock)) } : x))} style={{ ...styles.input, width: 60 }} />
                      <span style={{ fontWeight: 700, color: '#92400e' }}>LKR {(item.qty * item.price).toFixed(2)}</span>
                      <button style={styles.btnDanger} onClick={() => setExchangeCart(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
              {[['Return Subtotal', retSub.toFixed(2)], ['Restock Fee', null], ['Net Refund', netRefund.toFixed(2)], ['Exchange Value', exchVal.toFixed(2)]].map(([label, val]) => (
                <div key={label} style={{ background: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0f766e', marginBottom: 6 }}>{label}</div>
                  {label === 'Restock Fee' ? <input type="number" style={styles.input} value={restockFee} onChange={e => setRestockFee(+e.target.value)} min={0} /> : <input style={{ ...styles.input, fontWeight: 700, color: '#0f766e' }} readOnly value={val} />}
                </div>
              ))}
            </div>

            {returnType === 'EXCHANGE' && <div style={{ background: netDue > 0 ? '#ccfbf1' : netDue < 0 ? '#fee2e2' : '#d1fae5', borderRadius: 10, padding: 14, marginTop: 12, textAlign: 'center', fontWeight: 700, color: netDue > 0 ? '#0f766e' : netDue < 0 ? '#dc2626' : '#065f46' }}>
              {netDue > 0 ? `🔄 Customer owed: LKR ${netDue.toFixed(2)}` : netDue < 0 ? `💳 Customer must pay: LKR ${Math.abs(netDue).toFixed(2)}` : '✅ Even exchange'}
            </div>}
          </div>

          <div style={{ padding: 24, borderLeft: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#0f766e', marginBottom: 12 }}>Return Configuration</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Return Type *">
                <select style={styles.input} value={returnType} onChange={e => setReturnType(e.target.value)}>
                  <option value="REFUND">💵 Cash Refund</option><option value="EXCHANGE">🔄 Exchange</option><option value="CREDIT">🎟️ Store Credit</option><option value="PARTIAL_REFUND">💳 Partial Refund</option>
                </select>
              </Field>
              <Field label="Refund Method"><select style={styles.input} value={refundMethod} onChange={e => setRefundMethod(e.target.value)}><option>Cash</option><option>Card Reversal</option><option>Bank Transfer</option><option>Store Credit</option></select></Field>
              <Field label="Return Date"><input type="date" style={styles.input} value={returnDate} onChange={e => setReturnDate(e.target.value)} /></Field>
              <Field label="Refund Reference"><input style={styles.input} value={refundRef} onChange={e => setRefundRef(e.target.value)} placeholder="Transaction / Voucher ID" /></Field>
              <Field label="Remarks"><textarea style={{ ...styles.input, resize: 'vertical' }} rows={3} value={srRemarks} onChange={e => setSrRemarks(e.target.value)} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
              {[['Return Amt', netRefund.toFixed(2), '#0d9488'], ['Exchange Val', exchVal.toFixed(2), '#7c3aed'], ['Net Due', Math.abs(netDue).toFixed(2), '#f59e0b']].map(([label, val, bg]) => (
                <div key={label} style={{ background: bg, color: '#fff', textAlign: 'center', padding: 12, borderRadius: 10, fontWeight: 700 }}><div style={{ fontSize: 11 }}>{label}</div><div style={{ fontSize: 16 }}>{val}</div></div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}><div style={{ fontWeight: 700, fontSize: 13, color: '#0f766e', marginBottom: 8 }}>📋 Recent Returns</div>
              {[...srs].reverse().slice(0, 5).map(sr => (
                <div key={sr.id} style={{ padding: 10, border: '1px solid #99f6e4', borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{sr.id}</strong><span style={{ color: '#0d9488', fontWeight: 700 }}>LKR {sr.netRefund.toFixed(2)}</span></div>
                  <div style={{ color: '#64748b' }}>{sr.customer} | {sr.invoiceId} | {sr.returnDate}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: 16, background: 'rgba(224,242,254,0.6)', borderTop: '1px solid rgba(186,230,253,0.8)', flexWrap: 'wrap', borderRadius: '0 0 24px 24px' }}>
          <button style={{ ...styles.btnPrimary, background: '#0d9488' }} onClick={processSR}>💾 PROCESS RETURN</button>
          <button style={{ ...styles.btnPrimary, background: '#475569' }} onClick={clearSR}>🗑️ CLEAR</button>
        </div>
      </div>

      <GlassCard title="↩️ Sales Return History">
        <input style={{ ...styles.input, marginBottom: 12 }} placeholder="Search by SR ID, Invoice, Customer..." value={histSearch} onChange={e => setHistSearch(e.target.value)} />
        {filtHist.map(sr => (
          <div key={sr.id} style={{ ...styles.histItem, cursor: 'pointer' }} onClick={() => setSelectedSR(sr)}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><strong style={{ color: '#0f766e' }}>{sr.id}</strong> | {sr.returnDate} <span style={{ background: { REFUND: '#d1fae5', EXCHANGE: '#fef3c7', CREDIT: '#ede9fe', PARTIAL_REFUND: '#dbeafe' }[sr.returnType], color: { REFUND: '#065f46', EXCHANGE: '#92400e', CREDIT: '#5b21b6', PARTIAL_REFUND: '#1e40af' }[sr.returnType], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginLeft: 8 }}>{sr.returnType}</span></div>
              <strong style={{ color: '#0d9488' }}>LKR {sr.netRefund.toFixed(2)}</strong>
            </div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>👤 {sr.customer} | 📋 Invoice: {sr.invoiceId} | {sr.returnedItems.reduce((s, i) => s + i.returnQty, 0)} items | By: {sr.processedBy}</div>
          </div>
        ))}
        {!filtHist.length && <p style={{ textAlign: 'center', color: '#94a3b8' }}>No sales return records yet</p>}
      </GlassCard>
      {selectedSR && (
        <Modal title={`Sales Return ${selectedSR.id}`} onClose={() => setSelectedSR(null)}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', minWidth: 520 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><strong>Invoice</strong><div>{selectedSR.invoiceId}</div></div>
              <div><strong>Return Date</strong><div>{selectedSR.returnDate}</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><strong>Customer</strong><div>{selectedSR.customer}</div></div>
              <div><strong>Return Type</strong><div>{selectedSR.returnType}</div></div>
            </div>
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={styles.th}>Product</th><th style={styles.th}>Qty</th><th style={styles.th}>Refund</th><th style={styles.th}>Reason</th><th style={styles.th}>Restock</th></tr></thead>
                <tbody>
                  {selectedSR.returnedItems.map((item, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{item.productName}</td>
                      <td style={styles.td}>{item.returnQty}</td>
                      <td style={styles.td}>LKR {item.refundAmt.toFixed(2)}</td>
                      <td style={styles.td}>{item.reason}</td>
                      <td style={styles.td}>{item.restock ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedSR.exchangeItems && selectedSR.exchangeItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Exchange Items</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={styles.th}>Product</th><th style={styles.th}>Qty</th><th style={styles.th}>Price</th></tr></thead>
                  <tbody>
                    {selectedSR.exchangeItems.map((item, i) => (
                      <tr key={i}>
                        <td style={styles.td}>{item.name}</td>
                        <td style={styles.td}>{item.qty}</td>
                        <td style={styles.td}>LKR {item.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontWeight: 700 }}>
              <div>Return Subtotal: LKR {selectedSR.returnSubtotal.toFixed(2)}</div>
              <div>Restock Fee: LKR {selectedSR.restockFee.toFixed(2)}</div>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontWeight: 700 }}>
              <div>Net Refund: LKR {selectedSR.netRefund.toFixed(2)}</div>
              <div>Net Balance: LKR {selectedSR.netBalance.toFixed(2)}</div>
            </div>
            {selectedSR.remarks && <div style={{ marginTop: 16 }}><strong>Notes</strong><div>{selectedSR.remarks}</div></div>}
          </div>
        </Modal>
      )}
    </div>
  );
}