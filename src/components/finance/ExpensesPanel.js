// src/components/finance/ExpensesPanel.js
import React, { useState, useEffect } from 'react';
import { load, save, toast, SK } from '../../utils/storage';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function ExpensesPanel() {
  const [pettyCash, setPettyCash] = useState([]);
  const [dailyPettyCash, setDailyPettyCash] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    title: '', 
    amount: '', 
    category: 'General',
    date: '' 
  });
  const [filterDate, setFilterDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showReimbursementModal, setShowReimbursementModal] = useState(false);
  const [reimbursementNote, setReimbursementNote] = useState('');
  
  // ── Initial Petty Cash Amount ──────────────────────────────
  const [initialPettyCash, setInitialPettyCash] = useState(0);
  const [showInitialAmountModal, setShowInitialAmountModal] = useState(false);
  const [tempInitialAmount, setTempInitialAmount] = useState('');

  // ── Categories ──────────────────────────────────────────────
  const categories = [
    'General',
    'Transport',
    'Stationery',
    'Utilities',
    'Food & Beverage',
    'Maintenance',
    'Staff Welfare',
    'Office Supplies',
    'Miscellaneous'
  ];

  // ── Helper to ensure array ─────────────────────────────────
  const ensureArray = (data) => {
    return Array.isArray(data) ? data : [];
  };

  // ── Load data on component mount ──────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load all petty cash entries
        const pettyCashData = await load(SK.PETTY_CASH, []);
        const safeData = ensureArray(pettyCashData);
        setPettyCash(safeData);
        
        // Load initial petty cash amount
        const initialAmount = await load(SK.PETTY_CASH_INITIAL, 0);
        setInitialPettyCash(initialAmount || 0);
        
        // Load today's entries
        const today = new Date().toISOString().slice(0, 10);
        const todayEntries = safeData.filter(e => e.date === today);
        setDailyPettyCash(todayEntries);
        
        // Set default date
        if (!form.date) {
          setForm(f => ({ ...f, date: today }));
        }
        
        // Check if reimbursement is needed
        checkReimbursementNeeded(today, safeData);
        
      } catch (error) {
        console.error('Error loading expenses:', error);
        toast('Error loading expenses');
        setPettyCash([]);
        setDailyPettyCash([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ── Save initial petty cash amount ────────────────────────
  const saveInitialAmount = async () => {
    const amount = parseFloat(tempInitialAmount);
    if (isNaN(amount) || amount < 0) {
      toast('⚠️ Please enter a valid amount');
      return;
    }
    
    try {
      setInitialPettyCash(amount);
      await save(SK.PETTY_CASH_INITIAL, amount);
      setShowInitialAmountModal(false);
      setTempInitialAmount('');
      toast(`✅ Initial petty cash set to LKR ${amount.toLocaleString()}`);
    } catch (error) {
      console.error('Error saving initial amount:', error);
      toast('Error saving initial amount');
    }
  };

  // ── Check if reimbursement is needed ──────────────────────
  const checkReimbursementNeeded = (date, data) => {
    const safeData = ensureArray(data);
    const entries = safeData.filter(e => e.date === date);
    const total = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Check if there's already a reimbursement for today
    const hasReimbursement = entries.some(e => e.isReimbursement === true);
    
    // If total is high and no reimbursement yet, show notification
    if (total > 5000 && !hasReimbursement) {
      toast(`💡 Petty cash total LKR ${total.toLocaleString()}. Consider reimbursement.`);
    }
  };

  // ── Check for day change and auto-reimburse ──────────────
  useEffect(() => {
    const checkDayChange = () => {
      const safeData = ensureArray(pettyCash);
      const today = new Date().toISOString().slice(0, 10);
      const lastEntry = safeData.length > 0 ? safeData[0] : null;
      
      if (lastEntry && lastEntry.date !== today) {
        // Check if previous day has entries without reimbursement
        const prevDay = lastEntry.date;
        const prevDayEntries = safeData.filter(e => e.date === prevDay);
        const hasReimbursement = prevDayEntries.some(e => e.isReimbursement === true);
        const total = prevDayEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
        
        if (!hasReimbursement && total > 0) {
          // Auto-reimburse previous day
          autoReimburse(prevDay, total, prevDayEntries);
        }
      }
    };
    
    checkDayChange();
  }, [pettyCash]);

  // ── Auto reimbursement function ──────────────────────────
  const autoReimburse = async (date, total, entries) => {
    try {
      const reimbursementEntry = {
        id: `REIMB-${Date.now()}`,
        date: date,
        title: `💰 AUTO REIMBURSEMENT - Day ${date}`,
        amount: -total,
        category: 'Reimbursement',
        isReimbursement: true,
        reimbursementNote: `Auto-reimbursed for ${entries.length} entries totaling LKR ${total.toLocaleString()}`,
        autoReimbursed: true,
        timestamp: new Date().toISOString()
      };
      
      const safeData = ensureArray(pettyCash);
      const updated = [reimbursementEntry, ...safeData];
      setPettyCash(updated);
      await save(SK.PETTY_CASH, updated);
      
      // Update daily entries
      const today = new Date().toISOString().slice(0, 10);
      const todayEntries = updated.filter(e => e.date === today);
      setDailyPettyCash(todayEntries);
      
      toast(`💰 Auto-reimbursed LKR ${total.toLocaleString()} from ${date}`);
    } catch (error) {
      console.error('Error auto-reimbursing:', error);
    }
  };

  // ── Add expense ─────────────────────────────────────────────
  const addExpense = async () => {
    if (!form.title || !form.amount) { 
      toast('Enter title and amount'); 
      return; 
    }
    
    const today = new Date().toISOString().slice(0, 10);
    const expenseData = { 
      id: `PETTY-${Date.now()}`,
      ...form, 
      amount: +form.amount, 
      date: form.date || today,
      isReimbursement: false,
      timestamp: new Date().toISOString()
    };
    
    try {
      const safeData = ensureArray(pettyCash);
      const upd = [expenseData, ...safeData];
      setPettyCash(upd);
      await save(SK.PETTY_CASH, upd);
      
      // Update daily entries
      const todayEntries = upd.filter(e => e.date === (form.date || today));
      setDailyPettyCash(todayEntries);
      
      setForm({ title: '', amount: '', category: 'General', date: form.date || today });
      toast('✅ Expense recorded');
      
      // Check if reimbursement is needed
      const total = todayEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
      if (total > 5000 && !todayEntries.some(e => e.isReimbursement)) {
        toast(`💡 Total is LKR ${total.toLocaleString()}. Consider reimbursement.`);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast('Error adding expense');
    }
  };

  // ── Delete expense ─────────────────────────────────────────
  const deleteExpense = async (id) => {
    try {
      const safeData = ensureArray(pettyCash);
      const expenseToDelete = safeData.find(e => e.id === id);
      if (expenseToDelete?.isReimbursement) {
        toast('⚠️ Cannot delete reimbursement entries');
        return;
      }
      
      const upd = safeData.filter(e => e.id !== id);
      setPettyCash(upd);
      await save(SK.PETTY_CASH, upd);
      
      // Update daily entries
      const today = new Date().toISOString().slice(0, 10);
      const todayEntries = upd.filter(e => e.date === today);
      setDailyPettyCash(todayEntries);
      
      toast('🗑️ Expense deleted');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast('Error deleting expense');
    }
  };

  // ── Manual reimbursement ──────────────────────────────────
  const manualReimburse = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const safeData = ensureArray(pettyCash);
    
    // Get today's expenses (non-reimbursement entries)
    const todayExpenses = safeData.filter(e => e.date === today && !e.isReimbursement);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Get today's reimbursements
    const todayReimbursements = safeData.filter(e => e.date === today && e.isReimbursement);
    const totalReimbursed = todayReimbursements.reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);
    
    // Calculate how much is needed to reach initial amount
    const currentBalance = initialPettyCash - totalExpenses + totalReimbursed;
    const amountNeeded = initialPettyCash - currentBalance;
    
    if (amountNeeded <= 0) {
      toast('✅ Balance is already at or above initial amount');
      return;
    }
    
    if (totalExpenses === 0) {
      toast('No expenses to reimburse today');
      return;
    }
    
    try {
      const reimbursementEntry = {
        id: `REIMB-${Date.now()}`,
        date: today,
        title: `💰 REIMBURSEMENT - ${reimbursementNote || 'Petty Cash Reimbursement'}`,
        amount: -amountNeeded,
        category: 'Reimbursement',
        isReimbursement: true,
        reimbursementNote: reimbursementNote || `Reimbursement to restore initial amount (LKR ${initialPettyCash.toLocaleString()})`,
        autoReimbursed: false,
        usedInitialAmount: true,
        initialAmountUsed: initialPettyCash,
        amountNeeded: amountNeeded,
        timestamp: new Date().toISOString()
      };
      
      const updated = [reimbursementEntry, ...safeData];
      setPettyCash(updated);
      await save(SK.PETTY_CASH, updated);
      
      // Update daily entries
      const todayEntries = updated.filter(e => e.date === today);
      setDailyPettyCash(todayEntries);
      
      setShowReimbursementModal(false);
      setReimbursementNote('');
      
      toast(`💰 Reimbursed LKR ${amountNeeded.toLocaleString()} to restore initial amount`);
    } catch (error) {
      console.error('Error reimbursing:', error);
      toast('Error processing reimbursement');
    }
  };

  // ── Filter by date ─────────────────────────────────────────
  const filterByDate = (date) => {
    const safeData = ensureArray(pettyCash);
    if (!date) return safeData;
    return safeData.filter(e => e.date === date);
  };

  // ── Filter by category ─────────────────────────────────────
  const filterByCategory = (data) => {
    const safeData = ensureArray(data);
    if (selectedCategory === 'All') return safeData;
    return safeData.filter(e => e.category === selectedCategory);
  };

  // ── Get filtered data ──────────────────────────────────────
  const getFilteredData = () => {
    let data = filterDate ? filterByDate(filterDate) : dailyPettyCash;
    data = filterByCategory(data);
    return data;
  };

  // ── Get daily summary ──────────────────────────────────────
  const getDailySummary = (date) => {
    const safeData = ensureArray(pettyCash);
    const entries = safeData.filter(e => e.date === date);
    const totalExpenses = entries.filter(e => !e.isReimbursement).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalReimbursed = entries.filter(e => e.isReimbursement).reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);
    const netBalance = totalExpenses - totalReimbursed;
    
    return {
      totalExpenses,
      totalReimbursed,
      netBalance,
      count: entries.length
    };
  };

  // ── Get today's summary ────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const todaySummary = getDailySummary(today);
  
  // ── Get all unique dates ───────────────────────────────────
  const getUniqueDates = () => {
    const safeData = ensureArray(pettyCash);
    const dates = safeData.map(e => e.date).filter(Boolean);
    return [...new Set(dates)].sort().reverse();
  };

  // ── Get current balance ────────────────────────────────────
  const getCurrentBalance = () => {
    const safeData = ensureArray(pettyCash);
    const totalExpenses = safeData.filter(e => !e.isReimbursement).reduce((s, e) => s + (e.amount || 0), 0);
    const totalReimbursed = safeData.filter(e => e.isReimbursement).reduce((s, e) => s + Math.abs(e.amount || 0), 0);
    return initialPettyCash - totalExpenses + totalReimbursed;
  };

  // ── Get amount needed to reimburse ────────────────────────
  const getAmountNeeded = () => {
    const currentBalance = getCurrentBalance();
    return initialPettyCash - currentBalance;
  };

  // ── Export to CSV ──────────────────────────────────────────
  const exportToCSV = () => {
    const data = getFilteredData();
    const safeData = ensureArray(data);
    if (safeData.length === 0) {
      toast('No data to export');
      return;
    }
    
    const headers = ['Date', 'Title', 'Category', 'Amount (LKR)', 'Type'];
    const rows = safeData.map(e => [
      e.date,
      e.title,
      e.category,
      (e.amount || 0).toFixed(2),
      e.isReimbursement ? 'REIMBURSEMENT' : 'EXPENSE'
    ]);
    
    // Add summary rows
    rows.push([]);
    rows.push(['Initial Petty Cash', '', '', initialPettyCash.toFixed(2), '']);
    rows.push(['Total Expenses', '', '', pettyCash.filter(e => !e.isReimbursement).reduce((s, e) => s + (e.amount || 0), 0).toFixed(2), '']);
    rows.push(['Total Reimbursed', '', '', pettyCash.filter(e => e.isReimbursement).reduce((s, e) => s + Math.abs(e.amount || 0), 0).toFixed(2), '']);
    rows.push(['Current Balance', '', '', getCurrentBalance().toFixed(2), '']);
    rows.push(['Amount Needed for Reimbursement', '', '', getAmountNeeded().toFixed(2), '']);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Expenses_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast('📥 CSV exported successfully');
  };

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <GlassCard title="💰 Petty Cash">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          <div>Loading expenses...</div>
        </div>
      </GlassCard>
    );
  }

  // ── Render ────────────────────────────────────────────────

  const currentBalance = getCurrentBalance();
  const amountNeeded = getAmountNeeded();

  return (
    <div>
      {/* Initial Amount Modal */}
      {showInitialAmountModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginTop: 0, color: '#0f172a' }}>💰 Set Initial Petty Cash Amount</h2>
            <div style={{ color: '#64748b', marginBottom: 20 }}>
              <div>Set the initial petty cash amount. This will be the starting balance.</div>
              {initialPettyCash > 0 && (
                <div style={{ marginTop: 8 }}>
                  Current amount: <strong>LKR {initialPettyCash.toLocaleString()}</strong>
                </div>
              )}
            </div>
            
            <FormGrid>
              <Field label="Initial Amount (LKR)">
                <input
                  type="number"
                  style={styles.input}
                  value={tempInitialAmount}
                  onChange={e => setTempInitialAmount(e.target.value)}
                  placeholder="Enter initial petty cash amount"
                />
              </Field>
            </FormGrid>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button style={styles.btnOutline} onClick={() => {
                setShowInitialAmountModal(false);
                setTempInitialAmount('');
              }}>
                Cancel
              </button>
              <button style={{ ...styles.btnPrimary, background: '#3b82f6' }} onClick={saveInitialAmount}>
                💰 Save Amount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reimbursement Modal */}
      {showReimbursementModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginTop: 0, color: '#0f172a' }}>💰 Reimburse Petty Cash</h2>
            <div style={{ color: '#64748b', marginBottom: 20 }}>
              <div>Initial Amount: <strong>LKR {initialPettyCash.toLocaleString()}</strong></div>
              <div>Current Balance: <strong style={{ color: currentBalance >= 0 ? '#15803d' : '#dc2626' }}>
                LKR {currentBalance.toLocaleString()}
              </strong></div>
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: '#1e40af' }}>
                Amount Needed: <strong style={{ fontSize: 20 }}>LKR {amountNeeded.toLocaleString()}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                This will restore the balance to LKR {initialPettyCash.toLocaleString()}
              </div>
            </div>
            
            <FormGrid>
              <Field label="Note (Optional)">
                <input
                  style={styles.input}
                  value={reimbursementNote}
                  onChange={e => setReimbursementNote(e.target.value)}
                  placeholder="e.g., Reimbursement for today's expenses"
                />
              </Field>
            </FormGrid>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button style={styles.btnOutline} onClick={() => {
                setShowReimbursementModal(false);
                setReimbursementNote('');
              }}>
                Cancel
              </button>
              <button style={{ ...styles.btnPrimary, background: '#10b981' }} onClick={manualReimburse}>
                ✅ Reimburse LKR {amountNeeded.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      <GlassCard 
        title="💰 Petty Cash" 
        badge={`${dailyPettyCash.filter(e => !e.isReimbursement).length} today`}
      >
        {/* Summary Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          gap: 12, 
          marginBottom: 24 
        }}>
          <div style={{ 
            background: '#eff6ff', 
            padding: 14, 
            borderRadius: 12,
            border: '1px solid #bfdbfe'
          }}>
            <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>Today's Expenses</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a' }}>
              LKR {todaySummary.totalExpenses.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              {dailyPettyCash.filter(e => !e.isReimbursement).length} entries
            </div>
          </div>
          
          <div style={{ 
            background: '#fef3c7', 
            padding: 14, 
            borderRadius: 12,
            border: '1px solid #fde68a'
          }}>
            <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Today's Reimbursed</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>
              LKR {todaySummary.totalReimbursed.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              {dailyPettyCash.filter(e => e.isReimbursement).length} reimbursements
            </div>
          </div>
          
          <div style={{ 
            background: '#f0fdf4', 
            padding: 14, 
            borderRadius: 12,
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Initial Amount</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>
              LKR {initialPettyCash.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              <button 
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '2px 10px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 10
                }}
                onClick={() => {
                  setTempInitialAmount(initialPettyCash.toString());
                  setShowInitialAmountModal(true);
                }}
              >
                ✏️ Edit
              </button>
            </div>
          </div>
          
          <div style={{ 
            background: currentBalance >= 0 ? '#f0fdf4' : '#fef2f2', 
            padding: 14, 
            borderRadius: 12,
            border: `1px solid ${currentBalance >= 0 ? '#bbf7d0' : '#fca5a5'}`
          }}>
            <div style={{ fontSize: 11, color: currentBalance >= 0 ? '#166534' : '#991b1b', fontWeight: 600 }}>
              Current Balance
            </div>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 800, 
              color: currentBalance >= 0 ? '#15803d' : '#dc2626'
            }}>
              LKR {currentBalance.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              {currentBalance >= 0 ? '✅ Positive' : '⚠️ Negative'}
            </div>
          </div>
          
          <div style={{ 
            background: amountNeeded > 0 ? '#fef2f2' : '#f0fdf4', 
            padding: 14, 
            borderRadius: 12,
            border: `1px solid ${amountNeeded > 0 ? '#fca5a5' : '#bbf7d0'}`
          }}>
            <div style={{ fontSize: 11, color: amountNeeded > 0 ? '#991b1b' : '#166534', fontWeight: 600 }}>
              Amount Needed
            </div>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 800, 
              color: amountNeeded > 0 ? '#dc2626' : '#15803d'
            }}>
              LKR {amountNeeded.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              {amountNeeded > 0 ? '⚠️ Reimbursement needed' : '✅ Fully funded'}
            </div>
          </div>
          
          <div style={{ 
            background: '#f8fafc', 
            padding: 14, 
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <button 
              style={{
                background: amountNeeded > 0 ? '#10b981' : '#94a3b8',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 8,
                cursor: amountNeeded > 0 ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                fontSize: 13,
                width: '100%'
              }}
              onClick={() => {
                if (amountNeeded <= 0) {
                  toast('✅ Balance is already at or above initial amount');
                  return;
                }
                if (todaySummary.totalExpenses === 0) {
                  toast('No expenses to reimburse today');
                  return;
                }
                setShowReimbursementModal(true);
              }}
              disabled={amountNeeded <= 0 || todaySummary.totalExpenses === 0}
            >
              💰 Reimburse {amountNeeded > 0 ? `LKR ${amountNeeded.toLocaleString()}` : '✅ Fully Funded'}
            </button>
            {amountNeeded > 0 && todaySummary.totalExpenses === 0 && (
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                No expenses to reimburse
              </div>
            )}
            {amountNeeded <= 0 && (
              <div style={{ fontSize: 10, color: '#15803d', marginTop: 4 }}>
                Balance is fully funded
              </div>
            )}
          </div>
        </div>

        {/* Add Expense Form */}
        <div style={{ 
          background: '#f8fafc', 
          padding: 20, 
          borderRadius: 12,
          marginBottom: 24,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>
            ➕ Add Expense
          </div>
          <FormGrid>
            <Field label="Title">
              <input 
                style={styles.input} 
                value={form.title} 
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
                placeholder="e.g., Office supplies, Transport..."
              />
            </Field>
            <Field label="Amount (LKR)">
              <input 
                type="number" 
                style={styles.input} 
                value={form.amount} 
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} 
                placeholder="0.00"
              />
            </Field>
            <Field label="Category">
              <select 
                style={styles.input} 
                value={form.category} 
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input 
                type="date" 
                style={styles.input} 
                value={form.date} 
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} 
              />
            </Field>
          </FormGrid>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={{ ...styles.btnPrimary, background: '#f59e0b' }} onClick={addExpense}>
              ✅ Add Expense
            </button>
            <button style={styles.btnOutline} onClick={() => {
              setForm({ title: '', amount: '', category: 'General', date: today });
            }}>
              Clear Form
            </button>
            <button style={{ ...styles.btnOutline, marginLeft: 'auto' }} onClick={exportToCSV}>
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Date:</span>
            <select 
              style={{ ...styles.input, padding: '6px 12px', width: 'auto' }}
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            >
              <option value="">Today</option>
              {getUniqueDates().map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Category:</span>
            <select 
              style={{ ...styles.input, padding: '6px 12px', width: 'auto' }}
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b' }}>
            Showing: <strong>{getFilteredData().length}</strong> entries
          </div>
        </div>

        {/* Expenses List */}
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Date', 'Title', 'Category', 'Amount (LKR)', 'Type', 'Action'].map(h => 
                  <th key={h} style={styles.th}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {getFilteredData().length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>📭</div>
                    No expenses found
                  </td>
                </tr>
              ) : (
                getFilteredData().map((e, i) => {
                  const isReimbursement = e.isReimbursement === true;
                  return (
                    <tr key={e.id || i} style={{ 
                      background: isReimbursement ? '#f0fdf4' : (i % 2 === 0 ? '#fafafa' : 'transparent'),
                      opacity: isReimbursement ? 0.85 : 1
                    }}>
                      <td style={styles.td}>{e.date}</td>
                      <td style={styles.td}>
                        <strong>{e.title}</strong>
                        {e.reimbursementNote && (
                          <div style={{ fontSize: 11, color: '#64748b' }}>{e.reimbursementNote}</div>
                        )}
                        {e.usedInitialAmount && (
                          <div style={{ fontSize: 10, color: '#3b82f6' }}>💰 Restored to LKR {e.initialAmountUsed?.toLocaleString()}</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          background: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {e.category || 'General'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          color: isReimbursement ? '#15803d' : '#dc2626',
                          fontWeight: 700
                        }}>
                          {isReimbursement ? '⬅️ ' : ''}
                          LKR {(e.amount || 0).toFixed(2)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          background: isReimbursement ? '#dcfce7' : '#fef3c7',
                          padding: '2px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          color: isReimbursement ? '#166534' : '#92400e'
                        }}>
                          {isReimbursement ? '💰 Reimbursement' : 'Expense'}
                          {e.autoReimbursed && ' 🤖'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {!isReimbursement && (
                          <button 
                            style={styles.btnDanger} 
                            onClick={() => {
                              if (window.confirm(`Delete expense: ${e.title}?`)) {
                                deleteExpense(e.id);
                              }
                            }}
                          >
                            🗑️ Delete
                          </button>
                        )}
                        {isReimbursement && (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        {pettyCash.length > 0 && (
          <div style={{ 
            marginTop: 16, 
            padding: 16, 
            background: '#f8fafc', 
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <span style={{ color: '#64748b' }}>Initial Amount:</span>
              <strong style={{ marginLeft: 8, color: '#15803d' }}>
                LKR {initialPettyCash.toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Total Expenses:</span>
              <strong style={{ marginLeft: 8, color: '#dc2626' }}>
                LKR {pettyCash.filter(e => !e.isReimbursement).reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Total Reimbursed:</span>
              <strong style={{ marginLeft: 8, color: '#15803d' }}>
                LKR {pettyCash.filter(e => e.isReimbursement).reduce((s, e) => s + Math.abs(e.amount || 0), 0).toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Current Balance:</span>
              <strong style={{ marginLeft: 8, color: currentBalance >= 0 ? '#15803d' : '#dc2626' }}>
                LKR {currentBalance.toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Need to Reimburse:</span>
              <strong style={{ marginLeft: 8, color: amountNeeded > 0 ? '#dc2626' : '#15803d' }}>
                LKR {amountNeeded.toLocaleString()}
              </strong>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}