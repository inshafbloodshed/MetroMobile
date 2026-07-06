import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function ExpensesPanel() {
  const [expenses, setExpenses] = useState(() => load(SK.EXP, []));
  const [form, setForm] = useState({ title: '', amount: '', date: '' });

  const add = () => {
    if (!form.title || !form.amount) { toast('Enter title and amount'); return; }
    const e = { ...form, amount: +form.amount, date: form.date || new Date().toISOString().slice(0, 10) };
    const upd = [e, ...expenses]; setExpenses(upd); save(SK.EXP, upd);
    setForm({ title: '', amount: '', date: '' }); toast('Expense recorded');
  };
  const del = (i) => { const upd = expenses.filter((_, j) => j !== i); setExpenses(upd); save(SK.EXP, upd); };

  return (
    <GlassCard title="💸 Expenses">
      <div style={styles.grid2}>
        <FormGrid>
          <Field label="Title"><input style={styles.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Rent, Parts..." /></Field>
          <Field label="Amount (LKR)"><input type="number" style={styles.input} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></Field>
          <Field label="Date"><input type="date" style={styles.input} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
        </FormGrid>
        <div style={{ background: '#fff7ed', padding: 16, borderRadius: 12, fontSize: 13 }}>📝 All expenses affect net profit</div>
      </div>
      <button style={{ ...styles.btnPrimary, background: '#f59e0b', marginTop: 16 }} onClick={add}>Add Expense</button>
      <hr style={{ margin: '20px 0' }} />
      <table style={styles.table}>
        <thead><tr>{['Date', 'Title', 'Amount', 'Action'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
        <tbody>
          {!expenses.length && <tr><td colSpan={4} style={styles.emptyTd}>No expenses recorded</td></tr>}
          {expenses.map((e, i) => <tr key={i}><td style={styles.td}>{e.date}</td><td style={styles.td}>{e.title}</td><td style={styles.td}>LKR {e.amount}</td><td style={styles.td}><button style={styles.btnDanger} onClick={() => del(i)}>Delete</button></td></tr>)}
        </tbody>
      </table>
    </GlassCard>
  );
}