import { SK } from './constants';

export const load = (key, def) => { 
  try { 
    return JSON.parse(localStorage.getItem(key)) ?? def; 
  } catch { 
    return def; 
  } 
};

export const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

export const toast = (msg) => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 26px;border-radius:40px;font-size:13px;z-index:9999;font-family:inherit;box-shadow:0 8px 32px rgba(0,0,0,.25);backdrop-filter:blur(8px);background:rgba(30,41,59,0.9);';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
};

export const initializeDemoData = () => {
  if (!load(SK.PRODUCTS, null)) {
    save(SK.PRODUCTS, [
      { 
        id: 1, 
        code: 'DISP152', 
        barcode: 'MPSDISP000144', 
        name: 'ITEL 16 PIN DISPLAY', 
        brand: 'ITEL', 
        model: 'ITEL 16 PIN', 
        color: '', 
        nature: 'ITEL DIS', 
        category: 'DISPLAY', 
        cost: 220, 
        sell: 450, 
        margin: 104.5, 
        stock: 52, 
        reorderLevel: 10, 
        storage: 'SMALL 22', 
        compatible: ['ITEL 16 PIN'], 
        supplierWarranty: 'NO WARRANTY', 
        customerWarranty: 'NO WARRANTY', 
        active: true,
        supplierId: 'SUP00001',
        supplierName: 'TRANS ASIA'
      },
      { 
        id: 2, 
        code: 'DISP2', 
        barcode: 'MPSDISP000002', 
        name: 'RM 13C YAFY METAL', 
        brand: 'REDMI', 
        model: 'RM 13C', 
        color: '', 
        nature: 'RM YAFY DIS', 
        category: 'DISPLAY', 
        cost: 500, 
        sell: 800, 
        margin: 60, 
        stock: 12, 
        reorderLevel: 5, 
        storage: 'YELLOW 1', 
        compatible: ['REDMI 13C'], 
        supplierWarranty: '7 DAYS', 
        customerWarranty: '7 DAYS', 
        active: true,
        supplierId: 'SUP00001',
        supplierName: 'TRANS ASIA'
      },
      { 
        id: 3, 
        code: 'IP15-DISP', 
        barcode: 'MPSIP15', 
        name: 'iPhone 15 OLED Display', 
        brand: 'APPLE', 
        model: 'IP15', 
        color: 'BLACK', 
        nature: 'IP DIS', 
        category: 'DISPLAY', 
        cost: 9800, 
        sell: 12500, 
        margin: 27.55, 
        stock: 3, 
        reorderLevel: 5, 
        storage: 'RACK A1', 
        compatible: ['iPhone 15', 'iPhone 15 Plus'], 
        supplierWarranty: '14 DAYS', 
        customerWarranty: '30 DAYS', 
        active: true,
        supplierId: 'SUP00002',
        supplierName: 'APPLE SUPPLIER'
      },
    ]);
  }
  
  if (!load(SK.SUPPLIERS, null)) {
    save(SK.SUPPLIERS, [
      { id: 'SUP00001', name: 'TRANS ASIA', phone: '0112345678', address: 'Colombo', active: true },
      { id: 'SUP00002', name: 'APPLE SUPPLIER', phone: '0112345679', address: 'Negombo', active: true }
    ]);
  }
  
  if (!load(SK.GRNS, null)) {
    save(SK.GRNS, [{ 
      id: 'PUR000001', 
      supplierId: 'SUP00001', 
      supplierName: 'TRANS ASIA', 
      date: new Date().toISOString().slice(0, 10), 
      lines: [{ 
        id: 1, 
        name: 'ITEL 16 PIN DISPLAY', 
        code: 'DISP152', 
        qty: 10, 
        costPrice: 220, 
        sellPrice: 450, 
        total: 2200 
      }], 
      subTotal: 2200, 
      discount: 0, 
      netTotal: 2200, 
      settled: true, 
      createdBy: 'ADMIN' 
    }]);
  }
  
  if (!load(SK.SALES, null)) {
    save(SK.SALES, [{ 
      id: 'INV00001', 
      date: new Date().toISOString().slice(0, 10), 
      customer: 'WALK-IN', 
      mobile: '0771234567', 
      address: '', 
      lines: [
        { id: 1, name: 'ITEL 16 PIN DISPLAY', qty: 2, sellPrice: 450, total: 900 }, 
        { id: 2, name: 'RM 13C YAFY METAL', qty: 1, sellPrice: 800, total: 800 }
      ], 
      subtotal: 1700, 
      discount: 0, 
      payable: 1700, 
      paid: 1700, 
      due: 0, 
      method: 'Cash', 
      reference: '', 
      remarks: '' 
    }]);
  }
  
  if (!load(SK.JOBS, null)) {
    save(SK.JOBS, []);
  }
  
  if (!load(SK.BILLED, null)) {
    save(SK.BILLED, []);
  }
  
  if (!load(SK.WORKERS, null)) {
    save(SK.WORKERS, [{ 
      id: Date.now(), 
      name: 'Demo Worker', 
      username: 'worker1', 
      password: '123', 
      role: 'user', 
      active: true, 
      joinedDate: new Date().toISOString().slice(0, 10) 
    }]);
  }
  
  if (!load(SK.DAILY_BALANCES, null)) {
    save(SK.DAILY_BALANCES, {});
  }
  
  if (!load(SK.CREDITS, null)) {
    save(SK.CREDITS, []);
  }
};

export const STORAGE = SK;
export const loadData = load;
export const saveData = save;
export const generateOrderId = (prefix = 'ORD', length = 6) => {
  const num = Math.floor(Math.random() * 1000000);
  return prefix + String(num).padStart(length, '0');
};