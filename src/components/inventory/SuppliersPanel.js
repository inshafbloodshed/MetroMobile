import React, { useState } from 'react';
import { load, save, toast } from '../../utils/storage';
import { SK } from '../../utils/constants';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';

export function SuppliersPanel() {
  const [suppliers, setSuppliers] = useState(() => load(SK.SUPPLIERS, []));
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const genId = () => 'SUP' + String(suppliers.filter(s => s.active !== false).length + 1).padStart(5, '0');

  const addSupplier = () => {
    if (!name || !phone) { toast('Name & phone required'); return; }
    const s = { id: genId(), name: name.toUpperCase(), phone, address, active: true };
    const upd = [...suppliers, s]; setSuppliers(upd); save(SK.SUPPLIERS, upd);
    setName(''); setPhone(''); setAddress(''); toast(`✅ ${name} added`);
  };

  const filtered = suppliers.filter(s => s.active !== false && (s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())));

  return (
    <GlassCard title="🏢 Suppliers">
      <div style={styles.grid2}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Add New Supplier</div>
          <FormGrid>
            <Field label="Company Name"><input style={styles.input} value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Phone"><input style={styles.input} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
            <Field label="Address"><input style={styles.input} value={address} onChange={e => setAddress(e.target.value)} /></Field>
          </FormGrid>
          <button style={{ ...styles.btnPrimary, marginTop: 12 }} onClick={addSupplier}>+ Register Supplier</button>
        </div>
        <div>
          <input style={styles.input} placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
          {filtered.map(s => (
            <div key={s.id} style={{ ...styles.histItem, marginTop: 8 }}>
              <div><strong>{s.name}</strong> | {s.id}</div>
              <div>📞 {s.phone}</div>
              <div>📍 {s.address}</div>
              <button style={{ ...styles.btnDanger, marginTop: 8 }} onClick={() => { 
                const upd = suppliers.map(x => x.id === s.id ? { ...x, active: false } : x); 
                setSuppliers(upd); 
                save(SK.SUPPLIERS, upd); 
              }}>
                Deactivate
              </button>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}