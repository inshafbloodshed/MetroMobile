// src/components/finance/ReportsPanel.js
import React, { useState, useEffect } from 'react';
import { load, save, toast, SK } from '../../utils/storage';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';

export function ReportsPanel({ user }) {
  // ── State for data - initialize as empty arrays ──────────
  const [billed, setBilled] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Financial Sections from Image ─────────────────────────
  const [cashPaid, setCashPaid] = useState({
    posSystem: 0,
    onlineTill: 0,
    metroTill: 0,
    total: 0
  });
  const [accessData, setAccessData] = useState([
    { description: 'uncle', amount: 0 },
    { description: 'Asmath', amount: 0 },
    { description: 'Sajith', amount: 0 },
    { description: 'BOSS', amount: 0 },
    { description: 'SABITH', amount: 0 },
    { description: 'SEET', amount: 0 },
    { description: 'NAWFAR', amount: 0 }
  ]);
  const [cashData, setCashData] = useState([
    { description: 'Uncle Salary', amount: 0 },
    { description: 'Asmath Salary', amount: 0 },
    { description: 'Sajith Salary', amount: 0 },
    { description: 'Sabith', amount: 0 },
    { description: 'Shop', amount: 0 },
    { description: 'Balance Cash', amount: 0 }
  ]);
  const [bossEarlyMoney, setBossEarlyMoney] = useState({
    bankingMoney: 0,
    onlineTransfer: 0,
    metroShopSale: 0,
    metroMoney: 0,
    totalGetMoney: 0
  });
  const [openTill, setOpenTill] = useState({
    tomorrow: 0,
    cash: 0,
    sale: 0
  });
  const [todayBank, setTodayBank] = useState({
    beforeBankRTCash: 0
  });

  // ── Balance brought forward system ──────────────────────
  const [dailyBalances, setDailyBalances] = useState({});
  const [editingBalanceDate, setEditingBalanceDate] = useState(null);
  const [editBalanceValue, setEditBalanceValue] = useState('');
  const [showBBFModal, setShowBBFModal] = useState(false);
  const [bbfAmount, setBbfAmount] = useState('');

  const [selectedReport, setSelectedReport] = useState('full');
  const [showFullChoice, setShowFullChoice] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  // ── Load data on component mount ──────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        let billedData = [];
        let salesData = [];
        let expensesData = [];
        let productsData = [];
        let jobsData = [];
        let workersData = [];
        let customersData = [];
        let returnsData = [];
        let salesReturnsData = [];
        let balancesData = {};

        // Load financial data from localStorage
        try {
          const cashPaidData = JSON.parse(localStorage.getItem('cashPaid') || '{"posSystem":0,"onlineTill":0,"metroTill":0,"total":0}');
          setCashPaid(cashPaidData);
          
          const accessDataRaw = JSON.parse(localStorage.getItem('accessData') || '[{"description":"uncle","amount":0},{"description":"Asmath","amount":0},{"description":"Sajith","amount":0},{"description":"BOSS","amount":0},{"description":"SABITH","amount":0},{"description":"SEET","amount":0},{"description":"NAWFAR","amount":0}]');
          setAccessData(accessDataRaw);
          
          const cashDataRaw = JSON.parse(localStorage.getItem('cashData') || '[{"description":"Uncle Salary","amount":0},{"description":"Asmath Salary","amount":0},{"description":"Sajith Salary","amount":0},{"description":"Sabith","amount":0},{"description":"Shop","amount":0},{"description":"Balance Cash","amount":0}]');
          setCashData(cashDataRaw);
          
          const bossEarlyData = JSON.parse(localStorage.getItem('bossEarlyMoney') || '{"bankingMoney":0,"onlineTransfer":0,"metroShopSale":0,"metroMoney":0,"totalGetMoney":0}');
          setBossEarlyMoney(bossEarlyData);
          
          const openTillData = JSON.parse(localStorage.getItem('openTill') || '{"tomorrow":0,"cash":0,"sale":0}');
          setOpenTill(openTillData);
          
          const todayBankData = JSON.parse(localStorage.getItem('todayBank') || '{"beforeBankRTCash":0}');
          setTodayBank(todayBankData);
        } catch (e) {
          console.warn('Error loading financial data:', e);
        }

        // Check if API is available
        if (window.api) {
          console.log('📊 Loading data from API...');
          
          try {
            const [productsRes, grnsRes, salesInvoicesRes, salesReturnsRes, customersRes] = await Promise.all([
              window.api.getProducts(false).catch(() => []),
              window.api.getGRNs().catch(() => []),
              window.api.getSalesInvoices().catch(() => []),
              window.api.getSalesReturns().catch(() => []),
              window.api.getCustomers().catch(() => [])
            ]);
            
            productsData = productsRes || [];
            billedData = grnsRes || [];
            salesData = salesInvoicesRes || [];
            salesReturnsData = salesReturnsRes || [];
            customersData = customersRes || [];
            
          } catch (e) {
            console.warn('Error loading from API:', e);
          }
          
          try {
            returnsData = await window.api.getReturns();
          } catch (e) {
            console.warn('Could not load purchase returns:', e);
            returnsData = [];
          }
          
          try {
            expensesData = JSON.parse(localStorage.getItem(SK.EXP) || '[]');
          } catch (e) {
            expensesData = [];
          }
          
          try {
            jobsData = JSON.parse(localStorage.getItem(SK.JOBS) || '[]');
          } catch (e) {
            jobsData = [];
          }
          
          try {
            workersData = JSON.parse(localStorage.getItem(SK.WORKERS) || '[]');
          } catch (e) {
            workersData = [];
          }
          
          try {
            balancesData = JSON.parse(localStorage.getItem(SK.DAILY_BALANCES) || '{}');
          } catch (e) {
            balancesData = {};
          }
          
        } else {
          console.log('📊 Loading data from localStorage...');
          const [billedDataRaw, salesDataRaw, expensesDataRaw, productsDataRaw, jobsDataRaw, workersDataRaw, customersDataRaw, returnsDataRaw, salesReturnsDataRaw, balancesDataRaw] = await Promise.all([
            load(SK.BILLED, []),
            load(SK.SALES, []),
            load(SK.EXP, []),
            load(SK.PRODUCTS, []),
            load(SK.JOBS, []),
            load(SK.WORKERS, []),
            load(SK.CUSTOMERS, []),
            load(SK.RETURNS, []),
            load(SK.SR, []),
            load(SK.DAILY_BALANCES, {})
          ]);
          
          billedData = billedDataRaw || [];
          salesData = salesDataRaw || [];
          expensesData = expensesDataRaw || [];
          productsData = productsDataRaw || [];
          jobsData = jobsDataRaw || [];
          workersData = workersDataRaw || [];
          customersData = customersDataRaw || [];
          returnsData = returnsDataRaw || [];
          salesReturnsData = salesReturnsDataRaw || [];
          balancesData = balancesDataRaw || {};
        }
        
        // Normalize data
        const normalizedReturns = (returnsData || []).map(r => ({
          ...r,
          grnId: r.grn_id || r.grnId,
          netTotal: r.net_total || r.netTotal || 0,
          supplierName: r.supplier_name || r.supplierName,
        }));
        
        const normalizedSalesReturns = (salesReturnsData || []).map(r => ({
          ...r,
          netRefund: r.net_refund || r.netRefund || 0,
          returnDate: r.return_date || r.returnDate,
          invoiceId: r.invoice_id || r.invoiceId,
        }));
        
        const normalizedBilled = (billedData || []).map(g => ({
          ...g,
          supplierName: g.supplier_name || g.supplierName,
          subTotal: g.sub_total || g.subTotal || 0,
          billNo: g.bill_no || g.billNo,
          netTotal: g.net_total || g.netTotal || 0,
        }));
        
        setBilled(normalizedBilled);
        setSales(salesData || []);
        setExpenses(expensesData || []);
        setProducts(productsData || []);
        setJobs(jobsData || []);
        setWorkers(workersData || []);
        setCustomers(customersData || []);
        setReturns(normalizedReturns);
        setSalesReturns(normalizedSalesReturns);
        setDailyBalances(balancesData || {});
        
        // Set default date
        const today = new Date().toISOString().slice(0, 10);
        setSelectedDate(today);
        
        console.log('✅ Data loaded successfully');
        
      } catch (error) {
        console.error('Error loading data:', error);
        toast('Error loading data');
        setBilled([]);
        setSales([]);
        setExpenses([]);
        setProducts([]);
        setJobs([]);
        setWorkers([]);
        setCustomers([]);
        setReturns([]);
        setSalesReturns([]);
        setDailyBalances({});
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ── Helper functions for financial data ──────────────────
  const saveFinancialData = async (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving financial data:', error);
    }
  };

  const updateCashPaid = async (field, value) => {
    const numValue = parseFloat(value) || 0;
    const updated = { ...cashPaid, [field]: numValue };
    updated.total = updated.posSystem + updated.onlineTill + updated.metroTill;
    setCashPaid(updated);
    await saveFinancialData('cashPaid', updated);
  };

  const updateAccessDescription = async (index, value) => {
    const updated = [...accessData];
    updated[index].description = value;
    setAccessData(updated);
    await saveFinancialData('accessData', updated);
  };

  const updateAccessAmount = async (index, value) => {
    const updated = [...accessData];
    updated[index].amount = parseFloat(value) || 0;
    setAccessData(updated);
    await saveFinancialData('accessData', updated);
  };

  const updateCashDescription = async (index, value) => {
    const updated = [...cashData];
    updated[index].description = value;
    setCashData(updated);
    await saveFinancialData('cashData', updated);
  };

  const updateCashAmount = async (index, value) => {
    const updated = [...cashData];
    updated[index].amount = parseFloat(value) || 0;
    setCashData(updated);
    await saveFinancialData('cashData', updated);
  };

  const updateBossEarly = async (field, value) => {
    const numValue = parseFloat(value) || 0;
    const updated = { ...bossEarlyMoney, [field]: numValue };
    updated.totalGetMoney = updated.bankingMoney + updated.onlineTransfer + updated.metroShopSale + updated.metroMoney;
    setBossEarlyMoney(updated);
    await saveFinancialData('bossEarlyMoney', updated);
  };

  const updateOpenTill = async (field, value) => {
    const updated = { ...openTill, [field]: parseFloat(value) || 0 };
    setOpenTill(updated);
    await saveFinancialData('openTill', updated);
  };

  const updateTodayBank = async (value) => {
    const updated = { beforeBankRTCash: parseFloat(value) || 0 };
    setTodayBank(updated);
    await saveFinancialData('todayBank', updated);
  };

  // ── Add new row functions ──────────────────────────────────
  const addAccessRow = async () => {
    const updated = [...accessData, { description: 'New Entry', amount: 0 }];
    setAccessData(updated);
    await saveFinancialData('accessData', updated);
  };

  const addCashRow = async () => {
    const updated = [...cashData, { description: 'New Entry', amount: 0 }];
    setCashData(updated);
    await saveFinancialData('cashData', updated);
  };

  const deleteAccessRow = async (index) => {
    if (accessData.length <= 1) {
      toast('⚠️ Cannot delete the last row');
      return;
    }
    const updated = accessData.filter((_, i) => i !== index);
    setAccessData(updated);
    await saveFinancialData('accessData', updated);
  };

  const deleteCashRow = async (index) => {
    if (cashData.length <= 1) {
      toast('⚠️ Cannot delete the last row');
      return;
    }
    const updated = cashData.filter((_, i) => i !== index);
    setCashData(updated);
    await saveFinancialData('cashData', updated);
  };

  // ── Derived values ──────────────────────────────────────

  const billedArray = Array.isArray(billed) ? billed : [];
  const salesArray = Array.isArray(sales) ? sales : [];
  const expensesArray = Array.isArray(expenses) ? expenses : [];
  const productsArray = Array.isArray(products) ? products : [];
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  const workersArray = Array.isArray(workers) ? workers : [];
  const customersArray = Array.isArray(customers) ? customers : [];
  const returnsArray = Array.isArray(returns) ? returns : [];
  const salesReturnsArray = Array.isArray(salesReturns) ? salesReturns : [];

  // ── Helper functions for export ──────────────────────────
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

  // ── Calculations ──────────────────────────────────────────
  const repairIncome = billedArray.reduce((s, b) => s + (b.netTotal || b.net_total || b.subTotal || b.sub_total || 0), 0);
  const salesIncome = salesArray.reduce((s, x) => s + (x.payable || x.total || 0), 0);
  const totalIncome = repairIncome + salesIncome;
  const totalExp = expensesArray.reduce((s, e) => s + (e.amount || 0), 0);
  const purchaseReturnsTotal = returnsArray.reduce((s, r) => s + (r.netTotal || r.net_total || 0), 0);
  const salesReturnsTotal = salesReturnsArray.reduce((s, r) => s + (r.netRefund || r.net_refund || 0), 0);
  const netProfit = totalIncome - purchaseReturnsTotal - salesReturnsTotal - totalExp;

  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);

  // Today's data
  const todaySales = salesArray.filter(inv => inv.date === today);
  const todayExpenses = expensesArray.filter(exp => exp.date === today);
  const todayRepairs = billedArray.filter(b => b.date === today || b.billedDate === today);
  const todayReturns = returnsArray.filter(r => r.date === today);
  const todaySalesReturns = salesReturnsArray.filter(r => (r.returnDate || r.return_date) === today);

  // Month's data
  const monthSales = salesArray.filter(inv => inv.date?.slice(0, 7) === monthPrefix);
  const monthExpenses = expensesArray.filter(exp => exp.date?.slice(0, 7) === monthPrefix);
  const monthRepairs = billedArray.filter(b => (b.date || b.billedDate)?.slice(0, 7) === monthPrefix);
  const monthReturns = returnsArray.filter(r => r.date?.slice(0, 7) === monthPrefix);
  const monthSalesReturns = salesReturnsArray.filter(r => (r.returnDate || r.return_date)?.slice(0, 7) === monthPrefix);

  const lowStock = productsArray.filter(p => (p.stock || 0) <= (p.reorderLevel || 5));
  const pendingJobs = jobsArray.filter(j => !['completed', 'billed', 'closed'].includes((j.status || '').toLowerCase()));

  // Today's calculations
  const todayIncome = todayRepairs.reduce((s, b) => s + (b.netTotal || b.net_total || b.subTotal || b.sub_total || 0), 0) + 
                       todaySales.reduce((s, i) => s + (i.payable || i.total || 0), 0);
  const todayExpenseTotal = todayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const todayReturnsTotal = todayReturns.reduce((s, r) => s + (r.netTotal || r.net_total || 0), 0);
  const todaySalesReturnsTotal = todaySalesReturns.reduce((s, r) => s + (r.netRefund || r.net_refund || 0), 0);
  const todayNetProfit = todayIncome - todayReturnsTotal - todaySalesReturnsTotal - todayExpenseTotal;

  // ── Balance functions ──────────────────────────────────────
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

  const saveDailyBalance = async (date, openingBal, closingBal, income, expTotal, netProfit) => {
    try {
      const updated = {
        ...dailyBalances,
        [date]: {
          openingBalance: openingBal,
          closingBalance: closingBal,
          totalIncome: income,
          totalExpenses: expTotal,
          netProfit: netProfit,
          date: date,
          lastUpdated: new Date().toISOString()
        }
      };
      setDailyBalances(updated);
      await save(SK.DAILY_BALANCES, updated);
      toast(`✅ Balance for ${date} saved! Closing: LKR ${closingBal.toFixed(2)}`);
    } catch (error) {
      console.error('Error saving daily balance:', error);
      toast('Error saving daily balance');
    }
  };

  const editOpeningBalance = async (date, newOpeningBalance) => {
    try {
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
      await save(SK.DAILY_BALANCES, updated);
      toast(`✅ Opening balance for ${date} updated to LKR ${newOpeningBalance.toFixed(2)}`);
      setEditingBalanceDate(null);
      setEditBalanceValue('');
    } catch (error) {
      console.error('Error editing opening balance:', error);
      toast('Error editing opening balance');
    }
  };

  const setBBF = async () => {
    const amount = parseFloat(bbfAmount);
    if (isNaN(amount) || amount < 0) {
      toast('⚠️ Please enter a valid amount');
      return;
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    
    try {
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
      await save(SK.DAILY_BALANCES, updated);
      toast(`✅ Balance Brought Forward set for ${tomorrowStr}: LKR ${amount.toFixed(2)}`);
      setShowBBFModal(false);
      setBbfAmount('');
    } catch (error) {
      console.error('Error setting BBF:', error);
      toast('Error setting BBF');
    }
  };

  // ── Stats ──────────────────────────────────────────────────
  const totalCashPaid = cashPaid.total || cashPaid.posSystem + cashPaid.onlineTill + cashPaid.metroTill;
  const totalAccess = accessData.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCash = cashData.reduce((sum, item) => sum + (item.amount || 0), 0);

  const stats = [
    { icon: '🔧', label: 'Repair Income', val: `LKR ${repairIncome.toLocaleString()}`, bg: '#dbeafe', color: '#1d4ed8' },
    { icon: '🛍️', label: 'Sales Income', val: `LKR ${salesIncome.toLocaleString()}`, bg: '#ffedd5', color: '#c2410c' },
    { icon: '📉', label: 'Expenses', val: `LKR ${totalExp.toLocaleString()}`, bg: '#fee2e2', color: '#b91c1c' },
    { icon: '↩️', label: 'Returns', val: `LKR ${(purchaseReturnsTotal + salesReturnsTotal).toLocaleString()}`, bg: '#fce7f3', color: '#be185d' },
    { icon: '📈', label: 'Net Profit', val: `LKR ${netProfit.toLocaleString()}`, bg: '#dcfce7', color: '#15803d' },
  ];

  const reportCards = [
    { id: 'full', icon: '📋', title: 'Full Report', subtitle: 'Complete overview with all business details' },
    { id: 'today', icon: '📄', title: "Today's Report", subtitle: 'Sales, billing & expenses with balance sheet' },
    { id: 'monthly', icon: '📆', title: 'Monthly Report', subtitle: 'This month\'s revenue and costs' },
    { id: 'stock', icon: '📦', title: 'Stock Report', subtitle: 'Inventory levels and low-stock alerts' },
  ];

  // ── Format number helper ──────────────────────────────────
  const formatAmount = (value) => {
    if (value === 0 || value === null || value === undefined || value === '') {
      return '';
    }
    return value.toLocaleString();
  };

  const parseAmount = (value) => {
    if (value === '' || value === null || value === undefined) {
      return 0;
    }
    const cleaned = String(value).replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  };

  // ── Render Financial Sections with Edit Capability ──────
  const renderFinancialSections = () => {
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 16,
          marginBottom: 16
        }}>
          {/* Cash Paid */}
          <div style={{ 
            background: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: 12, 
            padding: 16 
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#166534', marginBottom: 10 }}>
              💰 CASH PAID
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 13 }}>
              <span>POS SYSTEM</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: cashPaid.posSystem === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={cashPaid.posSystem === 0 ? '' : cashPaid.posSystem}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateCashPaid('posSystem', 0);
                  } else {
                    updateCashPaid('posSystem', val);
                  }
                }}
                placeholder="0"
              />
              <span>Online Till</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: cashPaid.onlineTill === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={cashPaid.onlineTill === 0 ? '' : cashPaid.onlineTill}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateCashPaid('onlineTill', 0);
                  } else {
                    updateCashPaid('onlineTill', val);
                  }
                }}
                placeholder="0"
              />
              <span>Metro Till</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: cashPaid.metroTill === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={cashPaid.metroTill === 0 ? '' : cashPaid.metroTill}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateCashPaid('metroTill', 0);
                  } else {
                    updateCashPaid('metroTill', val);
                  }
                }}
                placeholder="0"
              />
              <span style={{ fontWeight: 700, borderTop: '1px solid #86efac', paddingTop: 4 }}>
                Total
              </span>
              <span style={{ fontWeight: 700, borderTop: '1px solid #86efac', paddingTop: 4, textAlign: 'right' }}>
                LKR {totalCashPaid.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Access - Editable */}
          <div style={{ 
            background: '#eff6ff', 
            border: '1px solid #bfdbfe', 
            borderRadius: 12, 
            padding: 16 
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e40af', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔑 ACCESS</span>
              <button 
                style={{ 
                  background: '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4, 
                  padding: '2px 8px', 
                  cursor: 'pointer',
                  fontSize: 11
                }}
                onClick={addAccessRow}
              >
                + Add
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 30px', gap: '4px 8px', fontSize: 13 }}>
              {accessData.map((item, idx) => (
                <React.Fragment key={idx}>
                  <input 
                    type="text" 
                    style={{ 
                      ...styles.input, 
                      padding: '2px 6px', 
                      fontSize: 12,
                      width: '100%',
                      border: '1px solid #bfdbfe',
                      background: '#f8fafc'
                    }}
                    value={item.description}
                    onChange={e => updateAccessDescription(idx, e.target.value)}
                  />
                  <input 
                    type="text" 
                    style={{ 
                      ...styles.input, 
                      padding: '2px 6px', 
                      fontSize: 12,
                      width: '100%',
                      color: item.amount === 0 ? '#94a3b8' : '#1f2937',
                      border: '1px solid #bfdbfe',
                      background: '#f8fafc'
                    }}
                    value={item.amount === 0 ? '' : item.amount}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        updateAccessAmount(idx, 0);
                      } else {
                        updateAccessAmount(idx, val);
                      }
                    }}
                    placeholder="0"
                  />
                  <button 
                    style={{ 
                      background: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 4, 
                      cursor: 'pointer',
                      fontSize: 11,
                      padding: '2px 4px',
                      opacity: accessData.length <= 1 ? 0.5 : 1
                    }}
                    onClick={() => deleteAccessRow(idx)}
                    disabled={accessData.length <= 1}
                  >
                    ✕
                  </button>
                </React.Fragment>
              ))}
              <span style={{ fontWeight: 700, borderTop: '1px solid #bfdbfe', paddingTop: 4, gridColumn: '1/2' }}>
                Total
              </span>
              <span style={{ fontWeight: 700, borderTop: '1px solid #bfdbfe', paddingTop: 4, textAlign: 'right', gridColumn: '2/3' }}>
                LKR {totalAccess.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cash - Editable */}
          <div style={{ 
            background: '#fefce8', 
            border: '1px solid #fde68a', 
            borderRadius: 12, 
            padding: 16 
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💵 CASH</span>
              <button 
                style={{ 
                  background: '#f59e0b', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4, 
                  padding: '2px 8px', 
                  cursor: 'pointer',
                  fontSize: 11
                }}
                onClick={addCashRow}
              >
                + Add
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 30px', gap: '4px 8px', fontSize: 13 }}>
              {cashData.map((item, idx) => (
                <React.Fragment key={idx}>
                  <input 
                    type="text" 
                    style={{ 
                      ...styles.input, 
                      padding: '2px 6px', 
                      fontSize: 12,
                      width: '100%',
                      border: '1px solid #fde68a',
                      background: '#f8fafc'
                    }}
                    value={item.description}
                    onChange={e => updateCashDescription(idx, e.target.value)}
                  />
                  <input 
                    type="text" 
                    style={{ 
                      ...styles.input, 
                      padding: '2px 6px', 
                      fontSize: 12,
                      width: '100%',
                      color: item.amount === 0 ? '#94a3b8' : '#1f2937',
                      border: '1px solid #fde68a',
                      background: '#f8fafc'
                    }}
                    value={item.amount === 0 ? '' : item.amount}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        updateCashAmount(idx, 0);
                      } else {
                        updateCashAmount(idx, val);
                      }
                    }}
                    placeholder="0"
                  />
                  <button 
                    style={{ 
                      background: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 4, 
                      cursor: 'pointer',
                      fontSize: 11,
                      padding: '2px 4px',
                      opacity: cashData.length <= 1 ? 0.5 : 1
                    }}
                    onClick={() => deleteCashRow(idx)}
                    disabled={cashData.length <= 1}
                  >
                    ✕
                  </button>
                </React.Fragment>
              ))}
              <span style={{ fontWeight: 700, borderTop: '1px solid #fde68a', paddingTop: 4, gridColumn: '1/2' }}>
                Total
              </span>
              <span style={{ fontWeight: 700, borderTop: '1px solid #fde68a', paddingTop: 4, textAlign: 'right', gridColumn: '2/3' }}>
                LKR {totalCash.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 16
        }}>
          {/* Boss Early Get Money */}
          <div style={{ 
            background: '#faf5ff', 
            border: '1px solid #d8b4fe', 
            borderRadius: 12, 
            padding: 16 
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#6b21a8', marginBottom: 10 }}>
              👔 BOSS EARLY GET MONEY
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 13 }}>
              <span>Banking Money</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: bossEarlyMoney.bankingMoney === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={bossEarlyMoney.bankingMoney === 0 ? '' : bossEarlyMoney.bankingMoney}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateBossEarly('bankingMoney', 0);
                  } else {
                    updateBossEarly('bankingMoney', val);
                  }
                }}
                placeholder="0"
              />
              <span>Online Transfer</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: bossEarlyMoney.onlineTransfer === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={bossEarlyMoney.onlineTransfer === 0 ? '' : bossEarlyMoney.onlineTransfer}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateBossEarly('onlineTransfer', 0);
                  } else {
                    updateBossEarly('onlineTransfer', val);
                  }
                }}
                placeholder="0"
              />
              <span>METRO SHOP SALE</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: bossEarlyMoney.metroShopSale === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={bossEarlyMoney.metroShopSale === 0 ? '' : bossEarlyMoney.metroShopSale}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateBossEarly('metroShopSale', 0);
                  } else {
                    updateBossEarly('metroShopSale', val);
                  }
                }}
                placeholder="0"
              />
              <span>Metro Money</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: bossEarlyMoney.metroMoney === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={bossEarlyMoney.metroMoney === 0 ? '' : bossEarlyMoney.metroMoney}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateBossEarly('metroMoney', 0);
                  } else {
                    updateBossEarly('metroMoney', val);
                  }
                }}
                placeholder="0"
              />
              <span style={{ fontWeight: 700, borderTop: '1px solid #d8b4fe', paddingTop: 4 }}>
                Total Get Money
              </span>
              <span style={{ fontWeight: 700, borderTop: '1px solid #d8b4fe', paddingTop: 4, textAlign: 'right' }}>
                LKR {bossEarlyMoney.totalGetMoney?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          {/* Open Till */}
          <div style={{ 
            background: '#ecfdf5', 
            border: '1px solid #a7f3d0', 
            borderRadius: 12, 
            padding: 16 
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#065f46', marginBottom: 10 }}>
              🏪 OPEN TILL
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 13 }}>
              <span>TOMORROW</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: openTill.tomorrow === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={openTill.tomorrow === 0 ? '' : openTill.tomorrow}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateOpenTill('tomorrow', 0);
                  } else {
                    updateOpenTill('tomorrow', val);
                  }
                }}
                placeholder="0"
              />
              <span>CASH</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: openTill.cash === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={openTill.cash === 0 ? '' : openTill.cash}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateOpenTill('cash', 0);
                  } else {
                    updateOpenTill('cash', val);
                  }
                }}
                placeholder="0"
              />
              <span>SALE</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: openTill.sale === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={openTill.sale === 0 ? '' : openTill.sale}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateOpenTill('sale', 0);
                  } else {
                    updateOpenTill('sale', val);
                  }
                }}
                placeholder="0"
              />
            </div>
          </div>

          {/* Today Bank */}
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fca5a5', 
            borderRadius: 12, 
            padding: 16 
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#991b1b', marginBottom: 10 }}>
              🏦 TODAY BANK
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 13 }}>
              <span>BEFORE BANK RT CASH</span>
              <input 
                type="text" 
                style={{ 
                  ...styles.input, 
                  width: '100%', 
                  padding: '4px 8px', 
                  fontSize: 13,
                  color: todayBank.beforeBankRTCash === 0 ? '#94a3b8' : '#1f2937'
                }}
                value={todayBank.beforeBankRTCash === 0 ? '' : todayBank.beforeBankRTCash}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    updateTodayBank(0);
                  } else {
                    updateTodayBank(val);
                  }
                }}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Grand Total Calculation */}
        <div style={{ 
          marginTop: 20, 
          background: '#1e293b', 
          color: 'white',
          padding: 20, 
          borderRadius: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Total Cash Paid</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>LKR {totalCashPaid.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Total Access</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>LKR {totalAccess.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Total Cash</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>LKR {totalCash.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Boss Total Get Money</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>LKR {bossEarlyMoney.totalGetMoney?.toLocaleString() || 0}</div>
          </div>
        </div>
      </div>
    );
  };

  // ── Export Full Report ──────────────────────────────────
  const exportFullReport = () => {
    const totalRepairIncome = billedArray.reduce((s, b) => s + (b.netTotal || b.net_total || b.subTotal || b.sub_total || 0), 0);
    const totalSalesIncome = salesArray.reduce((s, x) => s + (x.payable || x.total || 0), 0);
    const totalExpenses = expensesArray.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPurchaseReturns = returnsArray.reduce((s, r) => s + (r.netTotal || r.net_total || 0), 0);
    const totalSalesReturns = salesReturnsArray.reduce((s, r) => s + (r.netRefund || r.net_refund || 0), 0);
    const netProfit = totalRepairIncome + totalSalesIncome - totalPurchaseReturns - totalSalesReturns - totalExpenses;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Full Business Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1f2937; background: #f8fafc; }
          .report-container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #0f172a, #1e3a8a); color: #fff; padding: 25px 30px; border-radius: 10px; margin-bottom: 25px; }
          .header h1 { margin: 0; font-size: 26px; letter-spacing: 1px; }
          .header p { margin: 5px 0 0; opacity: 0.8; font-size: 13px; }
          .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 25px; }
          .summary-card { background: #f8fafc; padding: 18px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0; }
          .summary-card .icon { font-size: 28px; }
          .summary-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 5px; font-weight: 600; letter-spacing: 0.5px; }
          .summary-card .value { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px; }
          .section-title { background: #dbeafe; padding: 10px 15px; font-weight: 700; font-size: 14px; margin: 20px 0 10px; border-radius: 6px; color: #1e3a8a; }
          .finance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .finance-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
          .finance-card h3 { font-size: 14px; margin-bottom: 12px; color: #1e293b; }
          .finance-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px; }
          .finance-row.total { font-weight: 700; border-bottom: 2px solid #1e293b; padding-top: 8px; margin-top: 4px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 15px; font-size: 12px; }
          th { background: #1e3a8a; color: white; padding: 10px 12px; text-align: left; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          tr:hover { background: #f1f5f9; }
          .total-row { background: #fef3c7; font-weight: 700; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
          .profit-positive { color: #15803d; font-weight: 700; }
          .profit-negative { color: #dc2626; font-weight: 700; }
          .status-low { color: #dc2626; font-weight: 700; }
          .status-ok { color: #16a34a; font-weight: 700; }
          @media print { body { background: white; } .report-container { box-shadow: none; padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1>📊 Metro Phone Shop - Full Business Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()} | <strong>Report Period:</strong> All Time</p>
          </div>
          
          <div class="summary-grid">
            <div class="summary-card"><div class="icon">🔧</div><div class="label">Repair Income</div><div class="value">LKR ${totalRepairIncome.toLocaleString()}</div></div>
            <div class="summary-card"><div class="icon">🛍️</div><div class="label">Sales Income</div><div class="value">LKR ${totalSalesIncome.toLocaleString()}</div></div>
            <div class="summary-card"><div class="icon">↩️</div><div class="label">Total Returns</div><div class="value" style="color:#be185d;">LKR ${(totalPurchaseReturns + totalSalesReturns).toLocaleString()}</div></div>
            <div class="summary-card"><div class="icon">📉</div><div class="label">Expenses</div><div class="value">LKR ${totalExpenses.toLocaleString()}</div></div>
            <div class="summary-card"><div class="icon">📈</div><div class="label">Net Profit</div><div class="value" style="color:${netProfit >= 0 ? '#15803d' : '#dc2626'}">LKR ${netProfit.toLocaleString()}</div></div>
          </div>

          <!-- FINANCIAL SECTIONS FROM IMAGE -->
          <div class="finance-grid">
            <div class="finance-card">
              <h3>💰 CASH PAID</h3>
              <div class="finance-row"><span>POS SYSTEM</span><span>LKR ${cashPaid.posSystem?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>Online Till</span><span>LKR ${cashPaid.onlineTill?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>Metro Till</span><span>LKR ${cashPaid.metroTill?.toLocaleString() || 0}</span></div>
              <div class="finance-row total"><span><strong>Total Cash Paid</strong></span><span><strong>LKR ${totalCashPaid.toLocaleString()}</strong></span></div>
            </div>

            <div class="finance-card">
              <h3>🔑 ACCESS</h3>
              ${accessData.map(item => `
                <div class="finance-row"><span>${item.description}</span><span>LKR ${(item.amount || 0).toLocaleString()}</span></div>
              `).join('')}
              <div class="finance-row total"><span><strong>Total Access</strong></span><span><strong>LKR ${totalAccess.toLocaleString()}</strong></span></div>
            </div>

            <div class="finance-card">
              <h3>💵 CASH</h3>
              ${cashData.map(item => `
                <div class="finance-row"><span>${item.description}</span><span>LKR ${(item.amount || 0).toLocaleString()}</span></div>
              `).join('')}
              <div class="finance-row total"><span><strong>Total Cash</strong></span><span><strong>LKR ${totalCash.toLocaleString()}</strong></span></div>
            </div>

            <div class="finance-card">
              <h3>👔 BOSS EARLY GET MONEY</h3>
              <div class="finance-row"><span>Banking Money</span><span>LKR ${bossEarlyMoney.bankingMoney?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>Online Transfer</span><span>LKR ${bossEarlyMoney.onlineTransfer?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>METRO SHOP SALE</span><span>LKR ${bossEarlyMoney.metroShopSale?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>Metro Money</span><span>LKR ${bossEarlyMoney.metroMoney?.toLocaleString() || 0}</span></div>
              <div class="finance-row total"><span><strong>Total Get Money</strong></span><span><strong>LKR ${bossEarlyMoney.totalGetMoney?.toLocaleString() || 0}</strong></span></div>
            </div>

            <div class="finance-card">
              <h3>🏪 OPEN TILL</h3>
              <div class="finance-row"><span>TOMORROW</span><span>LKR ${openTill.tomorrow?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>CASH</span><span>LKR ${openTill.cash?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>SALE</span><span>LKR ${openTill.sale?.toLocaleString() || 0}</span></div>
            </div>

            <div class="finance-card">
              <h3>🏦 TODAY BANK</h3>
              <div class="finance-row"><span>BEFORE BANK RT CASH</span><span>LKR ${todayBank.beforeBankRTCash?.toLocaleString() || 0}</span></div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(4,1fr); gap:15px; margin-bottom:25px;">
            <div class="summary-card"><div class="label">Products</div><div class="value">${productsArray.length}</div></div>
            <div class="summary-card"><div class="label">Customers</div><div class="value">${customersArray.length}</div></div>
            <div class="summary-card"><div class="label">Workers</div><div class="value">${workersArray.filter(w => w.active !== false).length}</div></div>
            <div class="summary-card"><div class="label">Low Stock Items</div><div class="value" style="color:#dc2626;">${lowStock.length}</div></div>
          </div>

          <div class="section-title">📈 PROFIT & LOSS STATEMENT</div>
          <table>
            <thead><tr><th>Description</th><th style="text-align:right;">Amount (LKR)</th></tr></thead>
            <tbody>
              <tr><td><strong>INCOME</strong></td><td style="text-align:right;"></td></tr>
              <tr><td style="padding-left:20px;">Repair Services Income</td><td style="text-align:right;">${totalRepairIncome.toFixed(2)}</td></tr>
              <tr><td style="padding-left:20px;">Product Sales Income</td><td style="text-align:right;">${totalSalesIncome.toFixed(2)}</td></tr>
              <tr class="total-row"><td><strong>Total Income</strong></td><td style="text-align:right;"><strong>${(totalRepairIncome + totalSalesIncome).toFixed(2)}</strong></td></tr>
              <tr><td></td><td style="text-align:right;"></td></tr>
              <tr><td><strong>RETURNS</strong></td><td style="text-align:right;"></td></tr>
              <tr><td style="padding-left:20px; color:#dc2626;">Purchase Returns</td><td style="text-align:right; color:#dc2626;">-${totalPurchaseReturns.toFixed(2)}</td></tr>
              <tr><td style="padding-left:20px; color:#dc2626;">Sales Returns</td><td style="text-align:right; color:#dc2626;">-${totalSalesReturns.toFixed(2)}</td></tr>
              <tr class="total-row"><td><strong>Total Returns</strong></td><td style="text-align:right; color:#dc2626;"><strong>-${(totalPurchaseReturns + totalSalesReturns).toFixed(2)}</strong></td></tr>
              <tr><td></td><td style="text-align:right;"></td></tr>
              <tr><td><strong>EXPENSES</strong></td><td style="text-align:right;"></td></tr>
              <tr><td style="padding-left:20px; color:#dc2626;">Operating Expenses</td><td style="text-align:right; color:#dc2626;">-${totalExpenses.toFixed(2)}</td></tr>
              <tr class="total-row"><td><strong>Total Expenses</strong></td><td style="text-align:right; color:#dc2626;"><strong>-${totalExpenses.toFixed(2)}</strong></td></tr>
              <tr><td></td><td style="text-align:right;"></td></tr>
              <tr style="background: ${netProfit >= 0 ? '#dcfce7' : '#fee2e2'}; font-size:16px; font-weight:700;">
                <td><strong>NET PROFIT / LOSS</strong></td>
                <td style="text-align:right; color:${netProfit >= 0 ? '#15803d' : '#dc2626'};">
                  <strong>LKR ${netProfit.toFixed(2)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">🔧 REPAIR BILLINGS (GRNs)</div>
          <table>
            <thead><tr><th>GRN ID</th><th>Supplier</th><th>Bill No</th><th>Amount (LKR)</th><th>Date</th></tr></thead>
            <tbody>
              ${billedArray.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No repair billings</td></tr>' : 
                billedArray.map(b => `<tr><td>${b.id}</td><td>${b.supplierName || b.supplier_name}</td><td>${b.billNo || b.bill_no || 'N/A'}</td><td style="text-align:right;">${(b.netTotal || b.net_total || b.subTotal || b.sub_total || 0).toFixed(2)}</td><td>${b.date || b.billedDate}</td></tr>`).join('')}
              <tr class="total-row"><td colspan="3" style="text-align:right;"><strong>Total</strong></td><td style="text-align:right;"><strong>${totalRepairIncome.toFixed(2)}</strong></td><td></td></tr>
            </tbody>
          </table>

          <div class="section-title">🛍️ SALES INVOICES</div>
          <table>
            <thead><tr><th>Invoice ID</th><th>Customer</th><th>Total (LKR)</th><th>Paid (LKR)</th><th>Due (LKR)</th><th>Date</th></tr></thead>
            <tbody>
              ${salesArray.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No sales</td></tr>' :
                salesArray.map(inv => `<tr><td>${inv.id}</td><td>${inv.customer}</td><td style="text-align:right;">${(inv.payable || inv.total || 0).toFixed(2)}</td><td style="text-align:right;">${(inv.paid || 0).toFixed(2)}</td><td style="text-align:right;">${(inv.due || 0).toFixed(2)}</td><td>${inv.date}</td></tr>`).join('')}
              <tr class="total-row"><td colspan="2" style="text-align:right;"><strong>Total</strong></td><td style="text-align:right;"><strong>${totalSalesIncome.toFixed(2)}</strong></td><td colspan="3"></td></tr>
            </tbody>
          </table>

          <div class="section-title">↩️ PURCHASE RETURNS</div>
          <table>
            <thead><tr><th>Return ID</th><th>GRN ID</th><th>Supplier</th><th>Amount (LKR)</th><th>Date</th></tr></thead>
            <tbody>
              ${returnsArray.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No purchase returns</td></tr>' :
                returnsArray.map(r => `<tr><td>${r.id}</td><td>${r.grnId || r.grn_id}</td><td>${r.supplierName || r.supplier_name}</td><td style="text-align:right; color:#dc2626;">${(r.netTotal || r.net_total || 0).toFixed(2)}</td><td>${r.date}</td></tr>`).join('')}
              <tr class="total-row"><td colspan="3" style="text-align:right;"><strong>Total Returns</strong></td><td style="text-align:right; color:#dc2626;"><strong>${totalPurchaseReturns.toFixed(2)}</strong></td><td></td></tr>
            </tbody>
          </table>

          <div class="section-title">🔄 SALES RETURNS</div>
          <table>
            <thead><tr><th>Return ID</th><th>Invoice ID</th><th>Customer</th><th>Refund (LKR)</th><th>Date</th></tr></thead>
            <tbody>
              ${salesReturnsArray.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No sales returns</td></tr>' :
                salesReturnsArray.map(r => `<tr><td>${r.id}</td><td>${r.invoiceId || r.invoice_id}</td><td>${r.customer}</td><td style="text-align:right; color:#dc2626;">${(r.netRefund || r.net_refund || 0).toFixed(2)}</td><td>${r.returnDate || r.return_date}</td></tr>`).join('')}
              <tr class="total-row"><td colspan="3" style="text-align:right;"><strong>Total Returns</strong></td><td style="text-align:right; color:#dc2626;"><strong>${totalSalesReturns.toFixed(2)}</strong></td><td></td></tr>
            </tbody>
          </table>

          <div class="section-title">💰 EXPENSES</div>
          <table>
            <thead><tr><th>Date</th><th>Title</th><th>Amount (LKR)</th></tr></thead>
            <tbody>
              ${expensesArray.length === 0 ? '<tr><td colspan="3" style="text-align:center;">No expenses</td></tr>' :
                expensesArray.map(exp => `<tr><td>${exp.date}</td><td>${exp.title}</td><td style="text-align:right; color:#dc2626;">${(exp.amount || 0).toFixed(2)}</td></tr>`).join('')}
              <tr class="total-row"><td colspan="2" style="text-align:right;"><strong>Total</strong></td><td style="text-align:right; color:#dc2626;"><strong>${totalExpenses.toFixed(2)}</strong></td></tr>
            </tbody>
          </table>

          <div class="section-title">📦 INVENTORY SUMMARY</div>
          <table>
            <thead><tr><th>Product</th><th>Stock</th><th>Price (LKR)</th><th>Status</th></tr></thead>
            <tbody>
              ${productsArray.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No products</td></tr>' :
                productsArray.map(p => `<tr><td>${p.name}</td><td>${p.stock}</td><td style="text-align:right;">${(p.sell || 0).toFixed(2)}</td><td class="${(p.stock || 0) <= (p.reorderLevel || 5) ? 'status-low' : 'status-ok'}">${(p.stock || 0) <= (p.reorderLevel || 5) ? '⚠️ LOW' : '✅ OK'}</td></tr>`).join('')}
            </tbody>
          </table>

          ${lowStock.length > 0 ? `
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca; margin: 15px 0;">
              <div style="font-weight: 700; color: #991b1b; margin-bottom: 8px;">⚠️ Low Stock Alerts</div>
              <ul style="margin: 0 0 0 18px; color: #991b1b; font-size: 13px;">
                ${lowStock.map(item => `<li>${item.name}: only ${item.stock} left</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="section-title">🕒 PENDING REPAIRS</div>
          <table>
            <thead><tr><th>Order ID</th><th>Customer</th><th>Phone</th><th>Worker</th><th>Device</th></tr></thead>
            <tbody>
              ${pendingJobs.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No pending repairs</td></tr>' :
                pendingJobs.map(j => `<tr><td>${j.orderId}</td><td>${j.customerName}</td><td>${j.phone}</td><td>${j.workerName || 'N/A'}</td><td>${j.deviceType || '-'}</td></tr>`).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Generated by Metro Phone Shop POS System | All financial figures are in LKR (Sri Lankan Rupees)</p>
            <p style="margin-top:5px; font-size:11px; color:#94a3b8;">System By: Inshaf | 0725335460</p>
          </div>
        </div>
      </body>
      </html>
    `;
    downloadExcel(html, `Full_Report_${today}.xls`);
  };

  // ── Export Today's Report ─────────────────────────────────
  const exportTodayReportExcel = () => {
    const currentBalance = dailyBalances[today] || { openingBalance: openingBalance, closingBalance: closingBalance, totalIncome: todayIncome, totalExpenses: todayExpenseTotal, netProfit: todayNetProfit };
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Daily Business Report - ${today}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1f2937; background: #f8fafc; }
        .report-container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .report-header { background: linear-gradient(135deg, #0f172a, #1e3a8a); color: #fff; padding: 25px; border-radius: 10px; margin-bottom: 25px; }
        .report-header h1 { margin: 0; font-size: 24px; }
        .report-header p { margin: 5px 0 0; opacity: 0.8; }
        .summary-box { display: grid; grid-template-columns: repeat(4,1fr); gap: 15px; margin-bottom: 20px; }
        .summary-item { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
        .summary-item .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .summary-item .value { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px; }
        .finance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .finance-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
        .finance-card h4 { font-size: 12px; margin-bottom: 8px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
        .finance-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed #e2e8f0; font-size: 11px; }
        .finance-row.total { font-weight: 700; border-bottom: 2px solid #1e293b; padding-top: 6px; margin-top: 3px; }
        .balance-sheet { background: #f0fdf4; border: 2px solid #15803d; border-radius: 10px; padding: 20px; margin-bottom: 25px; }
        .balance-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bbf7d0; }
        .balance-total { font-weight: 700; font-size: 18px; color: #15803d; margin-top: 10px; padding-top: 10px; border-top: 2px solid #15803d; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 15px; font-size: 12px; }
        th { background: #1e3a8a; color: white; padding: 10px 12px; text-align: left; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
        .section-title { background: #dbeafe; padding: 10px 15px; font-weight: 700; font-size: 14px; margin: 20px 0 10px; border-radius: 6px; color: #1e3a8a; }
        .total-row { background: #fef3c7; font-weight: 700; }
        .profit { color: #15803d; font-weight: 700; }
        .loss { color: #dc2626; font-weight: 700; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
        @media print { body { background: white; } .report-container { box-shadow: none; padding: 10px; } }
      </style>
      </head>
      <body>
        <div class="report-container">
          <div class="report-header">
            <h1>📊 Metro Phone Shop - Daily Business Report</h1>
            <p><strong>Date:</strong> ${today} | <strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary-box">
            <div class="summary-item"><div class="label">Repair Income</div><div class="value">LKR ${todayRepairs.reduce((s, b) => s + (b.netTotal || b.net_total || b.subTotal || b.sub_total || 0), 0).toLocaleString()}</div></div>
            <div class="summary-item"><div class="label">Sales Income</div><div class="value">LKR ${todaySales.reduce((s, i) => s + (i.payable || i.total || 0), 0).toLocaleString()}</div></div>
            <div class="summary-item"><div class="label">Expenses</div><div class="value">LKR ${todayExpenseTotal.toLocaleString()}</div></div>
            <div class="summary-item"><div class="label">Net Profit</div><div class="value" style="color:${todayNetProfit >= 0 ? '#15803d' : '#dc2626'}">LKR ${todayNetProfit.toLocaleString()}</div></div>
          </div>

          <!-- Finance Summary -->
          <div class="finance-grid">
            <div class="finance-card">
              <h4>💰 Cash Paid</h4>
              <div class="finance-row"><span>POS SYSTEM</span><span>LKR ${cashPaid.posSystem?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>Online Till</span><span>LKR ${cashPaid.onlineTill?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>Metro Till</span><span>LKR ${cashPaid.metroTill?.toLocaleString() || 0}</span></div>
              <div class="finance-row total"><span>Total</span><span>LKR ${totalCashPaid.toLocaleString()}</span></div>
            </div>
            <div class="finance-card">
              <h4>🔑 Access</h4>
              ${accessData.map(item => `
                <div class="finance-row"><span>${item.description}</span><span>LKR ${(item.amount || 0).toLocaleString()}</span></div>
              `).join('')}
              <div class="finance-row total"><span>Total</span><span>LKR ${totalAccess.toLocaleString()}</span></div>
            </div>
            <div class="finance-card">
              <h4>💵 Cash</h4>
              ${cashData.map(item => `
                <div class="finance-row"><span>${item.description}</span><span>LKR ${(item.amount || 0).toLocaleString()}</span></div>
              `).join('')}
              <div class="finance-row total"><span>Total</span><span>LKR ${totalCash.toLocaleString()}</span></div>
            </div>
            <div class="finance-card">
              <h4>👔 Boss Early Get Money</h4>
              <div class="finance-row"><span>Banking Money</span><span>LKR ${bossEarlyMoney.bankingMoney?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>Online Transfer</span><span>LKR ${bossEarlyMoney.onlineTransfer?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>METRO SHOP SALE</span><span>LKR ${bossEarlyMoney.metroShopSale?.toLocaleString() || 0}</span></div>
              <div class="finance-row"><span>Metro Money</span><span>LKR ${bossEarlyMoney.metroMoney?.toLocaleString() || 0}</span></div>
              <div class="finance-row total"><span>Total Get Money</span><span>LKR ${bossEarlyMoney.totalGetMoney?.toLocaleString() || 0}</span></div>
            </div>
          </div>

          <div class="balance-sheet">
            <h3 style="margin-top:0; color:#15803d;">💰 BALANCE SHEET</h3>
            <div class="balance-row"><span><strong>Opening Balance (Brought Forward):</strong></span><span>LKR ${(currentBalance.openingBalance || openingBalance).toFixed(2)}</span></div>
            <div class="balance-row"><span><strong>Today's Income:</strong></span><span>LKR ${(currentBalance.totalIncome || todayIncome).toFixed(2)}</span></div>
            <div class="balance-row"><span><strong>Today's Returns:</strong></span><span style="color:#dc2626;">-LKR ${(todayReturnsTotal + todaySalesReturnsTotal).toFixed(2)}</span></div>
            <div class="balance-row"><span><strong>Today's Expenses:</strong></span><span style="color:#dc2626;">-LKR ${(currentBalance.totalExpenses || todayExpenseTotal).toFixed(2)}</span></div>
            <div class="balance-row"><span><strong>Today's Net Profit/Loss:</strong></span><span class="${(currentBalance.netProfit || todayNetProfit) >= 0 ? 'profit' : 'loss'}">LKR ${(currentBalance.netProfit || todayNetProfit).toFixed(2)}</span></div>
            <div class="balance-total"><span><strong>Closing Balance (Carried Forward):</strong></span><span>LKR ${(currentBalance.closingBalance || closingBalance).toFixed(2)}</span></div>
          </div>

          <div class="section-title">📈 INCOME BREAKDOWN</div>
          <table>
            <thead><tr><th>Category</th><th style="text-align:right;">Amount (LKR)</th><th>Count</th></tr></thead>
            <tbody>
              <tr><td>Repair Services Income</td><td style="text-align:right;">${todayRepairs.reduce((s, b) => s + (b.netTotal || b.net_total || b.subTotal || b.sub_total || 0), 0).toFixed(2)}</td><td>${todayRepairs.length} invoices</td></tr>
              <tr><td>Product Sales Income</td><td style="text-align:right;">${todaySales.reduce((s, i) => s + (i.payable || i.total || 0), 0).toFixed(2)}</td><td>${todaySales.length} invoices</td></tr>
              <tr class="total-row"><td><strong>Total Income</strong></td><td style="text-align:right;"><strong>${todayIncome.toFixed(2)}</strong></td><td></td></tr>
            </tbody>
          </table>

          <div class="section-title">↩️ RETURNS</div>
          <table>
            <thead><tr><th>Type</th><th>ID</th><th>Customer/Supplier</th><th style="text-align:right;">Amount (LKR)</th></tr></thead>
            <tbody>
              ${todayReturns.map(r => `<tr><td>Purchase Return</td><td>${r.id}</td><td>${r.supplierName || r.supplier_name}</td><td style="text-align:right; color:#dc2626;">${(r.netTotal || r.net_total || 0).toFixed(2)}</td></tr>`).join('')}
              ${todaySalesReturns.map(r => `<tr><td>Sales Return</td><td>${r.id}</td><td>${r.customer}</td><td style="text-align:right; color:#dc2626;">${(r.netRefund || r.net_refund || 0).toFixed(2)}</td></tr>`).join('')}
              ${todayReturns.length === 0 && todaySalesReturns.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No returns today</td></tr>' : ''}
              <tr class="total-row"><td colspan="3" style="text-align:right;"><strong>Total Returns</strong></td><td style="text-align:right; color:#dc2626;"><strong>${(todayReturnsTotal + todaySalesReturnsTotal).toFixed(2)}</strong></td></tr>
            </tbody>
          </table>

          <div class="section-title">📉 EXPENSE BREAKDOWN</div>
          <table>
            <thead><tr><th>Expense Title</th><th style="text-align:right;">Amount (LKR)</th><th>Date</th></tr></thead>
            <tbody>
              ${todayExpenses.map(exp => `<tr><td>${exp.title}</td><td style="text-align:right; color:#dc2626;">${(exp.amount || 0).toFixed(2)}</td><td>${exp.date}</td></tr>`).join('')}
              ${todayExpenses.length === 0 ? '<tr><td colspan="3" style="text-align:center;">No expenses recorded today</td></tr>' : ''}
              <tr class="total-row"><td><strong>Total Expenses</strong></td><td style="text-align:right; color:#dc2626;"><strong>${todayExpenseTotal.toFixed(2)}</strong></td><td></td></tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Generated by Metro Phone Shop POS System | Closing balance will be brought forward to next business day</p>
            <p style="margin-top:5px; font-size:11px; color:#94a3b8;">System By: Inshaf | 0725335460</p>
          </div>
        </div>
      </body>
      </html>
    `;
    downloadExcel(html, `Daily_Report_${today}.xls`);
  };

  // ── Export Selected Report ─────────────────────────────────
  const exportSelectedReport = () => {
    if (selectedReport === 'today') {
      exportTodayReportExcel();
      return;
    }
    if (selectedReport === 'stock') {
      const rows = productsArray.map(p => [p.name, p.stock, p.reorderLevel || 5, (p.stock || 0) <= (p.reorderLevel || 5) ? 'LOW' : 'OK', p.sell || 0]);
      downloadCSV([['Product', 'Stock', 'Reorder Level', 'Status', 'Price (LKR)'], ...rows], `Stock_Report_${monthPrefix}.csv`);
      return;
    }
    if (selectedReport === 'monthly') {
      const monthIncome = monthSales.reduce((s, i) => s + (i.payable || i.total || 0), 0);
      const monthExpenseTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const monthRepairIncome = monthRepairs.reduce((s, b) => s + (b.netTotal || b.net_total || b.subTotal || b.sub_total || 0), 0);
      const monthReturnsTotal = monthReturns.reduce((s, r) => s + (r.netTotal || r.net_total || 0), 0);
      const monthSalesReturnsTotal = monthSalesReturns.reduce((s, r) => s + (r.netRefund || r.net_refund || 0), 0);
      
      const rows = [
        ['Summary', ''],
        ['Total Repair Income', `LKR ${monthRepairIncome.toFixed(2)}`],
        ['Total Sales Income', `LKR ${monthIncome.toFixed(2)}`],
        ['Total Purchase Returns', `LKR ${monthReturnsTotal.toFixed(2)}`],
        ['Total Sales Returns', `LKR ${monthSalesReturnsTotal.toFixed(2)}`],
        ['Total Expenses', `LKR ${monthExpenseTotal.toFixed(2)}`],
        ['Net Profit', `LKR ${(monthIncome + monthRepairIncome - monthReturnsTotal - monthSalesReturnsTotal - monthExpenseTotal).toFixed(2)}`],
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

  // ── Render functions ───────────────────────────────────────

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
          
          {renderFinancialSections()}

          <div style={{ background: '#f0fdf4', border: '2px solid #15803d', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#15803d' }}>💰 Balance Brought Forward System</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }} onClick={() => saveDailyBalance(today, openingBalance, closingBalance, todayIncome, todayExpenseTotal + todayReturnsTotal + todaySalesReturnsTotal, todayNetProfit)}>Save Today's Balance</button>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                <div><div style={{ fontSize: 11, color: '#166534' }}>Today's Income</div><div style={{ fontWeight: 700 }}>LKR {todayIncome.toFixed(2)}</div></div>
                <div><div style={{ fontSize: 11, color: '#dc2626' }}>Today's Returns</div><div style={{ fontWeight: 700, color: '#dc2626' }}>-LKR {(todayReturnsTotal + todaySalesReturnsTotal).toFixed(2)}</div></div>
                <div><div style={{ fontSize: 11, color: '#166534' }}>Today's Expenses</div><div style={{ fontWeight: 700 }}>LKR {todayExpenseTotal.toFixed(2)}</div></div>
                <div><div style={{ fontSize: 11, color: todayNetProfit >= 0 ? '#15803d' : '#dc2626' }}>Net Profit/Loss</div><div style={{ fontWeight: 700, color: todayNetProfit >= 0 ? '#15803d' : '#dc2626' }}>LKR {todayNetProfit.toFixed(2)}</div></div>
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
            <div style={styles.reportBox}><div style={styles.reportLabel}>Repair Income</div><div style={styles.reportValue}>LKR {todayRepairs.reduce((s, b) => s + (b.netTotal || b.net_total || b.subTotal || b.sub_total || 0), 0).toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Sales Income</div><div style={styles.reportValue}>LKR {todaySales.reduce((s, i) => s + (i.payable || i.total || 0), 0).toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Expenses</div><div style={styles.reportValue}>LKR {todayExpenseTotal.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Net Profit</div><div style={styles.reportValue}>LKR {todayNetProfit.toLocaleString()}</div></div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🔧 GRN Billings</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['GRN ID', 'Supplier', 'Amount', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{todayRepairs.length === 0 && <tr><td colSpan={4} style={styles.emptyTd}>No GRNs today.</td></tr>}
                  {todayRepairs.map(rep => <tr key={rep.id}><td style={styles.td}>{rep.id}</td><td style={styles.td}>{rep.supplierName || rep.supplier_name}</td><td style={styles.td}>LKR {(rep.netTotal || rep.net_total || rep.subTotal || rep.sub_total || 0).toFixed(2)}</td><td style={styles.td}>{rep.date || rep.billedDate || ''}</td></tr>)}</tbody>
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
            <div style={{ fontWeight: 700, marginBottom: 10 }}>↩️ Returns</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Type', 'ID', 'Customer/Supplier', 'Amount', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {todayReturns.map(r => <tr key={r.id}><td style={styles.td}>Purchase Return</td><td style={styles.td}>{r.id}</td><td style={styles.td}>{r.supplierName || r.supplier_name}</td><td style={styles.td}>LKR {(r.netTotal || r.net_total || 0).toFixed(2)}</td><td style={styles.td}>{r.date}</td></tr>)}
                  {todaySalesReturns.map(r => <tr key={r.id}><td style={styles.td}>Sales Return</td><td style={styles.td}>{r.id}</td><td style={styles.td}>{r.customer}</td><td style={styles.td}>LKR {(r.netRefund || r.net_refund || 0).toFixed(2)}</td><td style={styles.td}>{r.returnDate || r.return_date}</td></tr>)}
                  {todayReturns.length === 0 && todaySalesReturns.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No returns today.</td></tr>}
                </tbody>
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
      const monthRepairIncome = monthRepairs.reduce((s, b) => s + (b.netTotal || b.net_total || b.subTotal || b.sub_total || 0), 0);
      const monthReturnsTotal = monthReturns.reduce((s, r) => s + (r.netTotal || r.net_total || 0), 0);
      const monthSalesReturnsTotal = monthSalesReturns.reduce((s, r) => s + (r.netRefund || r.net_refund || 0), 0);
      const monthProfit = monthIncome + monthRepairIncome - monthReturnsTotal - monthSalesReturnsTotal - monthExpenseTotal;
      
      return (
        <div>
          <div style={{ marginBottom: 16, fontWeight: 700 }}>📆 Monthly business report ({monthPrefix})</div>
          
          {renderFinancialSections()}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 18 }}>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Repair Income</div><div style={styles.reportValue}>LKR {monthRepairIncome.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Sales Income</div><div style={styles.reportValue}>LKR {monthIncome.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Returns</div><div style={styles.reportValue}>LKR {(monthReturnsTotal + monthSalesReturnsTotal).toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Expenses</div><div style={styles.reportValue}>LKR {monthExpenseTotal.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Net Profit</div><div style={styles.reportValue}>LKR {monthProfit.toLocaleString()}</div></div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🔧 GRN Billings</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['GRN ID', 'Supplier', 'Amount', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{monthRepairs.length === 0 && <tr><td colSpan={4} style={styles.emptyTd}>No GRNs this month.</td></tr>}
                  {monthRepairs.map(rep => <tr key={rep.id}><td style={styles.td}>{rep.id}</td><td style={styles.td}>{rep.supplierName || rep.supplier_name}</td><td style={styles.td}>LKR {(rep.netTotal || rep.net_total || rep.subTotal || rep.sub_total || 0).toFixed(2)}</td><td style={styles.td}>{rep.date || rep.billedDate || ''}</td></tr>)}</tbody>
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
            <div style={{ fontWeight: 700, marginBottom: 10 }}>↩️ Returns</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Type', 'ID', 'Customer/Supplier', 'Amount', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {monthReturns.map(r => <tr key={r.id}><td style={styles.td}>Purchase Return</td><td style={styles.td}>{r.id}</td><td style={styles.td}>{r.supplierName || r.supplier_name}</td><td style={styles.td}>LKR {(r.netTotal || r.net_total || 0).toFixed(2)}</td><td style={styles.td}>{r.date}</td></tr>)}
                  {monthSalesReturns.map(r => <tr key={r.id}><td style={styles.td}>Sales Return</td><td style={styles.td}>{r.id}</td><td style={styles.td}>{r.customer}</td><td style={styles.td}>LKR {(r.netRefund || r.net_refund || 0).toFixed(2)}</td><td style={styles.td}>{r.returnDate || r.return_date}</td></tr>)}
                  {monthReturns.length === 0 && monthSalesReturns.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No returns this month.</td></tr>}
                </tbody>
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
            <div style={styles.reportBox}><div style={styles.reportLabel}>Total Products</div><div style={styles.reportValue}>{productsArray.length}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Low Stock Items</div><div style={styles.reportValue}>{lowStock.length}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Inventory Value</div><div style={styles.reportValue}>LKR {productsArray.reduce((sum, p) => sum + ((p.stock || 0) * (p.sell || 0)), 0).toLocaleString()}</div></div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>📋 Product Inventory</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Product', 'Stock', 'Price', 'Reorder', 'Status'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{productsArray.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No inventory items available.</td></tr>}
                  {productsArray.map(p => <tr key={p.id}><td style={styles.td}>{p.name}</td><td style={styles.td}>{p.stock}</td><td style={styles.td}>LKR {p.sell || 0}</td><td style={styles.td}>{p.reorderLevel || 5}</td><td style={styles.td}>{(p.stock || 0) <= (p.reorderLevel || 5) ? 'LOW' : 'OK'}</td></tr>)}</tbody>
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
      const totalRepairIncome = billedArray.reduce((s, b) => s + (b.netTotal || b.net_total || b.subTotal || b.sub_total || 0), 0);
      const totalSalesIncome = salesArray.reduce((s, x) => s + (x.payable || x.total || 0), 0);
      const totalExpenses = expensesArray.reduce((s, e) => s + (e.amount || 0), 0);
      const totalPurchaseReturns = returnsArray.reduce((s, r) => s + (r.netTotal || r.net_total || 0), 0);
      const totalSalesReturns = salesReturnsArray.reduce((s, r) => s + (r.netRefund || r.net_refund || 0), 0);
      const netProfit = totalRepairIncome + totalSalesIncome - totalPurchaseReturns - totalSalesReturns - totalExpenses;
      
      return (
        <div>
          <div style={{ marginBottom: 16, fontWeight: 700 }}>📋 Full business report</div>
          
          {renderFinancialSections()}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 18 }}>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Repair Income</div><div style={styles.reportValue}>LKR {totalRepairIncome.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Sales Income</div><div style={styles.reportValue}>LKR {totalSalesIncome.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Purchase Returns</div><div style={styles.reportValue}>LKR {totalPurchaseReturns.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Sales Returns</div><div style={styles.reportValue}>LKR {totalSalesReturns.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Expenses</div><div style={styles.reportValue}>LKR {totalExpenses.toLocaleString()}</div></div>
            <div style={styles.reportBox}><div style={styles.reportLabel}>Net Profit</div><div style={styles.reportValue}>LKR {netProfit.toLocaleString()}</div></div>
          </div>
          
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>📊 Profit & Loss Statement</div>
            <table style={styles.table}>
              <thead><tr><th>Description</th><th style={{textAlign:'right'}}>Amount (LKR)</th></tr></thead>
              <tbody>
                <tr><td><strong>INCOME</strong></td><td style={{textAlign:'right'}}></td></tr>
                <tr><td style={{paddingLeft:20}}>Repair Services</td><td style={{textAlign:'right'}}>${totalRepairIncome.toFixed(2)}</td></tr>
                <tr><td style={{paddingLeft:20}}>Product Sales</td><td style={{textAlign:'right'}}>${totalSalesIncome.toFixed(2)}</td></tr>
                <tr style={{background:'#dbeafe'}}><td><strong>Total Income</strong></td><td style={{textAlign:'right'}}><strong>${(totalRepairIncome + totalSalesIncome).toFixed(2)}</strong></td></tr>
                <tr><td></td><td></td></tr>
                <tr><td><strong>RETURNS</strong></td><td style={{textAlign:'right'}}></td></tr>
                <tr><td style={{paddingLeft:20,color:'#dc2626'}}>Purchase Returns</td><td style={{textAlign:'right',color:'#dc2626'}}>-${totalPurchaseReturns.toFixed(2)}</td></tr>
                <tr><td style={{paddingLeft:20,color:'#dc2626'}}>Sales Returns</td><td style={{textAlign:'right',color:'#dc2626'}}>-${totalSalesReturns.toFixed(2)}</td></tr>
                <tr style={{background:'#fce7f3'}}><td><strong>Total Returns</strong></td><td style={{textAlign:'right',color:'#dc2626'}}><strong>-${(totalPurchaseReturns + totalSalesReturns).toFixed(2)}</strong></td></tr>
                <tr><td></td><td></td></tr>
                <tr><td><strong>EXPENSES</strong></td><td style={{textAlign:'right'}}></td></tr>
                <tr><td style={{paddingLeft:20,color:'#dc2626'}}>Operating Expenses</td><td style={{textAlign:'right',color:'#dc2626'}}>-${totalExpenses.toFixed(2)}</td></tr>
                <tr style={{background:'#fee2e2'}}><td><strong>Total Expenses</strong></td><td style={{textAlign:'right',color:'#dc2626'}}><strong>-${totalExpenses.toFixed(2)}</strong></td></tr>
                <tr><td></td><td></td></tr>
                <tr style={{background: netProfit >= 0 ? '#dcfce7' : '#fee2e2', fontSize:'16px'}}>
                  <td><strong>NET ${netProfit >= 0 ? 'PROFIT' : 'LOSS'}</strong></td>
                  <td style={{textAlign:'right', fontWeight:'700', color: netProfit >= 0 ? '#15803d' : '#dc2626'}}>
                    LKR ${netProfit.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🔧 GRN Billings</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['GRN ID', 'Supplier', 'Amount', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{billedArray.length === 0 && <tr><td colSpan={4} style={styles.emptyTd}>No GRNs found.</td></tr>}
                  {billedArray.map(rep => <tr key={rep.id}><td style={styles.td}>{rep.id}</td><td style={styles.td}>{rep.supplierName || rep.supplier_name}</td><td style={styles.td}>LKR {(rep.netTotal || rep.net_total || rep.subTotal || rep.sub_total || 0).toFixed(2)}</td><td style={styles.td}>{rep.date || rep.billedDate || ''}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🛍️ Accessory Sales</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Invoice', 'Customer', 'Total', 'Paid', 'Due', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{salesArray.length === 0 && <tr><td colSpan={6} style={styles.emptyTd}>No accessory sales recorded.</td></tr>}
                  {salesArray.map(inv => <tr key={inv.id}><td style={styles.td}>{inv.id}</td><td style={styles.td}>{inv.customer || inv.customerName}</td><td style={styles.td}>LKR {(inv.payable || inv.total || 0).toFixed(2)}</td><td style={styles.td}>LKR {(inv.paid || 0).toFixed(2)}</td><td style={styles.td}>LKR {(inv.due || 0).toFixed(2)}</td><td style={styles.td}>{inv.date}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>↩️ Returns</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Type', 'ID', 'Customer/Supplier', 'Amount', 'Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {returnsArray.map(r => <tr key={r.id}><td style={styles.td}>Purchase Return</td><td style={styles.td}>{r.id}</td><td style={styles.td}>{r.supplierName || r.supplier_name}</td><td style={styles.td}>LKR {(r.netTotal || r.net_total || 0).toFixed(2)}</td><td style={styles.td}>{r.date}</td></tr>)}
                  {salesReturnsArray.map(r => <tr key={r.id}><td style={styles.td}>Sales Return</td><td style={styles.td}>{r.id}</td><td style={styles.td}>{r.customer}</td><td style={styles.td}>LKR {(r.netRefund || r.net_refund || 0).toFixed(2)}</td><td style={styles.td}>{r.returnDate || r.return_date}</td></tr>)}
                  {returnsArray.length === 0 && salesReturnsArray.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No returns recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>💰 Expenses</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Date', 'Title', 'Amount'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{expensesArray.length === 0 && <tr><td colSpan={3} style={styles.emptyTd}>No expenses recorded.</td></tr>}
                  {expensesArray.map((exp, idx) => <tr key={idx}><td style={styles.td}>{exp.date}</td><td style={styles.td}>{exp.title}</td><td style={styles.td}>LKR {(exp.amount || 0).toFixed(2)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>📦 Inventory</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}><thead><tr>{['Product', 'Stock', 'Price', 'Reorder', 'Status'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{productsArray.length === 0 && <tr><td colSpan={5} style={styles.emptyTd}>No products available.</td></tr>}
                  {productsArray.map(p => <tr key={p.id}><td style={styles.td}>{p.name}</td><td style={styles.td}>{p.stock}</td><td style={styles.td}>LKR {p.sell || 0}</td><td style={styles.td}>{p.reorderLevel || 5}</td><td style={styles.td}>{(p.stock || 0) <= (p.reorderLevel || 5) ? 'LOW' : 'OK'}</td></tr>)}</tbody>
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

  // ── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <GlassCard title="📊 Reports">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            <div>Loading reports data...</div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div>
      {renderEditBalanceModal()}
      {renderBBFModal()}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 24 }}>
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
        <Modal title="Choose report type" onClose={() => setShowFullChoice(false)}>
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