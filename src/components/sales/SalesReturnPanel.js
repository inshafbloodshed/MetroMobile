// src/components/sales/SalesReturnPanel.js
import React, { useState, useEffect } from 'react';
import { load, save, toast, SK } from '../../utils/storage';
import { padId } from '../../utils/helpers';
import { styles } from '../../utils/styles';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Field } from '../common/Field';

export function SalesReturnPanel({ user, isWorkerView = false }) {
  // State for data - initialize as empty arrays
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [srs, setSrs] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const [existingReturns, setExistingReturns] = useState([]);
  const [showExistingReturnsModal, setShowExistingReturnsModal] = useState(false);

  const parseJsonField = (field, defaultValue = []) => {
    if (!field) return defaultValue;
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    }
    return defaultValue;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        let productsData = [];
        let salesData = [];
        let srsData = [];

        if (window.api) {
          try {
            console.log('📦 Loading data from SQLite...');
            productsData = await window.api.getProducts() || [];
            salesData = await window.api.getSalesInvoices() || [];
            srsData = await window.api.getSalesReturns() || [];
            console.log('✅ Loaded products:', productsData.length);
          } catch (sqliteError) {
            console.warn('SQLite error, falling back to localStorage:', sqliteError);
            productsData = await load(SK.PRODUCTS, []);
            salesData = await load(SK.SALES, []);
            srsData = await load(SK.SR, []);
          }
        } else {
          console.log('📦 Loading data from localStorage...');
          productsData = await load(SK.PRODUCTS, []);
          salesData = await load(SK.SALES, []);
          srsData = await load(SK.SR, []);
        }

        const parsedSrs = (srsData || []).map(sr => ({
          ...sr,
          invoice_id: sr.invoice_id || sr.invoiceId || '',
          returned_items: parseJsonField(sr.returned_items || sr.returnedItems),
          exchange_items: parseJsonField(sr.exchange_items || sr.exchangeItems)
        }));

        setProducts(Array.isArray(productsData) ? productsData : []);
        setSales(Array.isArray(salesData) ? salesData : []);
        setSrs(Array.isArray(parsedSrs) ? parsedSrs : []);
      } catch (error) {
        console.error('Error loading data:', error);
        toast('Error loading data');
        setProducts([]);
        setSales([]);
        setSrs([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const productsArray = Array.isArray(products) ? products : [];
  const salesArray = Array.isArray(sales) ? sales : [];
  const srsArray = Array.isArray(srs) ? srs : [];

  const nextSR = () => {
    if (!srsArray || srsArray.length === 0) return 'SR00001';
    const maxId = srsArray.reduce((max, sr) => {
      if (!sr || !sr.id) return max;
      const num = parseInt(sr.id.replace('SR', ''));
      return num > max ? num : max;
    }, 0);
    return `SR${String(maxId + 1).padStart(5, '0')}`;
  };

  // ✅ Get all returns for an invoice
  const getReturnsForInvoice = (invoiceId) => {
    if (!invoiceId) return [];
    return srsArray.filter(sr => {
      const srInvoiceId = sr.invoice_id || sr.invoiceId || '';
      return srInvoiceId === invoiceId;
    });
  };

  // ✅ Get previously returned items from an invoice
  const getPreviouslyReturnedItems = (invoiceId) => {
    const returns = getReturnsForInvoice(invoiceId);
    const returnedItems = [];
    returns.forEach(sr => {
      const items = parseJsonField(sr.returned_items);
      items.forEach(item => {
        returnedItems.push({
          productId: item.product_id || item.productId,
          productName: item.product_name || item.productName,
          returnQty: item.return_qty || item.returnQty || 0,
          returnDate: sr.returnDate || sr.return_date,
          srId: sr.id
        });
      });
    });
    return returnedItems;
  };

  // ✅ Get remaining quantities for products in an invoice
  const getRemainingQuantities = (invoice) => {
    if (!invoice || !invoice.lines) return {};
    
    const previouslyReturned = getPreviouslyReturnedItems(invoice.id);
    const remaining = {};
    
    invoice.lines.forEach(line => {
      const productId = line.product_id || line.id;
      const originalQty = line.qty || line.quantity || 1;
      const returnedQty = previouslyReturned
        .filter(item => item.productId === productId)
        .reduce((sum, item) => sum + (item.returnQty || 0), 0);
      
      remaining[productId] = Math.max(0, originalQty - returnedQty);
    });
    
    return remaining;
  };

  // ✅ Check if a product can be returned (has remaining quantity)
  const canReturnProduct = (invoice, productId) => {
    const remaining = getRemainingQuantities(invoice);
    return (remaining[productId] || 0) > 0;
  };

  const loadInv = async () => {
    if (!salesArray || salesArray.length === 0) {
      toast('No invoices found');
      return;
    }

    const trimmedId = invId.toUpperCase().trim();
    console.log('🔍 Searching for invoice:', trimmedId);

    const inv = salesArray.find(i => i.id === trimmedId);

    if (!inv) {
      toast(`❌ Invoice ${trimmedId} not found`);
      return;
    }

    console.log('📋 Invoice found:', inv);

    // ✅ Check for existing returns
    const existingReturnsList = getReturnsForInvoice(trimmedId);
    
    if (existingReturnsList.length > 0) {
      // Show existing returns modal
      setExistingReturns(existingReturnsList);
      setShowExistingReturnsModal(true);
      
      // Still load the invoice but show remaining quantities
      setCurrentInv(inv);
      
      let lines = inv.lines || inv.items || inv.details || [];

      if (typeof lines === 'string') {
        try {
          lines = JSON.parse(lines);
        } catch (e) {
          lines = [];
        }
      }

      if (!Array.isArray(lines)) {
        lines = [];
      }

      if (lines.length === 0) {
        toast('⚠️ No items found in this invoice');
        setCurrentInv(null);
        return;
      }

      inv.lines = lines;
      setCurrentInv(inv);

      // ✅ Calculate remaining quantities and set return limits
      const remaining = getRemainingQuantities(inv);
      const qtyMap = {}, cbMap = {}, reasonMap = {}, restockMap = {};
      
      lines.forEach((l, i) => {
        const productId = l.product_id || l.id;
        const maxQty = remaining[productId] || 0;
        qtyMap[i] = maxQty > 0 ? 1 : 0;
        cbMap[i] = maxQty > 0;
        reasonMap[i] = 'DEFECTIVE';
        restockMap[i] = true;
      });

      setReturnQty(qtyMap);
      setChecked(cbMap);
      setReasons(reasonMap);
      setRestock(restockMap);
      setExchangeCart([]);
      
      toast(`✅ Invoice ${inv.id} loaded with ${lines.length} items (${Object.values(remaining).reduce((a, b) => a + b, 0)} items remaining for return)`);
      return;
    }

    // No existing returns - normal flow
    let lines = inv.lines || inv.items || inv.details || [];

    if (typeof lines === 'string') {
      try {
        lines = JSON.parse(lines);
      } catch (e) {
        lines = [];
      }
    }

    if (!Array.isArray(lines)) {
      lines = [];
    }

    console.log('📋 Processed lines:', lines.length);

    if (lines.length === 0) {
      toast('⚠️ No items found in this invoice');
      setCurrentInv(null);
      return;
    }

    inv.lines = lines;
    setCurrentInv(inv);

    const qtyMap = {}, cbMap = {}, reasonMap = {}, restockMap = {};
    lines.forEach((l, i) => {
      const qty = l.qty || l.quantity || 1;
      qtyMap[i] = qty;
      cbMap[i] = false;
      reasonMap[i] = 'DEFECTIVE';
      restockMap[i] = true;
    });

    setReturnQty(qtyMap);
    setChecked(cbMap);
    setReasons(reasonMap);
    setRestock(restockMap);
    setExchangeCart([]);
    setExistingReturns([]);
    toast(`✅ Invoice ${inv.id} loaded with ${lines.length} items`);
  };

  const currentLines = currentInv ? (currentInv.lines || []) : [];
  const remainingQuantities = currentInv ? getRemainingQuantities(currentInv) : {};

  const returnedItems = currentLines.filter((_, i) => checked[i]).map((l, idx) => {
    const actualIdx = currentLines.indexOf(l);
    const qty = l.qty || l.quantity || 1;
    const sellPrice = l.sellPrice || l.sell_price || l.price || 0;
    const productId = l.product_id || l.productId || l.id;
    const maxReturnQty = remainingQuantities[productId] || 0;
    const returnQtyValue = Math.min(+(returnQty[actualIdx] || 1), maxReturnQty);

    return {
      productId: productId,
      productName: l.name || l.product_name || l.productName || 'Unknown Product',
      returnQty: returnQtyValue,
      sellPrice: sellPrice,
      refundAmt: returnQtyValue * sellPrice,
      reason: reasons[actualIdx] || 'DEFECTIVE',
      restock: restock[actualIdx] !== false
    };
  }).filter(item => item.returnQty > 0);

  const retSub = returnedItems.reduce((s, i) => s + (i.refundAmt || 0), 0);
  const netRefund = Math.max(0, retSub - (restockFee || 0));
  const exchVal = exchangeCart.reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0);
  const netDue = returnType === 'EXCHANGE' ? netRefund - exchVal : netRefund;

  const addExch = (p) => {
    setExchangeCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) {
        return prev.map(i => i.id === p.id ? { ...i, qty: Math.min((i.qty || 0) + 1, p.stock || 0) } : i);
      }
      return [...prev, { id: p.id, name: p.name, qty: 1, price: p.sell, maxStock: p.stock || 0 }];
    });
  };

  // ─── UPDATE PRODUCT STOCK DIRECTLY ──────────────────────────
  const updateProductStockDirectly = async (productId, newStock) => {
    try {
      const product = productsArray.find(p => p.id === productId);
      if (!product) {
        console.error(`❌ Product ${productId} not found`);
        return false;
      }

      console.log(`📦 Updating product ${product.id} (${product.name}) stock to ${newStock}`);

      const updateData = {
        code: product.code,
        name: product.name,
        barcode: product.barcode || null,
        brand: product.brand || null,
        model: product.model || null,
        color: product.color || null,
        nature: product.nature || null,
        category: product.category || 'DISPLAY',
        cost: product.cost || 0,
        sell: product.sell || 0,
        stock: newStock,
        reorder_level: product.reorder_level || 5,
        storage: product.storage || null,
        supplier_id: product.supplier_id || null,
        supplier_name: product.supplier_name || null,
        compatible: product.compatible || null,
        margin: product.margin || null,
        active: newStock > 0 ? 1 : 0,
        supplier_warranty: product.supplier_warranty || 'NO WARRANTY',
        customer_warranty: product.customer_warranty || 'NO WARRANTY'
      };

      if (window.api && window.api.updateProduct) {
        const result = await window.api.updateProduct(productId, updateData);
        console.log(`✅ Product ${product.id} updated:`, result);
        return true;
      } else {
        console.error('❌ window.api.updateProduct not available');
        return false;
      }
    } catch (error) {
      console.error(`❌ Error updating product ${productId}:`, error);
      return false;
    }
  };

  // ─── PROCESS RETURN ──────────────────────────────────────────
  const processSR = async () => {
    if (!currentInv || !returnedItems.length) {
      toast('Select items to return');
      return;
    }

    try {
      console.log('📝 Processing return with invoice:', currentInv);
      console.log('📝 Invoice ID:', currentInv.id);

      const sr = {
        id: nextSR(),
        invoiceId: currentInv.id,
        customer: currentInv.customer || 'Unknown',
        mobile: currentInv.mobile || '',
        invoiceDate: currentInv.date,
        returnDate,
        returnType,
        returnedItems,
        exchangeItems: [...exchangeCart],
        returnSubtotal: retSub,
        restockFee: +restockFee,
        netRefund: netRefund,
        exchangeValue: exchVal,
        netBalance: netDue,
        refundMethod,
        refundRef,
        remarks: srRemarks,
        processedBy: user?.username || 'ADMIN',
        createdAt: new Date().toISOString()
      };

      console.log('📝 SR data to save:', sr);

      let updSrs = [...srsArray, sr];
      setSrs(updSrs);

      // ✅ Save return to SQLite
      if (window.api && window.api.createSalesReturn) {
        try {
          const sqliteSR = {
            id: sr.id,
            invoice_id: sr.invoiceId,
            customer: sr.customer || 'Unknown',
            mobile: sr.mobile || null,
            return_date: sr.returnDate || new Date().toISOString().slice(0, 10),
            return_type: sr.returnType || 'REFUND',
            return_subtotal: sr.returnSubtotal || 0,
            restock_fee: sr.restockFee || 0,
            net_refund: sr.netRefund || 0,
            exchange_value: sr.exchangeValue || 0,
            net_balance: sr.netBalance || 0,
            refund_method: sr.refundMethod || 'Cash',
            refund_reference: sr.refundRef || null,
            remarks: sr.remarks || null,
            processed_by: sr.processedBy || 'ADMIN',
            returned_items: JSON.stringify(sr.returnedItems.map(item => ({
              product_id: item.productId || 0,
              product_name: item.productName || 'Unknown',
              return_qty: item.returnQty || 1,
              sell_price: item.sellPrice || 0,
              refund_amount: item.refundAmt || 0,
              reason: item.reason || 'DEFECTIVE',
              restock: item.restock ? 1 : 0
            }))),
            exchange_items: JSON.stringify(sr.exchangeItems.map(item => ({
              product_id: item.id || 0,
              product_name: item.name || 'Unknown',
              qty: item.qty || 1,
              price: item.price || 0
            })))
          };

          if (!sqliteSR.invoice_id) {
            console.error('❌ invoice_id is undefined!');
            throw new Error('invoice_id is required');
          }

          await window.api.createSalesReturn(sqliteSR);
          console.log('✅ Sales return saved to SQLite');
        } catch (sqliteError) {
          console.error('❌ SQLite save failed:', sqliteError);
          console.warn('⚠️ Falling back to localStorage');
          await save(SK.SR, updSrs);
        }
      } else {
        console.log('📝 Saving to localStorage');
        await save(SK.SR, updSrs);
      }

      // ─── UPDATE EACH PRODUCT STOCK DIRECTLY ──────────────
      console.log('📦 Updating product stocks directly...');
      let updatedCount = 0;

      for (const item of returnedItems) {
        const product = productsArray.find(p => p.id === item.productId);
        if (!product) {
          console.warn(`⚠️ Product ${item.productId} not found in product list`);
          continue;
        }

        let newStock = product.stock || 0;

        if (item.restock) {
          newStock += (item.returnQty || 0);
          console.log(`📦 Restocking ${product.name}: +${item.returnQty} (${newStock})`);
        }

        const exchangeItem = exchangeCart.find(e => e.id === item.productId);
        if (exchangeItem) {
          newStock = Math.max(0, newStock - (exchangeItem.qty || 0));
          console.log(`🔄 Exchanging ${product.name}: -${exchangeItem.qty} (${newStock})`);
        }

        const success = await updateProductStockDirectly(product.id, newStock);
        if (success) updatedCount++;
      }

      for (const exchangeItem of exchangeCart) {
        const alreadyUpdated = returnedItems.some(item => item.productId === exchangeItem.id);
        if (!alreadyUpdated) {
          const product = productsArray.find(p => p.id === exchangeItem.id);
          if (product) {
            const newStock = Math.max(0, (product.stock || 0) - (exchangeItem.qty || 0));
            const success = await updateProductStockDirectly(product.id, newStock);
            if (success) updatedCount++;
          }
        }
      }

      console.log(`✅ Updated ${updatedCount} products in database`);

      // ✅ Refresh products from database
      const freshProducts = await window.api.getProducts();
      setProducts(Array.isArray(freshProducts) ? freshProducts : []);
      localStorage.setItem('products', JSON.stringify(freshProducts));

      // ✅ Refresh sales returns
      const freshSrs = await window.api.getSalesReturns() || [];
      const parsedSrs = freshSrs.map(sr => ({
        ...sr,
        invoice_id: sr.invoice_id || sr.invoiceId || '',
        returned_items: parseJsonField(sr.returned_items || sr.returnedItems),
        exchange_items: parseJsonField(sr.exchange_items || sr.exchangeItems)
      }));
      setSrs(Array.isArray(parsedSrs) ? parsedSrs : []);

      toast(`✅ Return ${sr.id} processed — LKR ${netRefund.toFixed(2)} refund`);
      clearSR();
      await refreshData();

      const restockedItems = returnedItems.filter(item => item.restock);
      if (restockedItems.length > 0) {
        const summary = restockedItems.map(item =>
          `${item.productName} (+${item.returnQty})`
        ).join(', ');
        toast(`📦 Stock updated: ${summary}`);
      }

    } catch (error) {
      console.error('Error processing return:', error);
      toast('Error processing return: ' + error.message);
    }
  };

  const refreshData = async () => {
    try {
      if (window.api && window.api.getSalesReturns) {
        const srsData = await window.api.getSalesReturns() || [];
        const parsedSrs = srsData.map(sr => ({
          ...sr,
          invoice_id: sr.invoice_id || sr.invoiceId || '',
          returned_items: parseJsonField(sr.returned_items || sr.returnedItems),
          exchange_items: parseJsonField(sr.exchange_items || sr.exchangeItems)
        }));
        setSrs(Array.isArray(parsedSrs) ? parsedSrs : []);
      }
      if (window.api && window.api.getProducts) {
        const productsData = await window.api.getProducts() || [];
        console.log('🔄 Refreshed products from SQLite:', productsData.length);
        setProducts(Array.isArray(productsData) ? productsData : []);
        localStorage.setItem('products', JSON.stringify(productsData));
      }
      if (window.api && window.api.getSalesInvoices) {
        const salesData = await window.api.getSalesInvoices() || [];
        setSales(Array.isArray(salesData) ? salesData : []);
      }
    } catch (e) {
      console.warn('Error refreshing data:', e);
    }
  };

  const clearSR = () => {
    setCurrentInv(null);
    setInvId('');
    setChecked({});
    setReturnQty({});
    setExchangeCart([]);
    setRestockFee(0);
    setSrRemarks('');
    setRefundRef('');
    setReturnType('REFUND');
    setExistingReturns([]);
    setShowExistingReturnsModal(false);
  };

  const filtHist = srsArray.filter(sr =>
    sr && (
      !histSearch ||
      (sr.id && sr.id.toLowerCase().includes(histSearch.toLowerCase())) ||
      ((sr.invoice_id || sr.invoiceId || '').toLowerCase().includes(histSearch.toLowerCase())) ||
      (sr.customer && sr.customer.toLowerCase().includes(histSearch.toLowerCase()))
    )
  ).reverse();

  const exchProds = productsArray.filter(p =>
    p.active !== false &&
    (p.stock || 0) > 0 &&
    p.name?.toLowerCase().includes(exchSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div>
        <GlassCard title="↩️ Sales Return Center">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            <div>Loading sales returns...</div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Existing Returns Modal ─────────────────────────── */}
      {showExistingReturnsModal && existingReturns.length > 0 && (
        <Modal 
          title={`📋 Existing Returns for Invoice ${invId}`} 
          onClose={() => setShowExistingReturnsModal(false)}
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto', minWidth: 500 }}>
            <p style={{ marginBottom: 16, color: '#64748b' }}>
              This invoice already has {existingReturns.length} return(s). 
              You can return the remaining items below.
            </p>
            
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: '#92400e' }}>⚠️ Previous Returns Summary</div>
              {existingReturns.map((sr, idx) => {
                const items = parseJsonField(sr.returned_items);
                return (
                  <div key={sr.id} style={{ fontSize: 13, marginTop: 8, padding: 8, background: '#fffbeb', borderRadius: 6 }}>
                    <div><strong>{sr.id}</strong> - {sr.returnDate}</div>
                    <div style={{ fontSize: 12, color: '#78350f' }}>
                      {items.map(item => `${item.product_name || 'Unknown'} (×${item.return_qty || 0})`).join(', ') || 'No items'}
                    </div>
                    <div>Refund: LKR {(sr.netRefund || 0).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ background: '#dbeafe', padding: 12, borderRadius: 8 }}>
              <div style={{ fontWeight: 600, color: '#1e40af' }}>📦 Remaining Items Available for Return</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>
                {Object.entries(remainingQuantities).map(([productId, qty]) => {
                  const product = productsArray.find(p => p.id === parseInt(productId));
                  return qty > 0 ? (
                    <div key={productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #bfdbfe' }}>
                      <span>{product?.name || 'Unknown'}</span>
                      <span style={{ fontWeight: 700 }}>{qty} units</span>
                    </div>
                  ) : null;
                }).filter(Boolean)}
                {Object.values(remainingQuantities).every(q => q === 0) && (
                  <div style={{ color: '#dc2626' }}>All items have been fully returned</div>
                )}
              </div>
            </div>
            
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button style={styles.btnOutline} onClick={() => setShowExistingReturnsModal(false)}>
                Close
              </button>
              {Object.values(remainingQuantities).some(q => q > 0) && (
                <button style={{ ...styles.btnPrimary, background: '#0d9488' }} onClick={() => setShowExistingReturnsModal(false)}>
                  Continue with Return
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      <div style={{ background: 'linear-gradient(135deg,#0f172a,#0d9488)', color: '#fff', borderRadius: '24px 24px 0 0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>↩️ Sales Return Center</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Full refund, exchange, or store credit</div>
        </div>
        <span style={{ background: 'rgba(255,255,255,.2)', color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          {nextSR()}
        </span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.3)', borderTop: 'none', borderRadius: '0 0 24px 24px', marginBottom: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div style={styles.grid2}>
          <div style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: '#0f766e' }}>Step 1: Find Sales Invoice</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={invId}
                onChange={e => setInvId(e.target.value)}
                placeholder="e.g. INV00001"
              />
              <button
                style={{ ...styles.btnPrimary, background: '#0d9488', padding: '10px 16px' }}
                onClick={loadInv}
              >
                Load
              </button>
            </div>

            {currentInv && currentLines.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: '#f0fdf9', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>CUSTOMER</div>
                    <div style={{ fontWeight: 700 }}>{currentInv.customer}</div>
                  </div>
                  <div style={{ background: '#f0fdf9', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>INVOICE TOTAL</div>
                    <div style={{ fontWeight: 700 }}>LKR {(currentInv.payable || 0).toFixed(2)}</div>
                  </div>
                </div>
                
                {/* Show remaining quantities info */}
                {Object.values(remainingQuantities).some(q => q > 0) && (
                  <div style={{ background: '#dbeafe', borderRadius: 8, padding: 8, marginBottom: 12, fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>📦 Remaining items available for return:</span>
                    {Object.entries(remainingQuantities).map(([productId, qty]) => {
                      const product = productsArray.find(p => p.id === parseInt(productId));
                      return qty > 0 ? (
                        <span key={productId} style={{ marginLeft: 8 }}>
                          {product?.name} ({qty})
                        </span>
                      ) : null;
                    }).filter(Boolean)}
                  </div>
                )}
                
                <div style={{ fontWeight: 700, marginBottom: 10, color: '#0f766e' }}>Step 2: Select Items to Return</div>
                <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto', borderRadius: 10, border: '1px solid #99f6e4' }}>
                  <table style={{ ...styles.table, minWidth: 580 }}>
                    <thead>
                      <tr style={{ background: '#0f766e', color: '#fff' }}>
                        {['↩️', 'Product', 'Sold', 'Remaining', 'Ret.Qty', 'Unit Price', 'Refund', 'Reason', 'Restock?'].map(h =>
                          <th key={h} style={{ ...styles.th, color: '#fff', background: 'transparent' }}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {currentLines.map((l, i) => {
                        const productId = l.product_id || l.id;
                        const productName = l.name || l.product_name || l.productName || 'Unknown';
                        const qty = l.qty || l.quantity || 1;
                        const sellPrice = l.sellPrice || l.sell_price || l.price || 0;
                        const checkedState = !!checked[i];
                        const maxReturnQty = remainingQuantities[productId] || 0;
                        const returnQtyValue = Math.min(returnQty[i] || 1, maxReturnQty);
                        const canReturn = maxReturnQty > 0;

                        return (
                          <tr key={i} style={{ background: checkedState ? '#f0fdf9' : '', opacity: canReturn ? 1 : 0.4 }}>
                            <td style={styles.td}>
                              <input
                                type="checkbox"
                                checked={checkedState && canReturn}
                                disabled={!canReturn}
                                onChange={e => setChecked(prev => ({ ...prev, [i]: e.target.checked }))}
                              />
                            </td>
                            <td style={styles.td}><strong>{productName}</strong></td>
                            <td style={styles.td}>{qty}</td>
                            <td style={styles.td}>
                              <span style={{ fontWeight: 700, color: canReturn ? '#0f766e' : '#dc2626' }}>
                                {maxReturnQty}
                              </span>
                              {!canReturn && <span style={{ fontSize: 10, color: '#dc2626', marginLeft: 4 }}>✅ Fully Returned</span>}
                            </td>
                            <td style={styles.td}>
                              <input
                                type="number"
                                style={{ ...styles.input, width: 65 }}
                                disabled={!checkedState || !canReturn}
                                value={returnQtyValue}
                                min={1}
                                max={maxReturnQty}
                                onChange={e => setReturnQty(prev => ({ ...prev, [i]: Math.max(1, Math.min(+e.target.value, maxReturnQty)) }))}
                              />
                            </td>
                            <td style={styles.td}>LKR {sellPrice.toFixed(2)}</td>
                            <td style={{ ...styles.td, fontWeight: 700, color: '#0f766e' }}>
                              LKR {checkedState && canReturn ? (returnQtyValue * sellPrice).toFixed(2) : '0.00'}
                            </td>
                            <td style={styles.td}>
                              <select
                                style={{ ...styles.input, fontSize: 11, padding: '4px 6px' }}
                                disabled={!checkedState || !canReturn}
                                value={reasons[i] || 'DEFECTIVE'}
                                onChange={e => setReasons(prev => ({ ...prev, [i]: e.target.value }))}
                              >
                                <option value="DEFECTIVE">Defective</option>
                                <option value="WRONG_ITEM">Wrong Item</option>
                                <option value="CUSTOMER_REQUEST">Cust. Request</option>
                                <option value="EXCHANGE">Exchange</option>
                                <option value="OTHER">Other</option>
                              </select>
                            </td>
                            <td style={styles.td}>
                              <input
                                type="checkbox"
                                checked={restock[i] !== false}
                                disabled={!checkedState || !canReturn}
                                onChange={e => setRestock(prev => ({ ...prev, [i]: e.target.checked }))}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : currentInv ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                <p>No items found in this invoice</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                  The invoice may not have any line items.
                </p>
              </div>
            ) : null}

            {returnType === 'EXCHANGE' && currentInv && currentLines.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: 16, marginTop: 16 }}>
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 10 }}>🔄 Exchange Items</div>
                <input
                  style={styles.input}
                  placeholder="Search products..."
                  value={exchSearch}
                  onChange={e => setExchSearch(e.target.value)}
                />
                <div style={{ border: '1px solid #fcd34d', borderRadius: 8, overflow: 'auto', maxHeight: 180, marginTop: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fef3c7' }}>
                        <th style={{ padding: 6, fontSize: 11 }}>Name</th>
                        <th style={{ padding: 6, fontSize: 11 }}>Price</th>
                        <th style={{ padding: 6, fontSize: 11 }}>Stock</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {exchProds.slice(0, 20).map(p => (
                        <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => addExch(p)}>
                          <td style={{ padding: 8, fontSize: 12 }}>{p.name}</td>
                          <td>LKR {p.sell}</td>
                          <td>{p.stock}</td>
                          <td>
                            <button style={{ ...styles.btnPrimary, padding: '4px 10px', fontSize: 11, background: '#0d9488' }}>
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {exchangeCart.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 13 }}>
                    <span>{item.name}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={item.qty}
                        min={1}
                        max={item.maxStock}
                        onChange={e => setExchangeCart(prev => prev.map((x, j) => j === i ? { ...x, qty: Math.max(1, Math.min(+e.target.value, x.maxStock)) } : x))}
                        style={{ ...styles.input, width: 60 }}
                      />
                      <span style={{ fontWeight: 700, color: '#92400e' }}>LKR {((item.qty || 0) * (item.price || 0)).toFixed(2)}</span>
                      <button style={styles.btnDanger} onClick={() => setExchangeCart(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
              <div style={{ background: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0f766e', marginBottom: 6 }}>Return Subtotal</div>
                <input style={{ ...styles.input, fontWeight: 700, color: '#0f766e' }} readOnly value={retSub.toFixed(2)} />
              </div>
              <div style={{ background: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0f766e', marginBottom: 6 }}>Restock Fee</div>
                <input type="number" style={styles.input} value={restockFee} onChange={e => setRestockFee(+e.target.value)} min={0} />
              </div>
              <div style={{ background: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0f766e', marginBottom: 6 }}>Net Refund</div>
                <input style={{ ...styles.input, fontWeight: 700, color: '#0f766e' }} readOnly value={netRefund.toFixed(2)} />
              </div>
              <div style={{ background: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0f766e', marginBottom: 6 }}>Exchange Value</div>
                <input style={{ ...styles.input, fontWeight: 700, color: '#0f766e' }} readOnly value={exchVal.toFixed(2)} />
              </div>
            </div>

            {returnType === 'EXCHANGE' && (
              <div style={{ background: netDue > 0 ? '#ccfbf1' : netDue < 0 ? '#fee2e2' : '#d1fae5', borderRadius: 10, padding: 14, marginTop: 12, textAlign: 'center', fontWeight: 700, color: netDue > 0 ? '#0f766e' : netDue < 0 ? '#dc2626' : '#065f46' }}>
                {netDue > 0 ? `🔄 Customer owed: LKR ${netDue.toFixed(2)}` : netDue < 0 ? `💳 Customer must pay: LKR ${Math.abs(netDue).toFixed(2)}` : '✅ Even exchange'}
              </div>
            )}
          </div>

          <div style={{ padding: 24, borderLeft: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#0f766e', marginBottom: 12 }}>Return Configuration</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Return Type *">
                <select style={styles.input} value={returnType} onChange={e => setReturnType(e.target.value)}>
                  <option value="REFUND">💵 Cash Refund</option>
                  <option value="EXCHANGE">🔄 Exchange</option>
                  <option value="CREDIT">🎟️ Store Credit</option>
                  <option value="PARTIAL_REFUND">💳 Partial Refund</option>
                </select>
              </Field>
              <Field label="Refund Method">
                <select style={styles.input} value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                  <option>Cash</option>
                  <option>Card Reversal</option>
                  <option>Bank Transfer</option>
                  <option>Store Credit</option>
                </select>
              </Field>
              <Field label="Return Date">
                <input type="date" style={styles.input} value={returnDate} onChange={e => setReturnDate(e.target.value)} />
              </Field>
              <Field label="Refund Reference">
                <input style={styles.input} value={refundRef} onChange={e => setRefundRef(e.target.value)} placeholder="Transaction / Voucher ID" />
              </Field>
              <Field label="Remarks">
                <textarea style={{ ...styles.input, resize: 'vertical' }} rows={3} value={srRemarks} onChange={e => setSrRemarks(e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
              <div style={{ background: '#0d9488', color: '#fff', textAlign: 'center', padding: 12, borderRadius: 10, fontWeight: 700 }}>
                <div style={{ fontSize: 11 }}>Return Amt</div>
                <div style={{ fontSize: 16 }}>{netRefund.toFixed(2)}</div>
              </div>
              <div style={{ background: '#7c3aed', color: '#fff', textAlign: 'center', padding: 12, borderRadius: 10, fontWeight: 700 }}>
                <div style={{ fontSize: 11 }}>Exchange Val</div>
                <div style={{ fontSize: 16 }}>{exchVal.toFixed(2)}</div>
              </div>
              <div style={{ background: '#f59e0b', color: '#fff', textAlign: 'center', padding: 12, borderRadius: 10, fontWeight: 700 }}>
                <div style={{ fontSize: 11 }}>Net Due</div>
                <div style={{ fontSize: 16 }}>{Math.abs(netDue).toFixed(2)}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f766e', marginBottom: 8 }}>📋 Recent Returns</div>
              {srsArray && srsArray.length > 0 ? (
                [...srsArray].reverse().slice(0, 5).map(sr => {
                  const items = parseJsonField(sr.returned_items);
                  const itemsCount = Array.isArray(items) ? items.length : 0;

                  return (
                    <div key={sr.id} style={{ padding: 10, border: '1px solid #99f6e4', borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{sr.id}</strong>
                        <span style={{ color: '#0d9488', fontWeight: 700 }}>LKR {(sr.netRefund || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ color: '#64748b' }}>
                        {sr.customer} | {sr.invoice_id || sr.invoiceId || 'N/A'} | {sr.returnDate} | {itemsCount} items
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: 10, color: '#94a3b8', textAlign: 'center' }}>No recent returns</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: 16, background: 'rgba(224,242,254,0.6)', borderTop: '1px solid rgba(186,230,253,0.8)', flexWrap: 'wrap', borderRadius: '0 0 24px 24px' }}>
          <button style={{ ...styles.btnPrimary, background: '#0d9488' }} onClick={processSR}>
            💾 PROCESS RETURN
          </button>
          <button style={{ ...styles.btnPrimary, background: '#475569' }} onClick={clearSR}>
            🗑️ CLEAR
          </button>
        </div>
      </div>

      <GlassCard title="↩️ Sales Return History">
        <input
          style={{ ...styles.input, marginBottom: 12 }}
          placeholder="Search by SR ID, Invoice, Customer..."
          value={histSearch}
          onChange={e => setHistSearch(e.target.value)}
        />
        {filtHist.length > 0 ? (
          filtHist.map(sr => {
            const items = parseJsonField(sr.returned_items);
            const itemsCount = Array.isArray(items) ? items.length : 0;

            return (
              <div key={sr.id} style={{ ...styles.histItem, cursor: 'pointer' }} onClick={() => setSelectedSR(sr)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ color: '#0f766e' }}>{sr.id}</strong> | {sr.returnDate}
                    <span style={{
                      background: { REFUND: '#d1fae5', EXCHANGE: '#fef3c7', CREDIT: '#ede9fe', PARTIAL_REFUND: '#dbeafe' }[sr.returnType] || '#e2e8f0',
                      color: { REFUND: '#065f46', EXCHANGE: '#92400e', CREDIT: '#5b21b6', PARTIAL_REFUND: '#1e40af' }[sr.returnType] || '#475569',
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      marginLeft: 8
                    }}>
                      {sr.returnType}
                    </span>
                  </div>
                  <strong style={{ color: '#0d9488' }}>LKR {(sr.netRefund || 0).toFixed(2)}</strong>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                  👤 {sr.customer} | 📋 Invoice: {sr.invoice_id || sr.invoiceId || 'N/A'} | {itemsCount} items | By: {sr.processedBy}
                </div>
              </div>
            );
          })
        ) : (
          <p style={{ textAlign: 'center', color: '#94a3b8' }}>No sales return records yet</p>
        )}
      </GlassCard>

      {selectedSR && (
        <Modal title={`Sales Return ${selectedSR.id}`} onClose={() => setSelectedSR(null)}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', minWidth: 520 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><strong>Invoice</strong><div>{selectedSR.invoice_id || selectedSR.invoiceId || 'N/A'}</div></div>
              <div><strong>Return Date</strong><div>{selectedSR.returnDate}</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><strong>Customer</strong><div>{selectedSR.customer}</div></div>
              <div><strong>Return Type</strong><div>{selectedSR.returnType}</div></div>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>📦 Returned Items</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Refund</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Restock</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const items = parseJsonField(selectedSR.returned_items);

                    if (!Array.isArray(items) || items.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} style={styles.emptyTd}>No returned items</td>
                        </tr>
                      );
                    }

                    return items.map((item, i) => (
                      <tr key={i}>
                        <td style={styles.td}>{item.product_name || 'Unknown'}</td>
                        <td style={styles.td}>{item.return_qty || 0}</td>
                        <td style={styles.td}>LKR {(item.refund_amount || 0).toFixed(2)}</td>
                        <td style={styles.td}>{item.reason || 'N/A'}</td>
                        <td style={styles.td}>{item.restock ? 'Yes' : 'No'}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {(() => {
              const exchangeItems = parseJsonField(selectedSR.exchange_items);
              if (Array.isArray(exchangeItems) && exchangeItems.length > 0) {
                return (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>🔄 Exchange Items</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Product</th>
                          <th style={styles.th}>Qty</th>
                          <th style={styles.th}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exchangeItems.map((item, i) => (
                          <tr key={i}>
                            <td style={styles.td}>{item.product_name || item.name || 'Unknown'}</td>
                            <td style={styles.td}>{item.qty || 0}</td>
                            <td style={styles.td}>LKR {(item.price || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontWeight: 700 }}>
              <div>Return Subtotal: LKR {(selectedSR.returnSubtotal || 0).toFixed(2)}</div>
              <div>Restock Fee: LKR {(selectedSR.restockFee || 0).toFixed(2)}</div>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontWeight: 700 }}>
              <div>Net Refund: LKR {(selectedSR.netRefund || 0).toFixed(2)}</div>
              <div>Net Balance: LKR {(selectedSR.netBalance || 0).toFixed(2)}</div>
            </div>
            {selectedSR.remarks && (
              <div style={{ marginTop: 16 }}>
                <strong>Notes</strong>
                <div>{selectedSR.remarks}</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}