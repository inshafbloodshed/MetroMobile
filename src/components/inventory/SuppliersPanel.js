// src/components/finance/SuppliersPanel.js
import React, { useState, useEffect } from 'react';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Field } from '../common/Field';
import { FormGrid } from '../common/FormGrid';
import { toast } from '../../utils/storage';

export function SuppliersPanel() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // ── Load data on component mount ──────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading suppliers and products...');
        
        const [suppliersData, productsData] = await Promise.all([
          window.api.getSuppliers(false), // ✅ Get ALL suppliers (including inactive)
          window.api.getProducts(false)
        ]);
        
        console.log('📊 Suppliers from DB:', suppliersData);
        console.log('📊 Products from DB:', productsData);
        
        setSuppliers(suppliersData || []);
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
        toast('Error loading data');
        setSuppliers([]);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // ── Derived values ──────────────────────────────────────

  const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
  const productsArray = Array.isArray(products) ? products : [];

  const genId = () => {
    const activeSuppliers = suppliersArray.filter(s => s.active !== false);
    return 'SUP' + String(activeSuppliers.length + 1).padStart(5, '0');
  };

  // ── Force Refresh Data ──────────────────────────────────
  const forceRefresh = async () => {
    try {
      console.log('🔄 Force refreshing data...');
      setLoading(true);
      
      // ✅ Get ALL suppliers (including inactive)
      const [suppliersData, productsData] = await Promise.all([
        window.api.getSuppliers(false),
        window.api.getProducts(false)
      ]);
      
      console.log('📊 Refreshed suppliers:', suppliersData);
      console.log('📊 Refreshed products:', productsData);
      
      setSuppliers(suppliersData || []);
      setProducts(productsData || []);
      
      // Update localStorage
      localStorage.setItem('suppliers', JSON.stringify(suppliersData || []));
      localStorage.setItem('products', JSON.stringify(productsData || []));
      
      console.log('✅ Refresh complete');
      return { suppliers: suppliersData, products: productsData };
    } catch (error) {
      console.error('Error refreshing data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────

  const addSupplier = async () => {
    if (!name || !phone) { 
      toast('Name & phone required'); 
      return; 
    }
    
    try {
      console.log('➕ Adding supplier:', { name, phone, address });
      
      const newSupplier = { 
        id: genId(), 
        name: name.toUpperCase(), 
        phone, 
        address, 
        active: 1 
      };
      
      await window.api.createSupplier(newSupplier);
      await forceRefresh();
      
      setName('');
      setPhone('');
      setAddress('');
      toast(`✅ ${name} added`);
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast('Error adding supplier: ' + error.message);
    }
  };

  // ── DEACTIVATE SUPPLIER ──────────────────────────────────
  const deactivateSupplier = async (id) => {
    try {
      console.log(`🔍 Finding supplier with id: ${id}`);
      const supplier = suppliersArray.find(s => s.id === id);
      
      if (!supplier) {
        console.error('❌ Supplier not found:', id);
        toast('Supplier not found');
        return;
      }

      console.log('📦 Found supplier:', supplier);
      console.log(`📦 Current active status: ${supplier.active}`);

      if (!window.confirm(`Deactivate ${supplier.name}?`)) {
        return;
      }

      // ✅ Update supplier to inactive
      const updatedSupplier = { 
        ...supplier, 
        active: 0 
      };
      
      console.log('🔄 Sending update to inactive:', updatedSupplier);
      const result = await window.api.updateSupplier(id, updatedSupplier);
      console.log('✅ Supplier update result:', result);

      // ✅ Deactivate all products for this supplier
      const productsToDeactivate = productsArray.filter(p => p.supplier_id === id);
      console.log(`📦 Found ${productsToDeactivate.length} products to deactivate`);
      
      for (const product of productsToDeactivate) {
        const updatedProduct = { 
          ...product, 
          active: 0 
        };
        console.log(`🔄 Deactivating product: ${product.name} (${product.id})`);
        await window.api.updateProduct(product.id, updatedProduct);
      }

      // ✅ FORCE REFRESH the data
      console.log('🔄 Force refreshing after deactivation...');
      await forceRefresh();
      
      // ✅ Show success message
      toast(`✅ ${supplier.name} deactivated with ${productsToDeactivate.length} products`);
    } catch (error) {
      console.error('❌ Error deactivating supplier:', error);
      toast('Error deactivating supplier: ' + error.message);
    }
  };

  // ── REACTIVATE SUPPLIER ──────────────────────────────────
  const reactivateSupplier = async (id) => {
    try {
      const supplier = suppliersArray.find(s => s.id === id);
      if (!supplier) {
        toast('Supplier not found');
        return;
      }

      console.log('📦 Found supplier:', supplier);
      console.log(`📦 Current active status: ${supplier.active}`);

      if (!window.confirm(`Reactivate ${supplier.name}?`)) {
        return;
      }

      const updatedSupplier = { 
        ...supplier, 
        active: 1 
      };
      
      console.log('🔄 Reactivating supplier:', updatedSupplier);
      await window.api.updateSupplier(id, updatedSupplier);

      // ✅ Reactivate all products for this supplier
      const productsToReactivate = productsArray.filter(p => p.supplier_id === id);
      console.log(`📦 Found ${productsToReactivate.length} products to reactivate`);
      
      for (const product of productsToReactivate) {
        const updatedProduct = { 
          ...product, 
          active: 1 
        };
        console.log(`🔄 Reactivating product: ${product.name} (${product.id})`);
        await window.api.updateProduct(product.id, updatedProduct);
      }

      await forceRefresh();
      
      toast(`✅ ${supplier.name} reactivated with ${productsToReactivate.length} products`);
    } catch (error) {
      console.error('Error reactivating supplier:', error);
      toast('Error reactivating supplier: ' + error.message);
    }
  };

  // ── VIEW PRODUCTS FOR A SUPPLIER ──────────────────────────
  const viewSupplierProducts = (supplierId) => {
    const supplierProducts = productsArray.filter(p => p.supplier_id === supplierId);
    const supplier = suppliersArray.find(s => s.id === supplierId);
    
    if (supplierProducts.length === 0) {
      toast(`No products found for ${supplier?.name || 'this supplier'}`);
      return;
    }
    
    const productList = supplierProducts.map(p => 
      `- ${p.name} (${p.code}) | Stock: ${p.stock || 0} | ${p.active !== false ? '✅ Active' : '❌ Inactive'}`
    ).join('\n');
    
    alert(`📦 Products for ${supplier?.name}:\n\n${productList}\n\nTotal: ${supplierProducts.length} products`);
  };

  // ✅ Show ALL suppliers (including inactive)
  const filtered = suppliersArray.filter(s => 
    (s.name?.toLowerCase().includes(search.toLowerCase()) || 
     s.id?.toLowerCase().includes(search.toLowerCase()))
  );

  const activeCount = suppliersArray.filter(s => s.active !== false).length;
  const inactiveCount = suppliersArray.filter(s => s.active === false).length;

  // ── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <GlassCard title="🏢 Suppliers">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          <div>Loading suppliers...</div>
        </div>
      </GlassCard>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <GlassCard title="🏢 Suppliers" badge={`${activeCount} active, ${inactiveCount} inactive`}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 8 }}>
        <button 
          onClick={forceRefresh}
          style={{ ...styles.btnOutline, padding: '6px 16px', fontSize: 12 }}
        >
          🔄 Force Refresh
        </button>
      </div>

      <div style={styles.grid2}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Add New Supplier</div>
          <FormGrid>
            <Field label="Company Name">
              <input 
                style={styles.input} 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Enter company name"
              />
            </Field>
            <Field label="Phone">
              <input 
                style={styles.input} 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder="Enter phone number"
              />
            </Field>
            <Field label="Address">
              <input 
                style={styles.input} 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Enter address"
              />
            </Field>
          </FormGrid>
          <button 
            style={{ ...styles.btnPrimary, marginTop: 12 }} 
            onClick={addSupplier}
          >
            + Register Supplier
          </button>
        </div>
        <div>
          <input 
            style={styles.input} 
            placeholder="Search suppliers..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          {filtered.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              color: '#94a3b8',
              fontSize: '14px'
            }}>
              {search ? 'No suppliers match your search' : 'No suppliers registered yet'}
            </div>
          )}
          {filtered.map(s => {
            // ✅ Check if supplier is active (active = 1)
            const isActive = s.active === 1;
            const productCount = productsArray.filter(p => p.supplier_id === s.id).length;
            
            return (
              <div 
                key={s.id} 
                style={{ 
                  ...styles.histItem, 
                  marginTop: 8,
                  opacity: isActive ? 1 : 0.6,
                  background: isActive ? 'transparent' : '#f8fafc',
                  borderLeft: isActive ? '4px solid #10b981' : '4px solid #ef4444'
                }}
              >
                <div>
                  <strong>{s.name}</strong> | {s.id}
                  {!isActive && (
                    <span style={{ 
                      marginLeft: 8, 
                      background: '#fee2e2', 
                      color: '#dc2626',
                      padding: '1px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      INACTIVE
                    </span>
                  )}
                  <span style={{ 
                    marginLeft: 8, 
                    background: '#e2e8f0', 
                    color: '#475569',
                    padding: '1px 10px',
                    borderRadius: 12,
                    fontSize: 11
                  }}>
                    {productCount} products
                  </span>
                </div>
                <div>📞 {s.phone}</div>
                {s.address && <div>📍 {s.address}</div>}
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isActive ? (
                    <>
                      <button 
                        style={{ ...styles.btnDanger, padding: '4px 12px', fontSize: 12 }} 
                        onClick={() => deactivateSupplier(s.id)}
                      >
                        Deactivate
                      </button>
                      <button 
                        style={{ ...styles.btnPrimary, padding: '4px 12px', fontSize: 12, background: '#8b5cf6' }} 
                        onClick={() => viewSupplierProducts(s.id)}
                      >
                        📦 View Products
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        style={{ ...styles.btnPrimary, padding: '4px 12px', fontSize: 12, background: '#10b981' }} 
                        onClick={() => reactivateSupplier(s.id)}
                      >
                        Reactivate
                      </button>
                      <button 
                        style={{ ...styles.btnPrimary, padding: '4px 12px', fontSize: 12, background: '#8b5cf6' }} 
                        onClick={() => viewSupplierProducts(s.id)}
                      >
                        📦 View Products
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}