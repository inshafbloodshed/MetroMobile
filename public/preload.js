// public/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('🔌 Preload script loaded');

contextBridge.exposeInMainWorld('api', {
    // ─── Suppliers ───
    getSuppliers: (activeOnly = true) => ipcRenderer.invoke('db:getSuppliers', activeOnly),
    getSupplier: (id) => ipcRenderer.invoke('db:getSupplier', id),
    createSupplier: (supplier) => ipcRenderer.invoke('db:createSupplier', supplier),
    updateSupplier: (id, data) => ipcRenderer.invoke('db:updateSupplier', id, data),

    // ─── Products ───
    getProducts: (activeOnly = true) => ipcRenderer.invoke('db:getProducts', activeOnly),
    getProduct: (id) => ipcRenderer.invoke('db:getProduct', id),
    createProduct: (product) => ipcRenderer.invoke('db:createProduct', product),
    updateProduct: (id, product) => ipcRenderer.invoke('db:updateProduct', id, product),
    getProductByCode: (code) => ipcRenderer.invoke('db:getProductByCode', code),

    // ─── GRNs ───
    getGRNs: () => ipcRenderer.invoke('db:getGRNs'),
    createGRN: (grn) => ipcRenderer.invoke('db:createGRN', grn),
    getNextGRN: () => ipcRenderer.invoke('db:getNextGRN'),

    // ─── PURCHASE RETURNS ───
    getReturns: () => ipcRenderer.invoke('db:getReturns'),
    getReturn: (id) => ipcRenderer.invoke('db:getReturn', id),
    createReturn: (returnData) => ipcRenderer.invoke('db:createReturn', returnData),
    getNextReturn: () => ipcRenderer.invoke('db:getNextReturn'),

    // ─── Sales Invoices ───
    getSalesInvoices: () => ipcRenderer.invoke('db:getSalesInvoices'),
    createSalesInvoice: (invoice) => ipcRenderer.invoke('db:createSalesInvoice', invoice),
    updateSalesInvoice: (id, invoice) => ipcRenderer.invoke('db:updateSalesInvoice', id, invoice),

    // ─── Sales Returns ───
    getSalesReturns: () => ipcRenderer.invoke('db:getSalesReturns'),
    createSalesReturn: (returnData) => ipcRenderer.invoke('db:createSalesReturn', returnData),

    // ─── Customers ───
    getCustomers: () => ipcRenderer.invoke('db:getCustomers'),
    createCustomer: (customer) => ipcRenderer.invoke('db:createCustomer', customer),
    searchCustomers: (term) => ipcRenderer.invoke('db:searchCustomers', term),

    // ─── Credits ───
    getCredits: () => ipcRenderer.invoke('db:getCredits'),
    getCredit: (id) => ipcRenderer.invoke('db:getCredit', id),
    createCredit: (credit) => ipcRenderer.invoke('db:createCredit', credit),
    updateCredit: (credit) => ipcRenderer.invoke('db:updateCredit', credit),
    deleteCredit: (id) => ipcRenderer.invoke('db:deleteCredit', id),
    getCreditsByCustomer: (customerName) => ipcRenderer.invoke('db:getCreditsByCustomer', customerName),

    // ─── Workers ───
    getWorkers: () => ipcRenderer.invoke('db:getWorkers'),
    getWorkerByUsername: (username) => ipcRenderer.invoke('db:getWorkerByUsername', username),

    // ─── Migration ───
    migrateFromLocalStorage: (data) => ipcRenderer.invoke('db:migrateFromLocalStorage', data),

    // ─── Print ───
    printHtml: (htmlContent) => ipcRenderer.invoke('print:html', htmlContent),
});

console.log('✅ API exposed to renderer process');