import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';

export function ReportsPanel({ user }) {
  // Helper functions for export
  const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const downloadCSV = (rows, filename) => {
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadExcel = (html, filename) => {
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Load data from storage
  const billed = load(SK.BILLED, []);
  const sales = load(SK.SALES, []);
  const expenses = load(SK.EXP, []);
  const products = load(SK.PRODUCTS, []);
  const jobs = load(SK.JOBS, []);
  const workers = load(SK.WORKERS, []);
  const customers = load(SK.CUSTOMERS, []);

  // Balance brought forward system
  const [dailyBalances, setDailyBalances] = useState(() => {
    const saved = load(SK.DAILY_BALANCES, {});
    return saved;
  });
  const [editingBalanceDate, setEditingBalanceDate] = useState(null);
  const [editBalanceValue, setEditBalanceValue] = useState('');
  const [showBBFModal, setShowBBFModal] = useState(false);
  const [bbfAmount, setBbfAmount] = useState('');

  const repairIncome = billed.reduce((s, b) => s + (b.netAmount || b.amount || 0), 0);
  const salesIncome = sales.reduce((s, x) => s + (x.payable || x.total || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = repairIncome + salesIncome - totalExp;

  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);
  const todaySales = sales.filter(inv => inv.date === today);
  const monthSales = sales.filter(inv => inv.date.slice(0, 7) === monthPrefix);
  const todayExpenses = expenses.filter(exp => exp.date === today);
  const monthExpenses = expenses.filter(exp => exp.date.slice(0, 7) === monthPrefix);
  const todayRepairs = billed.filter(b => b.billedDate === today);
  const monthRepairs = billed.filter(b => b.billedDate.slice(0, 7) === monthPrefix);
  const lowStock = products.filter(p => p.stock <= (p.reorderLevel || 5));
  const pendingJobs = jobs.filter(j => !['completed', 'billed', 'closed'].includes((j.status || '').toLowerCase()));

  const todayIncome = todayRepairs.reduce((s, b) => s + (b.netAmount || b.amount || 0), 0) + todaySales.reduce((s, i) => s + (i.payable || i.total || 0), 0);
  const todayExpenseTotal = todayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const todayNetProfit = todayIncome - todayExpenseTotal;

  const getOpeningBalance = (date) => {
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().slice(0, 10);
    const prevBalance = dailyBalances[prevDateStr];
    if (prevBalance) return prevBalance.closingBalance;
    const todayBalance = dailyBalances[date];
    if (todayBalance && todayBalance.openingBalance !== undefined) return todayBalance.openingBalance;
    return 0;
  };

  const openingBalance = getOpeningBalance(today);
  const closingBalance = openingBalance + todayNetProfit;

  const saveDailyBalance = (date, openingBal, closingBal, income, expenses, netProfit) => {
    const updated = {
      ...dailyBalances,
      [date]: {
        openingBalance: openingBal,
        closingBalance: closingBal,
        totalIncome: income,
        totalExpenses: expenses,
        netProfit: netProfit,
        date: date,
        lastUpdated: new Date().toISOString()
      }
    };
    setDailyBalances(updated);
    save(SK.DAILY_BALANCES, updated);
    toast(`✅ Balance for ${date} saved! Closing: LKR ${closingBal.toFixed(2)}`);
  };

  const editOpeningBalance = (date, newOpeningBalance) => {
    const existing = dailyBalances[date] || {};
    const updated = {
      ...dailyBalances,
      [date]: {
        ...existing,
        openingBalance: newOpeningBalance,
        closingBalance: newOpeningBalance + (existing.netProfit || 0),
        lastUpdated: new Date().toISOString()
      }
    };
    setDailyBalances(updated);
    save(SK.DAILY_BALANCES, updated);
    toast(`✅ Opening balance for ${date} updated to LKR ${newOpeningBalance.toFixed(2)}`);
    setEditingBalanceDate(null);
    setEditBalanceValue('');
  };

  const setBBF = () => {
    const amount = parseFloat(bbfAmount);
    if (isNaN(amount) || amount < 0) {
      toast('⚠️ Please enter a valid amount');
      return;
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    
    const updated = {
      ...dailyBalances,
      [tomorrowStr]: {
        openingBalance: amount,
        closingBalance: amount,
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        date: tomorrowStr,
        isBBF: true,
        lastUpdated: new Date().toISOString()
      }
    };
    setDailyBalances(updated);
    save(SK.DAILY_BALANCES, updated);
    toast(`✅ Balance Brought Forward set for ${tomorrowStr}: LKR ${amount.toFixed(2)}`);
    setShowBBFModal(false);
    setBbfAmount('');
  };

  const [selectedReport, setSelectedReport] = useState('full');
  const [showFullChoice, setShowFullChoice] = useState(false);

  const stats = [
    { icon: '🔧', label: 'Repair Income', val: `LKR ${repairIncome.toLocaleString()}`, bg: '#dbeafe', color: '#1d4ed8' },
    { icon: '🛍️', label: 'Sales Income', val: `LKR ${salesIncome.toLocaleString()}`, bg: '#ffedd5', color: '#c2410c' },
    { icon: '📉', label: 'Expenses', val: `LKR ${totalExp.toLocaleString()}`, bg: '#fee2e2', color: '#b91c1c' },
    { icon: '📈', label: 'Net Profit', val: `LKR ${profit.toLocaleString()}`, bg: '#dcfce7', color: '#15803d' },
  ];

  const reportCards = [
    { id: 'full', icon: '📋', title: 'Full Report', subtitle: 'Complete overview with all business details' },
    { id: 'today', icon: '📄', title: "Today's Report", subtitle: 'Sales, billing & expenses with balance sheet' },
    { id: 'monthly', icon: '📆', title: 'Monthly Report', subtitle: 'This month’s revenue and costs' },
    { id: 'stock', icon: '📦', title: 'Stock Report', subtitle: 'Inventory levels and low-stock alerts' },
  ];

  const exportFullReport = () => {
    const totalRepairIncome = billed.reduce((s, b) => s + (b.netAmount || b.amount || 0), 0);
    const totalSalesIncome = sales.reduce((s, x) => s + (x.payable || x.total || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netProfit = totalRepairIncome + totalSalesIncome - totalExpenses;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Full Business Report</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:20px;color:#1f2937;}
        .header{background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;padding:20px;border-radius:10px;margin-bottom:20px;}
        .header h1{margin:0;color:#fff;font-size:24px;}
        .header p{margin:5px 0 0;opacity:0.8;}
        .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:25px;}
        .summary-card{background:#f8fafc;padding:15px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;}
        .summary-card .icon{font-size:28px;}
        .summary-card .label{font-size:12px;color:#64748b;text-transform:uppercase;margin-top:5px;}
        .summary-card .value{font-size:22px;font-weight:700;color:#0f172a;}
        table{border-collapse:collapse;width:100%;margin-bottom:20px;}
        th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;}
        th{background:#1e3a8a;color:white;}
        .section-title{background:#dbeafe;padding:10px;font-weight:700;font-size:14px;margin-top:20px;}
        .total-row{background:#fef3c7;font-weight:700;}
        .footer{text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;}
        .status-low{color:#dc2626;font-weight:700;}
        .status-ok{color:#16a34a;font-weight:700;}
      </style>
      </head>
      <body>
        <div class="header"><h1>📊 Metro Phone Shop - Full Business Report</h1><p><strong>Generated:</strong> ${new Date().toLocaleString()} | <strong>Report Period:</strong> All Time</p></div>
        <div class="summary-grid">
          <div class="summary-card"><div class="icon">🔧</div><div class="label">Repair Income</div><div class="value">LKR ${totalRepairIncome.toLocaleString()}</div></div>
          <div class="summary-card"><div class="icon">🛍️</div><div class="label">Sales Income</div><div class="value">LKR ${totalSalesIncome.toLocaleString()}</div></div>
          <div class="summary-card"><div class="icon">📉</div><div class="label">Expenses</div><div class="value">LKR ${totalExpenses.toLocaleString()}</div></div>
          <div class="summary-card"><div class="icon">📈</div><div class="label">Net Profit</div><div class="value" style="color:${netProfit >= 0 ? '#15803d' : '#dc2626'}">LKR ${netProfit.toLocaleString()}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:25px;">
          <div class="summary-card"><div class="label">Products</div><div class="value">${products.length}</div></div>
          <div class="summary-card"><div class="label">Customers</div><div class="value">${customers.length}</div></div>
          <div class="summary-card"><div class="label">Workers</div><div class="value">${workers.filter(w => w.active !== false).length}</div></div>
          <div class="summary-card"><div class="label">Low Stock Items</div><div class="value" style="color:#dc2626;">${lowStock.length}</div></div>
        </div>
        <div class="section-title">🔧 REPAIR BILLINGS</div>
        <table><thead><tr><th>Bill ID</th><th>Order ID</th><th>Customer</th><th>Worker</th><th>Amount (LKR)</th><th>Date</th></tr></thead>
          <tbody>${billed.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No repair billings</td></tr>' : 
            billed.map(b => `<tr><td>${b.id}</td><td>${b.orderId}</td><td>${b.customerName}</td><td>${b.workerName || 'N/A'}</td><td>${(b.netAmount || b.amount || 0).toFixed(2)}</td><td>${b.billedDate}</td></tr>`).join('')}</tbody>
        </table>
        <div class="section-title">🛍️ SALES INVOICES</div>
        <table><thead><tr><th>Invoice ID</th><th>Customer</th><th>Total (LKR)</th><th>Paid (LKR)</th><th>Due (LKR)</th><th>Date</th></tr></thead>
          <tbody>${sales.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No sales</td></tr>' :
            sales.map(inv => `<tr><td>${inv.id}</td><td>${inv.customer}</td><td>${(inv.payable || inv.total || 0).toFixed(2)}</td><td>${(inv.paid || 0).toFixed(2)}</td><td>${(inv.due || 0).toFixed(2)}</td><td>${inv.date}</td></tr>`).join('')}</tbody>
        </table>
        <div class="section-title">💰 EXPENSES</div>
        <table><thead><tr><th>Date</th><th>Title</th><th>Amount (LKR)</th></tr></thead>
          <tbody>${expenses.length === 0 ? '<tr><td colspan="3" style="text-align:center;">No expenses</td></tr>' :
            expenses.map(exp => `<tr><td>${exp.date}</td><td>${exp.title}</td><td>${(exp.amount || 0).toFixed(2)}</td></tr>`).join('')}</tbody>
        </table>
        <div class="section-title">📦 INVENTORY</div>
        <table><thead><tr><th>Product</th><th>Stock</th><th>Price (LKR)</th><th>Status</th></tr></thead>
          <tbody>${products.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No products</td></tr>' :
            products.map(p => `<tr><td>${p.name}</td><td>${p.stock}</td><td>${(p.sell || 0).toFixed(2)}</td><td class="${p.stock <= (p.reorderLevel || 5) ? 'status-low' : 'status-ok'}">${p.stock <= (p.reorderLevel || 5) ? '⚠️ LOW' : '✅ OK'}</td></tr>`).join('')}</tbody>
        </table>
        <div class="section-title">🕒 PENDING REPAIRS</div>
        <table><thead><tr><th>Order ID</th><th>Customer</th><th>Phone</th><th>Worker</th><th>Device</th></tr></thead>
          <tbody>${pendingJobs.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No pending repairs</td></tr>' :
            pendingJobs.map(j => `<tr><td>${j.orderId}</td><td>${j.customerName}</td><td>${j.phone}</td><td>${j.workerName || 'N/A'}</td><td>${j.deviceType || '-'}</td></tr>`).join('')}</tbody>
        </table>
        <div class="footer">Generated by Metro Phone Shop POS System | All financial figures are in LKR (Sri Lankan Rupees)</div>
      </body>
      </html>
    `;
    downloadExcel(html, `Full_Report_${today}.xls`);
  };

  const exportTodayReportExcel = () => {
    const currentBalance = dailyBalances[today] || { openingBalance: openingBalance, closingBalance: closingBalance, totalIncome: todayIncome, totalExpenses: todayExpenseTotal, netProfit: todayNetProfit };
    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>Daily Business Report - ${today}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:20px;color:#1f2937;}
        .report-header{background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;padding:20px;border-radius:10px;margin-bottom:20px;}
        .report-header h1{margin:0;color:#fff;font-size:24px;}
        .report-header p{margin:5px 0 0;opacity:0.8;}
        .summary-box{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px;}
        .summary-item{background:#f8fafc;padding:15px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;}
        .summary-item .label{font-size:12px;color:#64748b;text-transform:uppercase;}
        .summary-item .value{font-size:22px;font-weight:700;color:#0f172a;}
        .balance-sheet{background:#f0fdf4;border:2px solid #15803d;border-radius:10px;padding:20px;margin-bottom:25px;}
        .balance-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #bbf7d0;}
        .balance-total{font-weight:700;font-size:18px;color:#15803d;margin-top:10px;padding-top:10px;border-top:2px solid #15803d;}
        table{border-collapse:collapse;width:100%;margin-bottom:20px;}
        th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;}
        th{background:#1e3a8a;color:white;}
        .section-title{background:#dbeafe;padding:10px;font-weight:700;font-size:14px;margin-top:20px;}
        .total-row{background:#fef3c7;font-weight:700;}
        .profit{color:#15803d;font-weight:700;}
        .loss{color:#dc2626;font-weight:700;}
        .footer{text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;}
      </style>
      </head>
      <body>
        <div class="report-header"><h1>📊 Metro Phone Shop - Daily Business Report</h1><p><strong>Date:</strong> ${today} | <strong>Generated:</strong> ${new Date().toLocaleString()}</p></div>
        <div class="summary-box">
          <div class="summary-item"><div class="label">Repair Income</div><div class="value">LKR ${todayRepairs.reduce((s, b) => s + (b.netAmount || b.amount || 0), 0).toLocaleString()}</div></div>
          <div class="summary-item"><div class="label">Sales Income</div><div class="value">LKR ${todaySales.reduce((s, i) => s + (i.payable || i.total || 0), 0).toLocaleString()}</div></div>
          <div class="summary-item"><div class="label">Expenses</div><div class="value">LKR ${todayExpenseTotal.toLocaleString()}</div></div>
          <div class="summary-item"><div class="label">Net Profit</div><div class="value" style="color:${todayNetProfit >= 0 ? '#15803d' : '#dc2626'}">LKR ${todayNetProfit.toLocaleString()}</div></div>
        </div>
        <div class="balance-sheet">
          <h2 style="margin-top:0;">💰 BALANCE SHEET (Brought Forward System)</h2>
          <div class="balance-row"><span><strong>Opening Balance (Brought Forward):</strong></span><span>LKR ${(currentBalance.openingBalance || openingBalance).toFixed(2)}</span></div>
          <div class="balance-row"><span><strong>Today's Income:</strong></span><span>LKR ${(currentBalance.totalIncome || todayIncome).toFixed(2)}</span></div>
          <div class="balance-row"><span><strong>Today's Expenses:</strong></span><span>LKR ${(currentBalance.totalExpenses || todayExpenseTotal).toFixed(2)}</span></div>
          <div class="balance-row"><span><strong>Today's Net Profit/Loss:</strong></span><span class="${(currentBalance.netProfit || todayNetProfit) >= 0 ? 'profit' : 'loss'}">LKR ${(currentBalance.netProfit || todayNetProfit).toFixed(2)}</span></div>
          <div class="balance-total"><span><strong>Closing Balance (Carried Forward):</strong></span><span>LKR ${(currentBalance.closingBalance || closingBalance).toFixed(2)}</span></div>
          <div style="margin-top:10px;font-size:12px;color:#6b7280;">ⓘ This closing balance will be brought forward to ${new Date(new Date(today).setDate(new Date(today).getDate() + 1)).toISOString().slice(0, 10)}</div>
        </div>
        <div class="section-title">📈 INCOME BREAKDOWN</div>
        <table><thead><tr><th>Category</th><th>Amount (LKR)</th><th>Count</th></tr></thead>
          <tbody><tr><td>Repair Services Income</td><td>${todayRepairs.reduce((s, b) => s + (b.netAmount || b.amount || 0), 0).toFixed(2)}</td><td>${todayRepairs.length} invoices</td></tr>
          <tr><td>Product Sales Income</td><td>${todaySales.reduce((s, i) => s + (i.payable || i.total || 0), 0).toFixed(2)}</td><td>${todaySales.length} invoices</td></tr>
          <tr class="total-row"><td><strong>Total Income</strong></td><td><strong>${todayIncome.toFixed(2)}</strong></td><td></td></tr></tbody>
        </table>
        <div class="section-title">📉 EXPENSE BREAKDOWN</div>
        <table><thead><tr><th>Expense Title</th><th>Amount (LKR)</th><th>Date</th></tr></thead>
          <tbody>${todayExpenses.map(exp => `<tr><td>${exp.title}</td><td>${(exp.amount || 0).toFixed(2)}</td><td>${exp.date}</td></tr>`).join('')}
          ${todayExpenses.length === 0 ? '<tr><td colspan="3" style="text-align:center;">No expenses recorded today</td></tr>' : ''}
          <tr class="total-row"><td><strong>Total Expenses</strong></td><td><strong>${todayExpenseTotal.toFixed(2)}</strong></td><td></td></tr></tbody>
        </table>
        <div class="section-title">🔧 REPAIR BILLINGS DETAILS</div>
        <table><thead><tr><th>Order ID</th><th>Customer Name</th><th>Worker</th><th>Amount (LKR)</th></tr></thead>
          <tbody>${todayRepairs.map(rep => `<tr><td>${rep.id || rep.orderId}</td><td>${rep.customer || rep.customerName}</td><td>${rep.workerName || rep.assignedTo || 'N/A'}</td><td>${(rep.netAmount || rep.amount || 0).toFixed(2)}</td></tr>`).join('')}
          ${todayRepairs.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No repair billings today</td></tr>' : ''}</tbody>
        </table>
        <div class="section-title">🛍️ PRODUCT SALES DETAILS</div>
        <table><thead><tr><th>Invoice ID</th><th>Customer Name</th><th>Items Count</th><th>Total (LKR)</th><th>Paid (LKR)</th><th>Due (LKR)</th><th>Method</th></tr></thead>
          <tbody>${todaySales.map(inv => `<tr><td>${inv.id}</td><td>${inv.customer || inv.customerName}</td><td>${inv.lines?.reduce((a, b) => a + b.qty, 0) || 0}</td><td>${(inv.payable || inv.total || 0).toFixed(2)}</td><td>${(inv.paid || 0).toFixed(2)}</td><td>${(inv.due || 0).toFixed(2)}</td><td>${inv.method || 'Cash'}</td></tr>`).join('')}
          ${todaySales.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No sales today</td></tr>' : ''}</tbody>
        </table>
        <div class="section-title">📊 QUICK STATISTICS</div>
        <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
          <tbody><tr><td>Total Transactions Today</td><td>${todayRepairs.length + todaySales.length}</td></tr>
          <tr><td>Average Transaction Value</td><td>LKR ${(todayIncome / (todayRepairs.length + todaySales.length || 1)).toFixed(2)}</td></tr>
          <tr><td>Cash Transactions</td><td>${todaySales.filter(i => i.method === 'Cash').length + todayRepairs.filter(r => r.paymentMethod === 'Cash').length}</td></tr>
          <tr><td>Credit/Due Amount</td><td>LKR ${todaySales.reduce((s, i) => s + (i.due || 0), 0).toFixed(2)}</td></tr></tbody>
        </table>
        <div class="footer">Generated by Metro Phone Shop POS System | Closing balance will be brought forward to next business day</div>
      </body>
      </html>
    `;
    downloadExcel(html, `Daily_Report_${today}.xls`);
  };

  const exportSelectedReport = () => {
    if (selectedReport === 'today') {
      exportTodayReportExcel();
      return;
    }
    if (selectedReport === 'stock') {
      const rows = products.map(p => [p.name, p.stock, p.reorderLevel || 5, p.stock <= (p.reorderLevel || 5) ? 'LOW' : 'OK', p.sell || 0]);
      downloadCSV([['Product', 'Stock', 'Reorder Level', 'Status', 'Price (LKR)'], ...rows], `Stock_Report_${monthPrefix}.csv`);
      return;
    }
    if (selectedReport === 'monthly') {
      const monthIncome = monthSales.reduce((s, i) => s + (i.payable || i.total || 0), 0);
      const monthExpenseTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const monthRepairIncome = monthRepairs.reduce((s, b) => s + (b.netAmount || b.amount || 0), 0);
      const rows = [
        ['Summary', ''],
        ['Total Repair Income', `LKR ${monthRepairIncome.toFixed(2)}`],
        ['Total Sales Income', `LKR ${monthIncome.toFixed(2)}`],
        ['Total Expenses', `LKR ${monthExpenseTotal.toFixed(2)}`],
        ['Net Profit', `LKR ${(monthIncome + monthRepairIncome - monthExpenseTotal).toFixed(2)}`],
        [''],
        ['Invoice Details'],
        ...monthSales.map(inv => [inv.id, inv.customer || inv.customerName, inv.date, `LKR ${(inv.payable || inv.total || 0).toFixed(2)}`, `LKR ${(inv.paid || 0).toFixed(2)}`, `LKR ${(inv.due || 0).toFixed(2)}`, inv.method || 'Cash'])
      ];
      downloadCSV(rows, `Monthly_Report_${monthPrefix}.csv`);
      return;
    }
    exportFullReport();
  };

  const resetReport = () => {
    setSelectedReport('full');
    setShowFullChoice(false);
  };

  const handleReportCardClick = (id) => {
    if (id === 'full') {
      setShowFullChoice(true);
      return;
    }
    setSelectedReport(id);
  };

  const renderEditBalanceModal = () => {
    if (!editingBalanceDate) return null;
    return (
      <Modal title={`Edit Opening Balance - ${editingBalanceDate}`} onClose={() => setEditingBalanceDate(null)}>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Opening Balance (LKR)</label>
            <input type="number" style={{ ...styles.input, width: '100%' }} value={editBalanceValue} onChange={e => setEditBalanceValue(e.target.value)} placeholder="Enter opening balance amount" />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button style={styles.btnOutline} onClick={() => setEditingBalanceDate(null)}>Cancel</button>
            <button style={{ ...styles.btnPrimary, background: '#10b981' }} onClick={() => editOpeningBalance(editingBalanceDate, parseFloat(editBalanceValue))}>Save Changes</button>
          </div>
        </div>
      </Modal>
    );
  };

  const renderBBFModal = () => {
    if (!showBBFModal) return null;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    return (
      <Modal title={`📥 Set Balance Brought Forward for ${tomorrowStr}`} onClose={() => setShowBBFModal(false)}>
        <div style={{ padding: 20 }}>
          <p style={{ marginBottom: 16, color: '#475569' }}>Set the opening balance for <strong>{tomorrowStr}</strong>. This will be used as the starting balance for the next business day.</p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Opening Balance (LKR)</label>
            <input type="number" style={{ ...styles.input, width: '100%' }} value={bbfAmount} onChange={e => setBbfAmount(e.target.value)} placeholder={`Enter opening balance (current closing: ${closingBalance.toFixed(2)})`} />
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>💡 Current closing balance: <strong>LKR {closingBalance.toFixed(2)}</strong><br />Usually, BBF = Previous day's closing balance</div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button style={styles.btnOutline} onClick={() => setShowBBFModal(false)}>Cancel</button>
            <button style={{ ...styles.btnPrimary, background: '#10b981' }} onClick={setBBF}>📥 Set Balance Brought Forward</button>
          </div>
        </div>
      </Modal>
    );
  };

  const renderReportDetail = () => {
    if (selectedReport === 'today') {
      const currentBalance = dailyBalances[today] || { openingBalance: openingBalance, closingBalance: closingBalance };
      return (
        <div>
          <div style={{ marginBottom: 16, fontWeight: 700 }}>📄 Today's business report ({today})</div>
          <div style={{ background: '#f0fdf4', border: '2px solid #15803d', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#15803d' }}>💰 Balance Brought Forward System</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }} onClick={() => saveDailyBalance(today, openingBalance, closingBalance, todayIncome, todayExpenseTotal, todayNetProfit)}>Save Today's Balance</button>
                <button style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }} onClick={() => setShowBBFModal(true)}>📥 Set BBF for Tomorrow</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 15 }}>
              <div>
                <div style={{ fontSize: 12, color: '#166534' }}>Opening Balance (Brought Forward)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>LKR {openingBalance.toFixed(2)}</div>
                <button style={{ marginTop: 8, fontSize: 11, background: '#e0e7ff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }} onClick={() => { const newBalance = prompt('Enter opening balance amount:', openingBalance); if (newBalance !== null && !isNaN(parseFloat(newBalance))) { editOpeningBalance(today, parseFloat(newBalance)); } }}>✏️ Edit Opening Balance</button>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#166534' }}>Closing Balance (Carried Forward)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>LKR {closingBalance.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Will be brought forward to {new Date(new Date(today).setDate(new Date(today).getDate() + 1)).toISOString().slice(0, 10)}</div>
              </div>
            </div>
            <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #bbf7d0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <div><div style={{ fontSize: 11, color: '#166534' }}>Today's Income</div><div style={{ fontWeight: 700 }}>LKR {todayIncome.toFixed(2)}</div></div>
                <div><div style={{ fontSize: 11, color: '#166534' }}>Today's Expenses</div><div style={{ fontWeight: 700 }}>LKR {todayExpenseTotal.toFixed(2)}</div></div>
                <div><div style={{ fontSize: 11, color: '#166534' }}>Net Profit/Loss</div><div style={{ fontWeight: 700, color: todayNetProfit >= 0 ? '#15803d' : '#dc2626' }}>LKR {todayNetProfit.toFixed(2)}</div></div>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>📜 Recent Balance History</div>
            <div style={{ overflowX: 'auto', maxHeight: 200, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#e5e7eb' }}><th style={{ padding: 8, textAlign: 'left' }}>Date</th><th style={{ padding: 8, textAlign: 'right' }}>Opening Balance</th><th style={{ padding: 8, textAlign: 'right' }}>Net Profit</th><th style={{ padding: 8, textAlign: 'right' }}>Closing Balance</th><th style={{ padding: 8, textAlign: 'center' }}>Action</th></tr></thead>
                <tbody>
                  {Object.entries(dailyBalances).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7).map(([date, balance]) => (
                    <tr key={date} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 8 }}>{date} {balance.isBBF ? '📥 BBF' : ''}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>LKR {balance.openingBalance?.toFixed(2) || 0}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: balance.netProfit >= 0 ? '#15803d' : '#dc2626' }}>LKR {balance.netProfit?.toFixed(2) || 0}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>LKR {balance.closingBalance?.toFixed(2) || 0}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }} onClick={() => { setEditingBalanceDate(date); setEditBalanceValue(balance.openingBalance?.toString() || '0'); }}>Edit Opening</button>
                      </td>
                    </tr>
                  ))}
                  {Object.keys(dailyBalances).length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No balance history found. Save today's balance to start tracking.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Repair Income</div><div style={styles.reportValue}>LKR {todayRepairs.reduce((s, b) => s + (b.netAmount || b.amount || 0), 0).toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Sales Income</div><div style={styles.reportValue}>LKR {todaySales.reduce((s, i) => s + (i.payable || i.total || 0), 0).toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Expenses</div><div style={styles.reportValue}>LKR {todayExpenseTotal.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Net Profit</div><div style={styles.reportValue}>LKR {todayNetProfit.toLocaleString()}</div></div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🔧 Repair Billings</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Order', 'Customer', 'Worker', 'Amount', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{todayRepairs.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No repair billings today.</td></tr>}
                  {todayRepairs.map(rep => <tr key={rep.id || rep.orderId}><td style={styles.td}>{rep.id || rep.orderId}</td><td style={styles.td}>{rep.customer || rep.customerName}</td><td style={styles.td}>{rep.workerName || rep.assignedTo || 'N/A'}</td><td style={styles.td}>LKR {(rep.netAmount || rep.amount || 0).toFixed(2)}</td><td style={styles.td}>{rep.billedDate || rep.date || ''}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🛍️ Accessory Sales</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Invoice', 'Customer', 'Total', 'Paid', 'Due', 'Method'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{todaySales.length === 0 && <tr><td colSpan={6} style={styles.emptyTd}>No accessory sales today.</td></tr>}
                  {todaySales.map(inv => <tr key={inv.id}><td style={styles.td}>{inv.id}</td><td style={styles.td}>{inv.customer || inv.customerName}</td><td style={styles.td}>LKR {(inv.payable || inv.total || 0).toFixed(2)}</td><td style={styles.td}>LKR {(inv.paid || 0).toFixed(2)}</td><td style={styles.td}>LKR {(inv.due || 0).toFixed(2)}</td><td style={styles.td}>{inv.method || 'Cash'}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>💰 Expenses</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Date', 'Title', 'Amount'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{todayExpenses.length === 0 && <tr><td colSpan={3} style={styles.emptyTd}>No expenses recorded today.</td></tr>}
                  {todayExpenses.map((exp, idx) => <tr key={idx}><td style={styles.td}>{exp.date}</td><td style={styles.td}>{exp.title}</td><td style={styles.td}>LKR {(exp.amount || 0).toFixed(2)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }
    if (selectedReport === 'monthly') {
      const monthIncome = monthSales.reduce((s, i) => s + (i.payable || i.total || 0), 0);
      const monthExpenseTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const monthRepairIncome = monthRepairs.reduce((s, b) => s + (b.netAmount || b.amount || 0), 0);
      const monthProfit = monthIncome + monthRepairIncome - monthExpenseTotal;
      return (
        <div>
          <div style={{ marginBottom: 16, fontWeight: 700 }}>📆 Monthly business report ({monthPrefix})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Repair Income</div><div style={styles.reportValue}>LKR {monthRepairIncome.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Sales Income</div><div style={styles.reportValue}>LKR {monthIncome.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Expenses</div><div style={styles.reportValue}>LKR {monthExpenseTotal.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Net Profit</div><div style={styles.reportValue}>LKR {monthProfit.toLocaleString()}</div></div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🔧 Repair Billings</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Order', 'Customer', 'Worker', 'Amount', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{monthRepairs.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No billed repairs this month.</td></tr>}
                  {monthRepairs.map(rep => <tr key={rep.id || rep.orderId}><td style={styles.td}>{rep.id || rep.orderId}</td><td style={styles.td}>{rep.customer || rep.customerName}</td><td style={styles.td}>{rep.workerName || rep.assignedTo || 'N/A'}</td><td style={styles.td}>LKR {(rep.netAmount || rep.amount || 0).toFixed(2)}</td><td style={styles.td}>{rep.billedDate || rep.date || ''}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🛍️ Accessory Sales</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Invoice', 'Customer', 'Total', 'Paid', 'Due', 'Method'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{monthSales.length === 0 && <tr><td colSpan={6} style={styles.emptyTd}>No accessory sales this month.</td></tr>}
                  {monthSales.map(inv => <tr key={inv.id}><td style={styles.td}>{inv.id}</td><td style={styles.td}>{inv.customer || inv.customerName}</td><td style={styles.td}>LKR {(inv.payable || inv.total || 0).toFixed(2)}</td><td style={styles.td}>LKR {(inv.paid || 0).toFixed(2)}</td><td style={styles.td}>LKR {(inv.due || 0).toFixed(2)}</td><td style={styles.td}>{inv.method || 'Cash'}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>💰 Expenses</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Date', 'Title', 'Amount'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{monthExpenses.length === 0 && <tr><td colSpan={3} style={styles.emptyTd}>No expenses for this month.</td></tr>}
                  {monthExpenses.map((exp, idx) => <tr key={idx}><td style={styles.td}>{exp.date}</td><td style={styles.td}>{exp.title}</td><td style={styles.td}>LKR {(exp.amount || 0).toFixed(2)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }
    if (selectedReport === 'stock') {
      return (
        <div>
          <div style={{ marginBottom: 16, fontWeight: 700 }}>📦 Inventory summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Total Products</div><div style={styles.reportValue}>{products.length}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Low Stock Items</div><div style={styles.reportValue}>{lowStock.length}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Inventory Value</div><div style={styles.reportValue}>LKR {products.reduce((sum, p) => sum + ((p.stock || 0) * (p.sell || 0)), 0).toLocaleString()}</div></div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>📋 Product Inventory</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Product', 'Stock', 'Price', 'Reorder', 'Status'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{products.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No inventory items available.</td></tr>}
                  {products.map(p => <tr key={p.id}><td style={styles.td}>{p.name}</td><td style={styles.td}>{p.stock}</td><td style={styles.td}>LKR {p.sell || 0}</td><td style={styles.td}>{p.reorderLevel || 5}</td><td style={styles.td}>{p.stock <= (p.reorderLevel || 5) ? 'LOW' : 'OK'}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          {lowStock.length > 0 && (
            <div style={{ background: '#fef2f2', padding: 16, borderRadius: 16, border: '1px solid #fecaca', marginBottom: 22 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ Restock Recommendations</div>
              <ul style={{ margin: '0 0 0 18px', color: '#991b1b' }}>{lowStock.map(item => <li key={item.id}>{item.name}: only {item.stock} left</li>)}</ul>
            </div>
          )}
        </div>
      );
    }
    if (selectedReport === 'full') {
      const totalRepairIncome = billed.reduce((s, b) => s + (b.netAmount || b.amount || 0), 0);
      const totalSalesIncome = sales.reduce((s, x) => s + (x.payable || x.total || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const netProfit = totalRepairIncome + totalSalesIncome - totalExpenses;
      return (
        <div>
          <div style={{ marginBottom: 16, fontWeight: 700 }}>📋 Full business report</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 18 }}>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Repair Income</div><div style={styles.reportValue}>LKR {totalRepairIncome.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Sales Income</div><div style={styles.reportValue}>LKR {totalSalesIncome.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Expenses</div><div style={styles.reportValue}>LKR {totalExpenses.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Net Profit</div><div style={styles.reportValue}>LKR {netProfit.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Products</div><div style={styles.reportValue}>{products.length}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Workers</div><div style={styles.reportValue}>{workers.filter(w => w.active !== false).length}</div></div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🔧 Repair Billings</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Order', 'Customer', 'Worker', 'Amount', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{billed.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No repair billings found.</td></tr>}
                  {billed.map(rep => <tr key={rep.id || rep.orderId}><td style={styles.td}>{rep.id || rep.orderId}</td><td style={styles.td}>{rep.customer || rep.customerName}</td><td style={styles.td}>{rep.workerName || rep.assignedTo || 'N/A'}</td><td style={styles.td}>LKR {(rep.netAmount || rep.amount || 0).toFixed(2)}</td><td style={styles.td}>{rep.billedDate || rep.date || ''}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🛍️ Accessory Sales</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Invoice', 'Customer', 'Total', 'Paid', 'Due', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{sales.length === 0 && <tr><td colSpan={6} style={styles.emptyTd}>No accessory sales recorded.</td></tr>}
                  {sales.map(inv => <tr key={inv.id}><td style={styles.td}>{inv.id}</td><td style={styles.td}>{inv.customer || inv.customerName}</td><td style={styles.td}>LKR {(inv.payable || inv.total || 0).toFixed(2)}</td><td style={styles.td}>LKR {(inv.paid || 0).toFixed(2)}</td><td style={styles.td}>LKR {(inv.due || 0).toFixed(2)}</td><td style={styles.td}>{inv.date}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>💰 Expenses</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Date', 'Title', 'Amount'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{expenses.length === 0 && <tr><td colSpan={3} style={styles.emptyTd}>No expenses recorded.</td></tr>}
                  {expenses.map((exp, idx) => <tr key={idx}><td style={styles.td}>{exp.date}</td><td style={styles.td}>{exp.title}</td><td style={styles.td}>LKR {(exp.amount || 0).toFixed(2)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>📦 Inventory</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Product', 'Stock', 'Price', 'Reorder', 'Status'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{products.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No products available.</td></tr>}
                  {products.map(p => <tr key={p.id}><td style={styles.td}>{p.name}</td><td style={styles.td}>{p.stock}</td><td style={styles.td}>LKR {p.sell || 0}</td><td style={styles.td}>{p.reorderLevel || 5}</td><td style={styles.td}>{p.stock <= (p.reorderLevel || 5) ? 'LOW' : 'OK'}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          {lowStock.length > 0 && (
            <div style={{ background: '#fef2f2', padding: 18, borderRadius: 16, border: '1px solid #fecaca', marginBottom: 22 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ Low stock alerts</div>
              <ul style={{ margin: '0 0 0 18px', color: '#991b1b' }}>{lowStock.map(item => <li key={item.id}>{item.name}: only {item.stock} left</li>)}</ul>
            </div>
          )}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🕒 Pending Repairs</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Order', 'Customer', 'Phone', 'Status', 'Due Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{pendingJobs.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No pending repairs in queue.</td></tr>}
                  {pendingJobs.map(job => <tr key={job.orderId}><td style={styles.td}>{job.orderId}</td><td style={styles.td}>{job.customerName}</td><td style={styles.td}>{job.phone}</td><td style={styles.td}>{job.status || 'Pending'}</td><td style={styles.td}>{job.returnDate || 'N/A'}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }
    return <div style={{ padding: 24, color: '#475569', textAlign: 'center' }}>Select a report card above to view detailed analytics.</div>;
  };

  return (
    <div>
      {renderEditBalanceModal()}
      {renderBBFModal()}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>
      <GlassCard title="📊 Reports">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, color: '#1f2937' }}>Choose a report to view details</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ ...styles.btnOutline, padding: '10px 18px' }} onClick={exportSelectedReport}>Export Excel</button>
            <button style={{ ...styles.btnOutline, padding: '10px 18px' }} onClick={resetReport}>Reset</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {reportCards.map(card => (
            <div key={card.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, textAlign: 'center', cursor: 'pointer' }} onClick={() => handleReportCardClick(card.id)}>
              <div style={{ fontSize: 40 }}>{card.icon}</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>{card.title}</div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{card.subtitle}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
          {renderReportDetail()}
        </div>
      </GlassCard>
      {showFullChoice && (
        <Modal title="Choose report type">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            <button style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }} onClick={() => { setShowFullChoice(false); setSelectedReport('today'); }}>Today's Report</button>
            <button style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #6366f1', background: '#eef2ff', color: '#4338ca', fontWeight: 700, cursor: 'pointer' }} onClick={() => { setShowFullChoice(false); setSelectedReport('monthly'); }}>Monthly Report</button>
          </div>
          <div style={{ marginTop: 18, textAlign: 'right' }}>
            <button style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer' }} onClick={() => setShowFullChoice(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}