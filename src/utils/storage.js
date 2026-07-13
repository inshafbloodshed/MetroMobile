// src/utils/storage.js
export const SK = {
    PRODUCTS: 'products',
    SUPPLIERS: 'suppliers',
    GRNS: 'grns',
    RETURNS: 'returns',
    WORKERS: 'workers',
    BILLED: 'billed',
    JOBS: 'jobs',
    SALES: 'sales',
    EXP: 'exp',
    CREDITS: 'credits',
    CUSTOMERS: 'customers',
    DAILY_BALANCES: 'dailyBalances',
    SR: 'sr',
    CURRENT_USER: 'currentUser'
};

// Toast notification function
let toastFn = (msg) => alert(msg);

export const setToastFunction = (fn) => {
    toastFn = fn;
};

export const toast = (message) => {
    if (typeof toastFn === 'function') {
        toastFn(message);
    } else {
        console.log('Toast:', message);
    }
};

// Check if API is available
const isApiAvailable = () => {
    return typeof window !== 'undefined' && window.api;
};

// Load function - fetches from database via IPC
export const load = async (key, defaultValue = null) => {
    try {
        if (!isApiAvailable()) {
            console.warn('window.api not available, using localStorage fallback');
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        }

        let result;
        switch (key) {
            case SK.PRODUCTS:
                result = await window.api.getProducts(false);
                break;
            case SK.SUPPLIERS:
                result = await window.api.getSuppliers();
                break;
            case SK.GRNS:
                result = await window.api.getGRNs();
                break;
            case SK.RETURNS:
                result = await window.api.getReturns();
                console.log('📋 Loaded returns from DB:', result?.length || 0);
                break;
            case SK.WORKERS:
                const workersData = localStorage.getItem(key);
                result = workersData ? JSON.parse(workersData) : defaultValue;
                break;
            default:
                const data = localStorage.getItem(key);
                result = data ? JSON.parse(data) : defaultValue;
        }
        
        console.log(`📊 Loaded ${key}:`, Array.isArray(result) ? `${result.length} items` : 'not an array');
        return result || defaultValue;
    } catch (error) {
        console.error(`Error loading ${key}:`, error);
        // Fallback to localStorage
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch {
            return defaultValue;
        }
    }
};

// Save function - saves to database via IPC
export const save = async (key, data) => {
    try {
        console.log(`💾 Saving ${key}...`, data);
        
        if (!isApiAvailable()) {
            console.warn('window.api not available, using localStorage fallback');
            localStorage.setItem(key, JSON.stringify(data));
            return data;
        }

        switch (key) {
            case SK.PRODUCTS:
                if (Array.isArray(data)) {
                    console.log(`💾 Syncing ${data.length} products to database...`);
                    const existingProducts = await window.api.getProducts(false);
                    const existingCodes = new Set(existingProducts.map(p => p.code));
                    
                    for (const product of data) {
                        try {
                            const existing = await window.api.getProductByCode(product.code);
                            if (existing && existing.id) {
                                await window.api.updateProduct(existing.id, product);
                            } else {
                                await window.api.createProduct(product);
                            }
                        } catch (e) {
                            console.error(`Error saving product ${product.name}:`, e);
                        }
                    }
                    localStorage.setItem(key, JSON.stringify(data));
                    return data;
                }
                break;
                
            case SK.SUPPLIERS:
                if (Array.isArray(data)) {
                    for (const supplier of data) {
                        try {
                            const existing = await window.api.getSupplier(supplier.id);
                            if (existing) {
                                await window.api.updateSupplier(supplier.id, supplier);
                            } else {
                                await window.api.createSupplier(supplier);
                            }
                        } catch (e) {
                            console.error(`Error saving supplier ${supplier.name}:`, e);
                        }
                    }
                    localStorage.setItem(key, JSON.stringify(data));
                    return data;
                }
                break;
                
            case SK.RETURNS:
                // Handle purchase returns
                if (data && typeof data === 'object' && data.id) {
                    console.log('📝 Saving purchase return to database:', data.id);
                    
                    // Save to database via IPC
                    const result = await window.api.createReturn(data);
                    console.log('✅ Purchase return saved to database:', result);
                    
                    // Also save to localStorage as backup
                    try {
                        const existingReturns = JSON.parse(localStorage.getItem('returns') || '[]');
                        // Check if already exists
                        const exists = existingReturns.some(r => r.id === data.id);
                        if (!exists) {
                            const updatedReturns = [...existingReturns, data];
                            localStorage.setItem('returns', JSON.stringify(updatedReturns));
                        }
                    } catch (e) {
                        console.warn('Could not save to localStorage backup:', e);
                    }
                    
                    return { success: true, id: data.id };
                } else if (Array.isArray(data)) {
                    // If saving an array, save each return individually
                    for (const ret of data) {
                        try {
                            await window.api.createReturn(ret);
                        } catch (e) {
                            console.error(`Error saving return ${ret.id}:`, e);
                        }
                    }
                    localStorage.setItem(key, JSON.stringify(data));
                    return data;
                }
                break;
                
            case SK.WORKERS:
                localStorage.setItem(key, JSON.stringify(data));
                break;
                
            case SK.GRNS:
                if (!Array.isArray(data)) {
                    await window.api.createGRN(data);
                    return data;
                }
                break;
                
            default:
                localStorage.setItem(key, JSON.stringify(data));
        }
        return data;
    } catch (error) {
        console.error(`Error saving ${key}:`, error);
        toast(`Error saving ${key}`);
        // Fallback to localStorage
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Fallback save failed:', e);
        }
        return data;
    }
};

// Clear function
export const clear = (key) => {
    localStorage.removeItem(key);
};

// Force refresh data from database
export const refreshData = async (key) => {
    if (!isApiAvailable()) {
        return null;
    }
    
    try {
        let result;
        switch (key) {
            case SK.PRODUCTS:
                result = await window.api.getProducts(false);
                break;
            case SK.SUPPLIERS:
                result = await window.api.getSuppliers();
                break;
            case SK.GRNS:
                result = await window.api.getGRNs();
                break;
            case SK.RETURNS:
                result = await window.api.getReturns();
                console.log('📋 Refreshed returns:', result?.length || 0);
                break;
            default:
                return null;
        }
        
        // Also update localStorage backup
        localStorage.setItem(key, JSON.stringify(result));
        return result;
    } catch (error) {
        console.error(`Error refreshing ${key}:`, error);
        return null;
    }
};

// Initialize default users
export const initializeDefaultUsers = () => {
    try {
        const existingWorkers = localStorage.getItem(SK.WORKERS);
        if (existingWorkers) {
            const workers = JSON.parse(existingWorkers);
            if (workers && workers.length > 0) {
                console.log('✅ Workers already exist');
                return;
            }
        }

        const defaultUsers = [
            {
                id: Date.now(),
                name: 'Metro Admin',
                username: 'Metroadd',
                password: 'Metro123',
                role: 'admin',
                active: true,
                joinedDate: new Date().toISOString().slice(0, 10),
                permissions: {
                    salesInvoice: true,
                    salesReturn: true,
                    productCatalog: true,
                    repairBilling: true,
                    viewCostPrice: true
                }
            },
            {
                id: Date.now() + 1,
                name: 'Demo Worker',
                username: 'worker1',
                password: '123',
                role: 'user',
                active: true,
                joinedDate: new Date().toISOString().slice(0, 10),
                permissions: {
                    salesInvoice: true,
                    salesReturn: true,
                    productCatalog: true,
                    viewCostPrice: false,
                    repairBilling: true
                }
            }
        ];

        localStorage.setItem(SK.WORKERS, JSON.stringify(defaultUsers));
        console.log('✅ Default users created');
    } catch (error) {
        console.error('Error initializing default users:', error);
    }
};

// Initialize demo data
export const initializeDemoData = async () => {
    console.log('📦 Initializing demo data...');
    
    try {
        initializeDefaultUsers();

        if (!isApiAvailable()) {
            console.log('✅ API not available, skipping database initialization');
            return { success: true, message: 'Demo users initialized in localStorage' };
        }

        const existingProducts = await window.api.getProducts();
        if (existingProducts && existingProducts.length > 0) {
            console.log('✅ Data already exists, skipping initialization');
            return { success: true, message: 'Data already exists' };
        }

        const suppliers = [
            { id: 'SUP00001', name: 'ABC ELECTRONICS', phone: '011-2345678', address: 'Colombo 01', active: 1 },
            { id: 'SUP00002', name: 'XYZ MOBILE SUPPLIES', phone: '011-8765432', address: 'Colombo 02', active: 1 },
            { id: 'SUP00003', name: 'TECH PARTS LTD', phone: '011-3456789', address: 'Colombo 03', active: 1 },
        ];

        for (const supplier of suppliers) {
            await window.api.createSupplier(supplier);
        }
        console.log('✅ Sample suppliers created');

        const products = [
            { 
                code: 'IPH-DIS-001', 
                name: 'iPhone 12 Display', 
                brand: 'Apple', 
                model: 'iPhone 12', 
                category: 'DISPLAY',
                cost: 12000, 
                sell: 15000, 
                stock: 10, 
                reorder_level: 5,
                supplier_id: 'SUP00001',
                supplier_name: 'ABC ELECTRONICS',
                supplier_warranty: '30 DAYS',
                customer_warranty: '14 DAYS',
                active: 1
            },
            { 
                code: 'SAM-BAT-001', 
                name: 'Samsung S21 Battery', 
                brand: 'Samsung', 
                model: 'S21', 
                category: 'BATTERY',
                cost: 5000, 
                sell: 7500, 
                stock: 15, 
                reorder_level: 5,
                supplier_id: 'SUP00002',
                supplier_name: 'XYZ MOBILE SUPPLIES',
                supplier_warranty: '14 DAYS',
                customer_warranty: '7 DAYS',
                active: 1
            },
            { 
                code: 'IPH-CHG-001', 
                name: 'iPhone 15 Charger', 
                brand: 'Apple', 
                model: 'iPhone 15', 
                category: 'CHARGER',
                cost: 3000, 
                sell: 4500, 
                stock: 20, 
                reorder_level: 10,
                supplier_id: 'SUP00001',
                supplier_name: 'ABC ELECTRONICS',
                supplier_warranty: '30 DAYS',
                customer_warranty: '14 DAYS',
                active: 1
            },
            { 
                code: 'OPP-DIS-001', 
                name: 'Oppo Reno Display', 
                brand: 'Oppo', 
                model: 'Reno', 
                category: 'DISPLAY',
                cost: 8000, 
                sell: 10000, 
                stock: 5, 
                reorder_level: 3,
                supplier_id: 'SUP00003',
                supplier_name: 'TECH PARTS LTD',
                supplier_warranty: '14 DAYS',
                customer_warranty: '7 DAYS',
                active: 1
            },
            { 
                code: 'SAM-DIS-001', 
                name: 'Samsung A52 Display', 
                brand: 'Samsung', 
                model: 'A52', 
                category: 'DISPLAY',
                cost: 10000, 
                sell: 13000, 
                stock: 3, 
                reorder_level: 5,
                supplier_id: 'SUP00002',
                supplier_name: 'XYZ MOBILE SUPPLIES',
                supplier_warranty: '14 DAYS',
                customer_warranty: '7 DAYS',
                active: 1
            },
        ];

        for (const product of products) {
            await window.api.createProduct(product);
        }
        console.log('✅ Sample products created');

        console.log('🎉 Demo data initialization complete!');
        return { success: true, message: 'Demo data initialized successfully' };
    } catch (error) {
        console.error('❌ Error initializing demo data:', error);
        return { success: false, message: error.message };
    }
};

// Get current user
export const getCurrentUser = () => {
    try {
        const user = localStorage.getItem(SK.CURRENT_USER);
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
};

// Set current user
export const setCurrentUser = (user) => {
    localStorage.setItem(SK.CURRENT_USER, JSON.stringify(user));
};

// Clear current user
export const clearCurrentUser = () => {
    localStorage.removeItem(SK.CURRENT_USER);
};