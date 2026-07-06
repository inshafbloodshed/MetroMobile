import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function WorkersPanel({ user }) {
  const [workers, setWorkers] = useState(() => load(SK.WORKERS, []));
  const [sales] = useState(() => load(SK.SALES, []));
  const [form, setForm] = useState({ name: '', username: '', password: '123', role: 'user' });

  const register = () => {
    if (!form.name || !form.username) { toast('Fill all fields'); return; }
    if (workers.find(w => w.username === form.username)) { toast('Username exists'); return; }
    const w = { id: Date.now(), ...form, role: form.role || 'user', active: true, joinedDate: new Date().toISOString().slice(0, 10) };
    const upd = [...workers, w]; setWorkers(upd); save(SK.WORKERS, upd);
    setForm({ name: '', username: '', password: '123', role: 'user' }); toast(`✅ ${form.name} registered`);
  };

  const toggle = (id) => { const upd = workers.map(w => w.id === id ? { ...w, active: !w.active } : w); setWorkers(upd); save(SK.WORKERS, upd); };
  const del = (id) => {
    if (!window.confirm('Delete this worker?')) return;
    const upd = workers.filter(w => w.id !== id);
    setWorkers(upd);
    save(SK.WORKERS, upd);
    toast('Deleted');
  };

  return (
    <div>
      <GlassCard title="👥 Register New Worker">
        <div style={styles.grid2}>
          <FormGrid>
            <Field label="Full Name"><input style={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Username"><input style={styles.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></Field>
            <Field label="Password"><input style={styles.input} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Field>
            <Field label="Role"><select style={styles.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}><option value="user">User</option><option value="admin">Admin</option></select></Field>
          </FormGrid>
          <div style={{ background: '#eff3ff', padding: 16, borderRadius: 12, fontSize: 13 }}>ℹ️ Default password is "123". Workers login with username & password.</div>
        </div>
        <button style={{ ...styles.btnPrimary, marginTop: 16 }} onClick={register}>➕ Register Worker</button>
      </GlassCard>
      
      <GlassCard title="📋 Workers">
        <table style={styles.table}>
          <thead><tr>{['Name', 'Username', 'Role', 'Joined', 'Status', 'Sales', 'Action'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!workers.length && <tr><td colSpan={7} style={styles.emptyTd}>No workers registered</td></tr>}
            {workers.map(w => { 
              const ws = sales.filter(s => s.soldBy === w.username || s.createdBy === w.username); 
              const rev = ws.reduce((s, x) => s + (x.total || x.payable || 0), 0); 
              return (
                <tr key={w.id}>
                  <td style={styles.td}><strong>{w.name}</strong></td>
                  <td style={styles.td}>{w.username}</td>
                  <td style={styles.td}>{(w.role || 'user').toUpperCase()}</td>
                  <td style={styles.td}>{w.joinedDate}</td>
                  <td style={styles.td}>
                    <button style={{ ...styles.btnPrimary, padding: '4px 12px', fontSize: 12, background: w.active ? '#10b981' : '#94a3b8' }} onClick={() => toggle(w.id)}>
                      {w.active ? '✅ Active' : '❌ Inactive'}
                    </button>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: 12 }}>
                      <strong>{ws.length}</strong> sales<br />
                      <strong>LKR {rev.toLocaleString()}</strong>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <button style={{ ...styles.btnDanger, marginRight: 6 }} onClick={() => del(w.id)}>🗑️</button>
                  </td>
                </tr>
              ); 
            })}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}