import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function RepairBillingPanel({ user }) {
  const [jobs, setJobs] = useState(() => load(SK.JOBS, []));
  const [billed, setBilled] = useState(() => load(SK.BILLED, []));
  const [workers, setWorkers] = useState(() => load(SK.WORKERS, []));
  const [filters, setFilters] = useState({ 
    phone: '', 
    fromDate: '', 
    toDate: '', 
    worker: 'all',
    search: ''
  });
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [billForm, setBillForm] = useState({
    amount: '',
    partsCost: '',
    laborCost: '',
    discount: '',
    paymentMethod: 'Cash',
    notes: ''
  });
  const [viewMode, setViewMode] = useState('all');

  const bill = (job) => {
    setSelectedJob(job);
    setBillForm({
      amount: job.estimatedCost || '',
      partsCost: '',
      laborCost: '',
      discount: '',
      paymentMethod: 'Cash',
      notes: ''
    });
    setShowBillModal(true);
  };

  const processBilling = () => {
    if (!selectedJob) return;
    
    const amount = parseFloat(billForm.amount) || 0;
    if (amount <= 0) { toast('⚠️ Please enter a valid bill amount'); return; }
    
    const partsCost = parseFloat(billForm.partsCost) || 0;
    const laborCost = parseFloat(billForm.laborCost) || 0;
    const discount = parseFloat(billForm.discount) || 0;
    const netAmount = Math.max(0, amount - discount);
    
    const billRecord = {
      id: `BILL_${selectedJob.orderId}`,
      orderId: selectedJob.orderId,
      customerName: selectedJob.customerName,
      phone: selectedJob.phone,
      workerName: selectedJob.workerName,
      billedBy: user?.username || 'ADMIN',
      billedDate: new Date().toISOString().slice(0,10),
      billedTime: new Date().toLocaleTimeString(),
      amount: amount,
      partsCost: partsCost,
      laborCost: laborCost,
      discount: discount,
      netAmount: netAmount,
      paymentMethod: billForm.paymentMethod,
      notes: billForm.notes,
      status: 'completed',
      deviceType: selectedJob.deviceType,
      deviceModel: selectedJob.deviceModel,
    };
    
    const updatedJobs = jobs.filter(j => j.orderId !== selectedJob.orderId);
    setJobs(updatedJobs);
    save(SK.JOBS, updatedJobs);
    
    const updatedBilled = [...billed, billRecord];
    setBilled(updatedBilled);
    save(SK.BILLED, updatedBilled);
    
    toast(`✅ ${selectedJob.orderId} billed: LKR ${netAmount.toFixed(2)}`);
    setShowBillModal(false);
    setSelectedJob(null);
    
    printRepairReceipt(billRecord);
  };

  const printRepairReceipt = (bill) => {
    const printWindow = window.open('', '_blank');
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Repair Bill - ${bill.orderId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; margin: 0; padding: 10px; background: white; color: black; }
          .receipt { width: 100%; max-width: 80mm; margin: 0 auto; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .shop-name { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .shop-tagline { font-size: 9px; color: #333; }
          .shop-address { font-size: 9px; margin-top: 3px; }
          .section { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #000; }
          .footer { text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #000; }
          .thankyou { text-align: center; margin-top: 6px; font-weight: bold; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="shop-name">Metro Phone Shop</div>
            <div class="shop-tagline">Repair Service Center</div>
            <div class="shop-address">11 Rajapakse Broadway, Negombo</div>
          </div>
          
          <div class="section">
            <div class="row"><span>Bill No:</span><span class="bold">${bill.id}</span></div>
            <div class="row"><span>Order ID:</span><span class="bold">${bill.orderId}</span></div>
            <div class="row"><span>Date:</span><span>${bill.billedDate}</span></div>
            <div class="row"><span>Time:</span><span>${bill.billedTime}</span></div>
          </div>
          
          <div class="section">
            <div class="row"><span>Customer:</span><span>${bill.customerName}</span></div>
            <div class="row"><span>Phone:</span><span>${bill.phone}</span></div>
            ${bill.deviceType ? `<div class="row"><span>Device:</span><span>${bill.deviceType} ${bill.deviceModel || ''}</span></div>` : ''}
            <div class="row"><span>Technician:</span><span>${bill.workerName}</span></div>
          </div>
          
          <div class="section">
            <div class="row"><span>Repair Charges</span><span>LKR</span></div>
            ${bill.partsCost > 0 ? `<div class="row"><span>  Parts Cost</span><span>${bill.partsCost.toFixed(2)}</span></div>` : ''}
            ${bill.laborCost > 0 ? `<div class="row"><span>  Labor Cost</span><span>${bill.laborCost.toFixed(2)}</span></div>` : ''}
            ${bill.discount > 0 ? `<div class="row"><span>  Discount</span><span>-${bill.discount.toFixed(2)}</span></div>` : ''}
            <div class="total-row">
              <span>Total Amount</span>
              <span>LKR ${bill.netAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="row"><span>Payment Method</span><span>${bill.paymentMethod}</span></div>
            ${bill.notes ? `<div class="row"><span>Notes:</span><span>${bill.notes}</span></div>` : ''}
          </div>
          
          <div class="thankyou">Thank you for your business!</div>
          <div class="footer">
            <div style="font-size: 8px; color: #666;">System By: Saptco Computer Systems</div>
          </div>
        </div>
        <div style="text-align:center; margin-top:20px;" class="no-print">
          <button onclick="window.print();" style="padding:10px 20px; margin:5px; cursor:pointer;">🖨️ Print</button>
          <button onclick="window.close();" style="padding:10px 20px; margin:5px; cursor:pointer;">✖️ Close</button>
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print();},300);}</script>
      </body>
      </html>
    `;
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  const filtered = jobs.filter(j => {
    let match = true;
    if (filters.phone && !j.phone?.includes(filters.phone)) match = false;
    if (filters.fromDate && j.createdDate < filters.fromDate) match = false;
    if (filters.toDate && j.createdDate > filters.toDate) match = false;
    if (filters.worker !== 'all' && j.workerName !== filters.worker) match = false;
    if (filters.search && !j.customerName?.toLowerCase().includes(filters.search.toLowerCase()) && 
        !j.orderId?.toLowerCase().includes(filters.search.toLowerCase())) match = false;
    return match;
  });

  const filteredBilled = billed.filter(b => {
    let match = true;
    if (filters.phone && !b.phone?.includes(filters.phone)) match = false;
    if (filters.fromDate && b.billedDate < filters.fromDate) match = false;
    if (filters.toDate && b.billedDate > filters.toDate) match = false;
    if (filters.worker !== 'all' && b.workerName !== filters.worker) match = false;
    if (filters.search && !b.customerName?.toLowerCase().includes(filters.search.toLowerCase()) && 
        !b.orderId?.toLowerCase().includes(filters.search.toLowerCase())) match = false;
    return match;
  });

  const getWorkerName = (username) => {
    const worker = workers.find(w => w.username === username);
    return worker ? worker.name : username;
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={styles.reportBox}>
          <div style={styles.reportLabel}>🔧 Pending Repairs</div>
          <div style={styles.reportValue}>{jobs.length}</div>
        </div>
        <div style={{...styles.reportBox, background: '#dbeafe'}}>
          <div style={styles.reportLabel}>✅ Total Billed</div>
          <div style={{...styles.reportValue, color: '#2563eb'}}>{billed.length}</div>
        </div>
        <div style={{...styles.reportBox, background: '#fef3c7'}}>
          <div style={styles.reportLabel}>💰 Total Revenue</div>
          <div style={{...styles.reportValue, color: '#d97706'}}>LKR {billed.reduce((sum, b) => sum + (b.netAmount || 0), 0).toFixed(2)}</div>
        </div>
        <div style={{...styles.reportBox, background: '#f0fdf4'}}>
          <div style={styles.reportLabel}>👥 Active Workers</div>
          <div style={{...styles.reportValue, color: '#16a34a'}}>{workers.filter(w => w.active !== false).length}</div>
        </div>
      </div>

      <GlassCard title="🔧 Repair Management">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <input style={{...styles.input, width: 180}} placeholder="Search name/order..." 
            value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
          <input style={styles.input} placeholder="Phone" value={filters.phone} 
            onChange={e => setFilters(f => ({...f, phone: e.target.value}))} />
          <input type="date" style={styles.input} value={filters.fromDate} 
            onChange={e => setFilters(f => ({...f, fromDate: e.target.value}))} />
          <input type="date" style={styles.input} value={filters.toDate} 
            onChange={e => setFilters(f => ({...f, toDate: e.target.value}))} />
          <select style={styles.input} value={filters.worker} 
            onChange={e => setFilters(f => ({...f, worker: e.target.value}))}>
            <option value="all">👥 All Workers</option>
            {workers.filter(w => w.active !== false).map(w => (
              <option key={w.id} value={w.username}>{w.name}</option>
            ))}
          </select>
          <button style={styles.btnOutline} onClick={() => setFilters({ phone: '', fromDate: '', toDate: '', worker: 'all', search: '' })}>Reset</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={{...styles.btnSm, background: viewMode === 'all' ? '#2563eb' : 'transparent', color: viewMode === 'all' ? '#fff' : '#64748b'}} 
            onClick={() => setViewMode('all')}>📋 All</button>
          <button style={{...styles.btnSm, background: viewMode === 'pending' ? '#2563eb' : 'transparent', color: viewMode === 'pending' ? '#fff' : '#64748b'}} 
            onClick={() => setViewMode('pending')}>⏳ Pending</button>
          <button style={{...styles.btnSm, background: viewMode === 'billed' ? '#2563eb' : 'transparent', color: viewMode === 'billed' ? '#fff' : '#64748b'}} 
            onClick={() => setViewMode('billed')}>✅ Billed</button>
        </div>

        {(viewMode === 'all' || viewMode === 'pending') && (
          <>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>📋 Pending Jobs</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead><tr>
                  {['Order ID', 'Customer', 'Phone', 'Device', 'Worker', 'Est. Cost', 'Action'].map(h => 
                    <th key={h} style={styles.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {!filtered.length && <tr><td colSpan={7} style={styles.emptyTd}>No pending jobs</td></tr>}
                  {filtered.map(j => (
                    <tr key={j.orderId}>
                      <td style={styles.td}><span style={styles.badgeBlue}>{j.orderId}</span></td>
                      <td style={styles.td}>{j.customerName}</td>
                      <td style={styles.td}>{j.phone}</td>
                      <td style={styles.td}>
                        {j.deviceType || '-'}
                        {j.deviceModel && <div style={{fontSize:10, color:'#94a3b8'}}>{j.deviceModel}</div>}
                      </td>
                      <td style={styles.td}>{getWorkerName(j.workerName)}</td>
                      <td style={styles.td}>LKR {j.estimatedCost || '0'}</td>
                      <td style={styles.td}>
                        <button style={{...styles.btnPrimary, padding: '6px 12px', fontSize: 12, background: '#10b981'}} 
                          onClick={() => bill(j)}>
                          💰 Bill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(viewMode === 'all' || viewMode === 'billed') && (
          <>
            <div style={{ fontWeight: 700, margin: '20px 0 8px' }}>✅ Billed Jobs</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead><tr>
                  {['Bill ID', 'Order ID', 'Customer', 'Worker', 'Amount', 'Date', 'Method'].map(h => 
                    <th key={h} style={styles.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {!filteredBilled.length && <tr><td colSpan={7} style={styles.emptyTd}>No billed jobs</td></tr>}
                  {filteredBilled.map(b => (
                    <tr key={b.id}>
                      <td style={styles.td}><span style={styles.badgeBlue}>{b.id}</span></td>
                      <td style={styles.td}>{b.orderId}</td>
                      <td style={styles.td}>{b.customerName}</td>
                      <td style={styles.td}>{getWorkerName(b.workerName)}</td>
                      <td style={styles.td}><strong>LKR {b.netAmount.toFixed(2)}</strong></td>
                      <td style={styles.td}>{b.billedDate}</td>
                      <td style={styles.td}>{b.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </GlassCard>

      {showBillModal && selectedJob && (
        <div style={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowBillModal(false); }}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>💰 Bill Repair - {selectedJob.orderId}</span>
              <button style={styles.modalClose} onClick={() => setShowBillModal(false)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
                <div><strong>Customer:</strong> {selectedJob.customerName}</div>
                <div><strong>Phone:</strong> {selectedJob.phone}</div>
                <div><strong>Device:</strong> {selectedJob.deviceType || 'N/A'} {selectedJob.deviceModel || ''}</div>
                <div><strong>Worker:</strong> {getWorkerName(selectedJob.workerName)}</div>
                <div><strong>Est. Cost:</strong> LKR {selectedJob.estimatedCost || '0'}</div>
              </div>
              
              <div style={styles.formGrid2}>
                <Field label="Total Amount (LKR) *">
                  <input type="number" style={styles.input} value={billForm.amount}
                    onChange={e => setBillForm({...billForm, amount: e.target.value})} />
                </Field>
                <Field label="Parts Cost (LKR)">
                  <input type="number" style={styles.input} value={billForm.partsCost}
                    onChange={e => setBillForm({...billForm, partsCost: e.target.value})} />
                </Field>
                <Field label="Labor Cost (LKR)">
                  <input type="number" style={styles.input} value={billForm.laborCost}
                    onChange={e => setBillForm({...billForm, laborCost: e.target.value})} />
                </Field>
                <Field label="Discount (LKR)">
                  <input type="number" style={styles.input} value={billForm.discount}
                    onChange={e => setBillForm({...billForm, discount: e.target.value})} />
                </Field>
                <Field label="Payment Method">
                  <select style={styles.input} value={billForm.paymentMethod} 
                    onChange={e => setBillForm({...billForm, paymentMethod: e.target.value})}>
                    {['Cash','Card','Bank Transfer','Credit'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Notes">
                  <input style={styles.input} value={billForm.notes}
                    onChange={e => setBillForm({...billForm, notes: e.target.value})} placeholder="Any notes..." />
                </Field>
              </div>
              
              <div style={{background:'#f1f5f9', padding:12, borderRadius:10, marginTop:12}}>
                <div style={{display:'flex', justifyContent:'space-between', fontWeight:700}}>
                  <span>Net Amount:</span>
                  <span style={{fontSize:18, color:'#2563eb'}}>
                    LKR {Math.max(0, (parseFloat(billForm.amount)||0) - (parseFloat(billForm.discount)||0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnOutline} onClick={() => setShowBillModal(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={processBilling}>💰 Confirm & Bill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}