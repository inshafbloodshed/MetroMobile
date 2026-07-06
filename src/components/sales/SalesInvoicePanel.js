import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { padId } from '../../utils/helpers';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function SalesInvoicePanel({ user }) {
  const [products, setProducts] = useState(() => load(SK.PRODUCTS, []));
  const [sales, setSales] = useState(() => load(SK.SALES, []));
  const [customers, setCustomers] = useState(() => load(SK.CUSTOMERS, []) || []);
  const [credits, setCredits] = useState(() => load(SK.CREDITS, []));
  const [cart, setCart] = useState([]);
  const [custName, setCustName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState(0);
  const [amtPaid, setAmtPaid] = useState('');
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [editInvId, setEditInvId] = useState(null);
  const [histSearch, setHistSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [custSugg, setCustSugg] = useState([]);
  const [lastSavedInvoice, setLastSavedInvoice] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [customerPendingInvoices, setCustomerPendingInvoices] = useState([]);
  const [showCreditDetails, setShowCreditDetails] = useState(false);
  
  // Payment Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');

  const nextInv = () => padId(sales, 'INV', 5);
  const [invId, setInvId] = useState(() => padId(load(SK.SALES, []), 'INV', 5));

  const sub = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const payable = Math.max(0, sub - discount);
  const paid = amtPaid === '' ? payable : +amtPaid;
  const due = Math.max(0, payable - paid);
  const change = Math.max(0, paid - payable);

  const getCustomerTotalDue = (customerName) => {
    const customerInvoices = sales.filter(sale =>
      sale.customer?.toLowerCase() === customerName?.toLowerCase() &&
      sale.due > 0
    );
    const totalDue = customerInvoices.reduce((sum, inv) => sum + inv.due, 0);
    return { totalDue, invoices: customerInvoices };
  };

  const updateCustomerPending = (customerName) => {
    if (customerName && customerName.trim()) {
      const { totalDue, invoices } = getCustomerTotalDue(customerName);
      setCustomerPendingInvoices(invoices);
      return totalDue;
    }
    setCustomerPendingInvoices([]);
    return 0;
  };

  const filteredProds = products.filter(p => p.active !== false && p.stock > 0 &&
    (p.name.toLowerCase().includes(prodSearch.toLowerCase()) || (p.code || '').toLowerCase().includes(prodSearch.toLowerCase())));

  const addToCart = (p) => {
    setCart(prev => { 
      const ex = prev.find(i => i.id === p.id); 
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock) } : i); 
      return [...prev, { id: p.id, name: p.name, qty: 1, price: p.sell }]; 
    });
  };

  const filterCustSugg = (val) => {
    setCustName(val);
    if (!val) {
      setCustSugg([]);
      setCustomerPendingInvoices([]);
      setShowCreditDetails(false);
      return;
    }
    const filtered = customers.filter(c => c.name?.toLowerCase().includes(val.toLowerCase()));
    setCustSugg(filtered);
    const totalDue = updateCustomerPending(val);
    if (totalDue > 0) {
      setShowCreditDetails(true);
      toast(`⚠️ Customer has total pending dues: LKR ${totalDue.toFixed(2)} from ${customerPendingInvoices.length} invoice(s)`);
    }
  };

  const selectCustomer = (customer) => {
    setCustName(customer.name);
    setMobile(customer.mobile || '');
    setAddress(customer.address || '');
    setCustSugg([]);
    const totalDue = updateCustomerPending(customer.name);
    if (totalDue > 0) {
      setShowCreditDetails(true);
    }
  };

  // UPDATED: Opens modal instead of prompt()
  const openPaymentModal = (creditRecord) => {
    setSelectedCredit(creditRecord);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentRef('');
    setShowPaymentModal(true);
  };

  const confirmPayment = () => {
    if (!selectedCredit) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedCredit.balance) {
      toast('Invalid payment amount');
      return;
    }

    const newBalance = selectedCredit.balance - amount;
    const payment = {
      date: new Date().toISOString().slice(0, 10),
      amount: amount,
      method: paymentMethod,
      reference: paymentRef
    };

    const updatedCredit = {
      ...selectedCredit,
      paidAmount: selectedCredit.paidAmount + amount,
      balance: newBalance,
      status: newBalance === 0 ? 'paid' : 'pending',
      payments: [...selectedCredit.payments, payment]
    };

    const updatedCredits = credits.map(c => c.id === selectedCredit.id ? updatedCredit : c);
    setCredits(updatedCredits);
    save(SK.CREDITS, updatedCredits);

    const updatedSales = sales.map(sale => {
      if (sale.id === selectedCredit.invoiceId) {
        const newPaid = sale.paid + amount;
        const newDue = sale.due - amount;
        return {
          ...sale,
          paid: newPaid,
          due: newDue,
          status: newDue === 0 ? 'paid' : 'credit'
        };
      }
      return sale;
    });
    setSales(updatedSales);
    save(SK.SALES, updatedSales);

    toast(`✅ Payment recorded! Remaining balance: LKR ${newBalance.toFixed(2)}`);
    setShowPaymentModal(false);
    setSelectedCredit(null);
    
    if (custName) {
      updateCustomerPending(custName);
    }
  };

  const printReceipt = (invoice) => {
    if (!invoice) {
      toast('No invoice to print. Please save the invoice first.');
      return;
    }

    const printWindow = window.open('', '_blank');
    const currentDate = new Date();
    const formattedDateTime = `${currentDate.getDate().toString().padStart(2, '0')}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}:${currentDate.getSeconds().toString().padStart(2, '0')}`;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.3; margin: 0; padding: 8px; background: white; color: black; }
          .receipt { width: 100%; max-width: 80mm; margin: 0 auto; background: white; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .shop-name { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .shop-tagline { font-size: 9px; color: #333; }
          .shop-address { font-size: 9px; margin-top: 3px; }
          .invoice-details { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .customer-details { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 10px; }
          .items-table th { font-weight: bold; border-bottom: 1px solid #000; padding: 4px 0; text-align: left; }
          .items-table td { border-bottom: 1px dotted #ccc; padding: 3px 0; text-align: left; }
          .items-table th:first-child, .items-table td:first-child { width: 50%; }
          .items-table th:nth-child(2), .items-table td:nth-child(2) { text-align: center; width: 15%; }
          .items-table th:nth-child(3), .items-table td:nth-child(3) { text-align: right; width: 17%; }
          .items-table th:last-child, .items-table td:last-child { text-align: right; width: 18%; }
          .totals { border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: bold; }
          .balance-due { font-size: 13px; font-weight: bold; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #000; text-align: center; color: #dc2626; }
          .footer { text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #000; }
          .return-policy { font-size: 8px; margin-top: 6px; text-align: center; color: #555; }
          .thankyou { text-align: center; margin-top: 6px; font-weight: bold; font-size: 11px; }
          .system-info { font-size: 7px; margin-top: 4px; text-align: center; color: #666; }
          @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="shop-name">Metro Phone Shop</div>
            <div class="shop-tagline">Wholesale Dealers in Cellular Accessories & Spare Parts</div>
            <div class="shop-address">11 Rajapakse Broadway, Negombo</div>
          </div>
          
          <div class="invoice-details">
            <div class="row"><span>Invoice No:</span><span class="bold">${invoice.id}</span></div>
            <div class="row"><span>Date:</span><span>${invoice.date || formattedDateTime}</span></div>
          </div>
          
          <div class="customer-details">
            <div class="row"><span>Name:</span><span class="bold">${invoice.customer || ''}</span></div>
            ${invoice.address ? `<div class="row"><span>Address:</span><span>${invoice.address}</span></div>` : ''}
            ${invoice.mobile ? `<div class="row"><span>Mobile:</span><span>${invoice.mobile}</span></div>` : ''}
          </div>
          
          <table class="items-table">
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
            <tbody>
              ${invoice.lines.map(item => `
                <tr>
                  <td>${item.name.substring(0, 30)}</td>
                  <td class="text-center">${item.qty}</td>
                  <td class="text-right">${(item.sellPrice || item.price).toFixed(2)}</td>
                  <td class="text-right">${(item.qty * (item.sellPrice || item.price)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="row"><span>SUB TOTAL :</span><span>${(invoice.subtotal || invoice.payable + (invoice.discount || 0)).toFixed(2)}</span></div>
            ${(invoice.discount || 0) > 0 ? `<div class="row"><span>DISCOUNT :</span><span>${(invoice.discount || 0).toFixed(2)}</span></div>` : ''}
            <div class="total-row"><span>NET TOTAL :</span><span>${(invoice.payable || invoice.total || 0).toFixed(2)}</span></div>
            <div class="row"><span>${invoice.method || 'CASH'} :</span><span>${(invoice.paid || 0).toFixed(2)}</span></div>
            ${(invoice.due || 0) > 0 ? `<div class="total-row" style="color: #dc2626;"><span>BALANCE DUE :</span><span>${(invoice.due || 0).toFixed(2)}</span></div>` : ''}
            ${(invoice.change && invoice.change > 0) ? `<div class="row"><span>CHANGE :</span><span>${invoice.change.toFixed(2)}</span></div>` : ''}
          </div>
          
          ${(invoice.due || 0) > 0 ? `<div class="balance-due">BALANCE: ${(invoice.due || 0).toFixed(2)}</div>` : ''}
          
          <div class="return-policy">Products can be exchanged within 2 days with the original bill<br>(or copy/photo), in saleable condition, and with intact price tags.</div>
          <div class="thankyou">Thank you come again..!</div>
          <div class="footer"><div class="system-info">System By: Inshaf<br>0725335460</div></div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;" class="no-print">
          <button onclick="window.print();" style="padding: 10px 20px; margin: 5px; cursor: pointer; font-size: 14px;">🖨️ Print Receipt</button>
          <button onclick="window.close();" style="padding: 10px 20px; margin: 5px; cursor: pointer; font-size: 14px;">✖️ Close</button>
        </div>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  const saveInvoice = () => {
    if (!cart.length) { toast('Add products'); return; }
    if (!custName.trim()) { toast('Enter customer name'); return; }

    const inv = {
      id: editInvId || nextInv(),
      date: invDate,
      customer: custName,
      mobile,
      address,
      lines: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, sellPrice: i.price, total: i.qty * i.price })),
      subtotal: sub,
      discount: +discount,
      payable,
      paid: +paid,
      due,
      method,
      reference,
      remarks,
      change: change,
      isCreditSale: due > 0,
      status: due > 0 ? 'credit' : 'paid'
    };

    let updSales;
    if (editInvId) {
      const old = sales.find(i => i.id === editInvId);
      if (old) {
        const upd = products.map(p => { const ol = old.lines.find(l => l.id === p.id); return ol ? { ...p, stock: p.stock + ol.qty, active: true } : p; });
        const upd2 = upd.map(p => { const nl = cart.find(l => l.id === p.id); return nl ? { ...p, stock: Math.max(0, p.stock - nl.qty), active: p.stock - nl.qty > 0 } : p; });
        save(SK.PRODUCTS, upd2);
        setProducts(upd2);
      }
      updSales = sales.map(i => i.id === editInvId ? inv : i);
    } else {
      const updP = products.map(p => { const l = cart.find(i => i.id === p.id); return l ? { ...p, stock: Math.max(0, p.stock - l.qty), active: p.stock - l.qty > 0 } : p; });
      save(SK.PRODUCTS, updP);
      setProducts(updP);
      updSales = [...sales, inv];
    }

    setSales(updSales);
    save(SK.SALES, updSales);

    if (due > 0) {
      const creditRecord = {
        id: `CR_${inv.id}`,
        invoiceId: inv.id,
        customerId: custName,
        customerName: custName,
        mobile,
        date: invDate,
        totalAmount: payable,
        paidAmount: +paid,
        balance: due,
        status: 'pending',
        payments: [{ date: invDate, amount: +paid, method, reference }]
      };

      const existingCredit = credits.find(c => c.invoiceId === inv.id);
      if (existingCredit) {
        setCredits(credits.map(c => c.invoiceId === inv.id ? creditRecord : c));
        save(SK.CREDITS, credits.map(c => c.invoiceId === inv.id ? creditRecord : c));
      } else {
        const newCredits = [...credits, creditRecord];
        setCredits(newCredits);
        save(SK.CREDITS, newCredits);
      }
      toast(`⚠️ Credit sale recorded! Balance due: LKR ${due.toFixed(2)}`);
    } else if (!editInvId && credits.some(c => c.invoiceId === inv.id)) {
      const updatedCredits = credits.filter(c => c.invoiceId !== inv.id);
      setCredits(updatedCredits);
      save(SK.CREDITS, updatedCredits);
    }

    if (custName && !customers.some(c => c.name === custName && c.mobile === mobile)) {
      const upd = [...customers, { name: custName, mobile, address }];
      setCustomers(upd);
      save(SK.CUSTOMERS, upd);
    }

    setLastSavedInvoice(inv);
    toast(`✅ Invoice ${inv.id} saved!`);

    if (window.confirm('Invoice saved successfully! Do you want to print the receipt?')) {
      printReceipt(inv);
    }

    clearForm();
  };

  const printLastInvoice = () => {
    if (lastSavedInvoice) {
      printReceipt(lastSavedInvoice);
    } else if (sales.length > 0) {
      const lastInvoice = sales[sales.length - 1];
      printReceipt(lastInvoice);
    } else {
      toast('No invoice to print. Please save an invoice first.');
    }
  };

  const printSelectedInvoice = (invoice) => {
    printReceipt(invoice);
  };

  const clearForm = () => {
    setCart([]);
    setCustName('');
    setMobile('');
    setAddress('');
    setDiscount(0);
    setAmtPaid('');
    setReference('');
    setRemarks('');
    setMethod('Cash');
    setEditInvId(null);
    setInvId(padId(load(SK.SALES, []), 'INV', 5));
    setCustomerPendingInvoices([]);
    setShowCreditDetails(false);
  };

  const loadForEdit = (id) => {
    const inv = sales.find(i => i.id === id);
    if (!inv) { toast('Not found'); return; }
    setEditInvId(inv.id);
    setInvId(inv.id);
    setCustName(inv.customer);
    setMobile(inv.mobile || '');
    setAddress(inv.address || '');
    setDiscount(inv.discount);
    setAmtPaid(inv.paid);
    setMethod(inv.method || 'Cash');
    setReference(inv.reference || '');
    setRemarks(inv.remarks || '');
    setCart(inv.lines.map(l => ({ id: l.id, name: l.name, qty: l.qty, price: l.sellPrice })));
    updateCustomerPending(inv.customer);
    if (inv.due > 0) setShowCreditDetails(true);
    toast(`✏️ Editing ${inv.id}`);
  };

  const filteredHistory = () => {
    let filtered = [...sales].reverse();
    if (histSearch) {
      filtered = filtered.filter(i =>
        i.id.toLowerCase().includes(histSearch.toLowerCase()) ||
        i.customer.toLowerCase().includes(histSearch.toLowerCase()) ||
        i.lines.some(line => line.name.toLowerCase().includes(histSearch.toLowerCase()))
      );
    }
    if (dateFrom) filtered = filtered.filter(i => i.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(i => i.date <= dateTo);
    if (viewMode === 'credit') filtered = filtered.filter(i => i.due > 0);
    else if (viewMode === 'paid') filtered = filtered.filter(i => i.due === 0);
    return filtered;
  };

  return (
    <div>
      {/* Credit Alert Banner */}
      {custName && customerPendingInvoices.length > 0 && showCreditDetails && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
          borderLeft: '6px solid #f59e0b',
          borderRadius: 12,
          marginBottom: 20,
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#92400e' }}>Credit Alert - Pending Dues</div>
                <div style={{ color: '#78350f', fontSize: 13, marginTop: 4 }}>Customer has outstanding balance from previous invoices</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>
                LKR {customerPendingInvoices.reduce((sum, inv) => sum + inv.due, 0).toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: '#78350f' }}>Total Due from {customerPendingInvoices.length} invoice(s)</div>
            </div>
            <button onClick={() => setShowCreditDetails(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#92400e' }}>✕</button>
          </div>

          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: '#92400e', fontSize: 14 }}>📋 Outstanding Invoices:</div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fde68a', fontSize: 12 }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Invoice ID</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Paid</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Due</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customerPendingInvoices.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #fde68a', fontSize: 13 }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{inv.id}</td>
                      <td style={{ padding: '8px' }}>{inv.date}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>LKR {inv.payable.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>LKR {inv.paid.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>LKR {inv.due.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => {
                            const creditRecord = credits.find(c => c.invoiceId === inv.id);
                            if (creditRecord) openPaymentModal(creditRecord);
                          }}
                        >💰 Record Payment</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#fef3c7', fontWeight: 700 }}>
                    <td colSpan="4" style={{ padding: '10px 8px', textAlign: 'right' }}>Total Due:</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#dc2626', fontSize: 16 }}>LKR {customerPendingInvoices.reduce((sum, inv) => sum + inv.due, 0).toFixed(2)}</td>
                    <td style={{ padding: '10px 8px' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg,#0f172a,#2563eb)', color: '#fff', borderRadius: '24px 24px 0 0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ fontSize: 20, fontWeight: 800 }}>Metro Phone Shop POS</div><div style={{ fontSize: 13, opacity: 0.8 }}>Smart Billing with Credit Tracking</div></div>
        {editInvId && <span style={{ background: '#f59e0b', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✏️ EDIT MODE</span>}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderRadius: '0 0 24px 24px', border: '1px solid rgba(255,255,255,0.3)', marginBottom: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div style={styles.grid2}>
          <div style={{ padding: 24 }}>
            <FormGrid cols={2}>
              <Field label="Invoice ID"><input style={styles.input} readOnly value={invId} /></Field>
              <Field label="Invoice Date"><input type="date" style={styles.input} value={invDate} onChange={e => setInvDate(e.target.value)} /></Field>
              <Field label="Customer Name *" style={{ position: 'relative' }}>
                <input style={styles.input} value={custName} onChange={e => filterCustSugg(e.target.value)} placeholder="Type or select..." />
                {custSugg.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, maxHeight: 200, overflowY: 'auto', zIndex: 10 }}>
                    {custSugg.map((c, i) => {
                      const { totalDue } = getCustomerTotalDue(c.name);
                      return (
                        <div key={i} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => selectCustomer(c)}>
                          <div><strong>{c.name}</strong> 📞 {c.mobile}</div>
                          {totalDue > 0 && <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 12, background: '#fee2e2', padding: '2px 8px', borderRadius: 12 }}>Due: LKR {totalDue.toFixed(2)}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Field>
              <Field label="Mobile"><input style={styles.input} value={mobile} onChange={e => setMobile(e.target.value)} /></Field>
              <Field label="Address"><input style={styles.input} value={address} onChange={e => setAddress(e.target.value)} /></Field>
              <Field label="Payment Method">
                <select style={styles.input} value={method} onChange={e => setMethod(e.target.value)}>
                  <option>Cash</option><option>Card</option><option>Bank Transfer</option><option>Credit</option>
                </select>
              </Field>
              <Field label="Reference No"><input style={styles.input} value={reference} onChange={e => setReference(e.target.value)} /></Field>
            </FormGrid>

            <div style={{ marginTop: 16, overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
              <table style={styles.table}>
                <thead><tr style={{ background: '#2563eb', color: '#fff' }}><th style={styles.th}>Product</th><th style={styles.th}>Qty</th><th style={styles.th}>Price</th><th style={styles.th}>Total</th><th style={styles.th}></th></tr></thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr><td colSpan={5} style={styles.emptyTd}>Click products from the right panel</td></tr>
                  ) : (
                    cart.map((item, i) => (
                      <tr key={item.id}>
                        <td style={styles.td}>{item.name}</td>
                        <td style={styles.td}><input style={{ ...styles.input, width: 70 }} type="number" value={item.qty} min={1} onChange={e => setCart(prev => prev.map((x, j) => j === i ? { ...x, qty: Math.max(1, +e.target.value) } : x))} /></td>
                        <td style={styles.td}><input style={{ ...styles.input, width: 90 }} type="number" value={item.price} onChange={e => setCart(prev => prev.map((x, j) => j === i ? { ...x, price: +e.target.value } : x))} /></td>
                        <td style={styles.td}>LKR {(item.qty * item.price).toFixed(2)}</td>
                        <td style={styles.td}><button style={styles.btnDanger} onClick={() => setCart(prev => prev.filter((_, j) => j !== i))}>✕</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Sub Total</div>
                <input style={{ ...styles.input, fontWeight: 700 }} readOnly value={sub.toFixed(2)} />
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Discount</div>
                <input type="number" style={styles.input} value={discount} onChange={e => setDiscount(+e.target.value)} />
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Total Payable</div>
                <input style={{ ...styles.input, fontWeight: 700 }} readOnly value={payable.toFixed(2)} />
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Balance Due</div>
                <input style={{ ...styles.input, fontWeight: 700 }} readOnly value={due.toFixed(2)} />
              </div>
            </div>
          </div>

          <div style={{ padding: 24, borderLeft: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#1e3a8a' }}>🔍 Product Search</div>
            <input style={{ ...styles.input, marginBottom: 10 }} placeholder="Search by name, code, brand..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'auto', maxHeight: 260 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#e2e8f0', position: 'sticky', top: 0 }}><th style={{ padding: 8, fontSize: 12 }}>Name</th><th style={{ padding: 8, fontSize: 12 }}>Price</th><th style={{ padding: 8, fontSize: 12 }}>Stock</th> </tr></thead>
                <tbody>
                  {filteredProds.slice(0, 40).map(p => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => addToCart(p)} onMouseOver={e => e.currentTarget.style.background = '#dbeafe'} onMouseOut={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: 8, fontSize: 12 }}>{p.name}</td>
                      <td style={{ padding: 8, fontSize: 12 }}>LKR {p.sell}</td>
                      <td style={{ padding: 8, fontSize: 12 }}>{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
              <div style={{ background: '#2563eb', color: '#fff', textAlign: 'center', padding: 12, borderRadius: 10, fontWeight: 600 }}>
                <div style={{ fontSize: 11 }}>Invoice Amt</div>
                <div style={{ fontSize: 16 }}>{payable.toFixed(2)}</div>
              </div>
              <div style={{ background: '#7c3aed', color: '#fff', textAlign: 'center', padding: 12, borderRadius: 10, fontWeight: 600 }}>
                <div style={{ fontSize: 11 }}>Tendered</div>
                <div style={{ fontSize: 16 }}>{paid.toFixed(2)}</div>
              </div>
              <div style={{ background: '#f59e0b', color: '#fff', textAlign: 'center', padding: 12, borderRadius: 10, fontWeight: 600 }}>
                <div style={{ fontSize: 11 }}>Change</div>
                <div style={{ fontSize: 16 }}>{change.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div><div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Amount Paid</div><input type="number" style={styles.input} value={amtPaid} onChange={e => setAmtPaid(e.target.value)} placeholder="Leave empty = Fully Paid" /></div>
              <div><div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Remarks</div><input style={styles.input} value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
            </div>
            <div style={{ marginTop: 12, background: due > 0 ? '#fef3c7' : '#d1fae5', borderRadius: 10, padding: 12, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>
              {due > 0 ? `⚠️ CREDIT BALANCE: LKR ${due.toFixed(2)}` : '✅ Fully Paid'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: 16, background: 'rgba(241,245,249,0.6)', borderTop: '1px solid rgba(226,232,240,0.8)', flexWrap: 'wrap', borderRadius: '0 0 24px 24px' }}>
          <button style={{ ...styles.btnPrimary, background: '#10b981' }} onClick={saveInvoice}>💾 SAVE INVOICE</button>
          <button style={{ ...styles.btnPrimary, background: '#0ea5e9' }} onClick={printLastInvoice}>🖨️ PRINT RECEIPT</button>
          <button style={{ ...styles.btnPrimary, background: '#475569' }} onClick={clearForm}>🗑️ CLEAR FORM</button>
          <button style={{ ...styles.btnPrimary, background: '#8b5cf6' }} onClick={() => { 
            const id = prompt('Enter Invoice ID to edit:'); 
            if (id) loadForEdit(id.toUpperCase()); 
          }}>✏️ EDIT EXISTING</button>
        </div>
      </div>

      <GlassCard title="📜 Sales & Credit History">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input style={{ ...styles.input, flex: 2 }} placeholder="Search by Invoice ID, Customer Name, or Product Name..." value={histSearch} onChange={e => setHistSearch(e.target.value)} />
          <input type="date" style={styles.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From Date" />
          <input type="date" style={styles.input} value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To Date" />
          <select style={styles.input} value={viewMode} onChange={e => setViewMode(e.target.value)}>
            <option value="all">All Transactions</option>
            <option value="credit">Credit Sales Only</option>
            <option value="paid">Fully Paid Only</option>
          </select>
          <button style={{ ...styles.btnPrimary, background: '#6b7280' }} onClick={() => { setHistSearch(''); setDateFrom(''); setDateTo(''); setViewMode('all'); }}>Clear Filters</button>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filteredHistory().map(inv => (
            <div key={inv.id} style={{ ...styles.histItem, cursor: 'pointer', borderLeft: inv.due > 0 ? '4px solid #f59e0b' : '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: 1 }} onClick={() => setSelectedInvoice(inv)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><strong>{inv.id}</strong> | {inv.date} | 👤 {inv.customer}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, background: inv.due > 0 ? '#fef3c7' : '#d1fae5', padding: '4px 10px', borderRadius: 20 }}>
                    {inv.due > 0 ? `💳 Due: LKR ${inv.due.toFixed(2)}` : '✅ Paid'}
                  </div>
                </div>
                <div style={{ fontSize: 13, marginTop: 6 }}>LKR {(inv.payable || 0).toFixed(2)} | {inv.method} | {inv.lines.reduce((a, b) => a + b.qty, 0)} items</div>
              </div>
              <button
                style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginLeft: 10 }}
                onClick={(e) => { e.stopPropagation(); printSelectedInvoice(inv); }}
              >
                🖨️ Print
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {selectedInvoice && (
        <Modal title={`Invoice Details: ${selectedInvoice.id}`} onClose={() => setSelectedInvoice(null)}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', minWidth: 520 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><strong>Customer</strong><div>{selectedInvoice.customer}</div></div>
              <div><strong>Date</strong><div>{selectedInvoice.date}</div></div>
              <div><strong>Mobile</strong><div>{selectedInvoice.mobile || '-'}</div></div>
              <div><strong>Method</strong><div>{selectedInvoice.method}</div></div>
              <div><strong>Status</strong><div style={{ color: selectedInvoice.due > 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{selectedInvoice.due > 0 ? `Credit - Due: LKR ${selectedInvoice.due.toFixed(2)}` : 'Fully Paid'}</div></div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={styles.th}>Product</th><th style={styles.th}>Qty</th><th style={styles.th}>Price</th><th style={styles.th}>Total</th></tr></thead>
                <tbody>
                  {selectedInvoice.lines.map((line, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{line.name}</td>
                      <td style={styles.td}>{line.qty}</td>
                      <td style={styles.td}>LKR {line.sellPrice.toFixed(2)}</td>
                      <td style={styles.td}>LKR {(line.qty * line.sellPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontWeight: 700 }}>
              <div>Subtotal: LKR {(selectedInvoice.subtotal || 0).toFixed(2)}</div>
              <div>Discount: LKR {(selectedInvoice.discount || 0).toFixed(2)}</div>
              <div>Payable: LKR {(selectedInvoice.payable || 0).toFixed(2)}</div>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>Paid: LKR {(selectedInvoice.paid || 0).toFixed(2)}</div>
              <div>Due: LKR {(selectedInvoice.due || 0).toFixed(2)}</div>
            </div>
            {selectedInvoice.remarks && <div style={{ marginTop: 16 }}><strong>Remarks</strong><div>{selectedInvoice.remarks}</div></div>}

            {selectedInvoice.due > 0 && (
              <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                <strong>💰 Credit Payment History</strong>
                {credits.find(c => c.invoiceId === selectedInvoice.id)?.payments.map((payment, idx) => (
                  <div key={idx} style={{ fontSize: 12, marginTop: 6 }}>📅 {payment.date} | LKR {payment.amount.toFixed(2)} | {payment.method} {payment.reference && `| Ref: ${payment.reference}`}</div>
                ))}
                <button
                  style={{ marginTop: 12, background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
                  onClick={() => {
                    const creditRecord = credits.find(c => c.invoiceId === selectedInvoice.id);
                    if (creditRecord) openPaymentModal(creditRecord);
                  }}
                >
                  Record Payment
                </button>
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button style={{ ...styles.btnPrimary, background: '#0ea5e9' }} onClick={() => printSelectedInvoice(selectedInvoice)}>
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCredit && (
        <Modal title={`💰 Record Payment - ${selectedCredit.invoiceId}`} onClose={() => setShowPaymentModal(false)}>
          <div style={{ padding: '10px 0' }}>
            <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><strong>Customer:</strong> {selectedCredit.customerName}</div>
              <div><strong>Invoice:</strong> {selectedCredit.invoiceId}</div>
              <div><strong>Total Due:</strong> LKR {selectedCredit.balance.toFixed(2)}</div>
              <div><strong>Date:</strong> {selectedCredit.date}</div>
            </div>
            
            <FormGrid>
              <Field label="Payment Amount *">
                <input 
                  type="number" 
                  style={styles.input} 
                  value={paymentAmount}
                  min={0.01}
                  max={selectedCredit.balance}
                  step={0.01}
                  onChange={e => setPaymentAmount(e.target.value)} 
                  placeholder={`Max: ${selectedCredit.balance.toFixed(2)}`}
                />
              </Field>
              <Field label="Payment Method">
                <select style={styles.input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Store Credit</option>
                </select>
              </Field>
              <Field label="Reference Number">
                <input 
                  style={styles.input} 
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)} 
                  placeholder="Transaction ID / Reference" 
                />
              </Field>
            </FormGrid>
            
            <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div><strong>Remaining Balance After Payment:</strong> LKR {(selectedCredit.balance - (parseFloat(paymentAmount) || 0)).toFixed(2)}</div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button style={{ ...styles.btnPrimary, background: '#10b981' }} onClick={confirmPayment}>
                💰 Record Payment
              </button>
              <button style={styles.btnOutline} onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}