// src/database/db.js
import { load, save, SK } from '../utils/storage';
import { initializeDemoData } from '../utils/storage';

let isElectron = false;

// Detect if running in Electron
try {
    isElectron = window && window.electronAPI ? true : false;
} catch (e) {
    isElectron = false;
}

// SQLite Database Operations
export const sqliteOps = {
    // Products
    getProducts: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.products.getAll();
        }
        return load(SK.PRODUCTS, []);
    },

    createProduct: async (product) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.products.create(product);
        }
        const products = load(SK.PRODUCTS, []);
        const newProduct = { 
            ...product, 
            id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1 
        };
        products.push(newProduct);
        save(SK.PRODUCTS, products);
        return newProduct;
    },

    updateProduct: async (product) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.products.update(product);
        }
        const products = load(SK.PRODUCTS, []);
        const index = products.findIndex(p => p.id === product.id);
        if (index !== -1) {
            products[index] = product;
            save(SK.PRODUCTS, products);
        }
        return product;
    },

    deleteProduct: async (id) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.products.delete(id);
        }
        const products = load(SK.PRODUCTS, []);
        const filtered = products.filter(p => p.id !== id);
        save(SK.PRODUCTS, filtered);
        return { success: true };
    },

    searchProducts: async (searchTerm) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.products.search(searchTerm);
        }
        const products = load(SK.PRODUCTS, []);
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    },

    updateProductStock: async (id, quantity) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.products.updateStock(id, quantity);
        }
        const products = load(SK.PRODUCTS, []);
        const product = products.find(p => p.id === id);
        if (product) {
            product.stock += quantity;
            save(SK.PRODUCTS, products);
        }
        return product;
    },

    // Suppliers
    getSuppliers: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.suppliers.getAll();
        }
        return load(SK.SUPPLIERS, []);
    },

    createSupplier: async (supplier) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.suppliers.create(supplier);
        }
        const suppliers = load(SK.SUPPLIERS, []);
        supplier.id = `SUP${String(suppliers.length + 1).padStart(5, '0')}`;
        suppliers.push(supplier);
        save(SK.SUPPLIERS, suppliers);
        return supplier;
    },

    updateSupplier: async (supplier) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.suppliers.update(supplier);
        }
        const suppliers = load(SK.SUPPLIERS, []);
        const index = suppliers.findIndex(s => s.id === supplier.id);
        if (index !== -1) {
            suppliers[index] = supplier;
            save(SK.SUPPLIERS, suppliers);
        }
        return supplier;
    },

    deleteSupplier: async (id) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.suppliers.delete(id);
        }
        const suppliers = load(SK.SUPPLIERS, []);
        const filtered = suppliers.filter(s => s.id !== id);
        save(SK.SUPPLIERS, filtered);
        return { success: true };
    },

    // Sales
    getSales: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.sales.getAll();
        }
        return load(SK.SALES, []);
    },

    getSaleById: async (id) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.sales.getById(id);
        }
        const sales = load(SK.SALES, []);
        return sales.find(s => s.id === id);
    },

    createSale: async (sale) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.sales.create(sale);
        }
        const sales = load(SK.SALES, []);
        sale.id = `INV${String(sales.length + 1).padStart(5, '0')}`;
        sales.push(sale);
        save(SK.SALES, sales);
        
        // Update product stock
        const products = load(SK.PRODUCTS, []);
        sale.lines.forEach(line => {
            const product = products.find(p => p.id === line.id);
            if (product) {
                product.stock -= line.qty;
            }
        });
        save(SK.PRODUCTS, products);
        return sale;
    },

    getSalesByCustomer: async (customerName) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.sales.getByCustomer(customerName);
        }
        const sales = load(SK.SALES, []);
        return sales.filter(s => s.customer && s.customer.toLowerCase().includes(customerName.toLowerCase()));
    },

    // Workers
    getWorkers: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.workers.getAll();
        }
        return load(SK.WORKERS, []);
    },

    createWorker: async (worker) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.workers.create(worker);
        }
        const workers = load(SK.WORKERS, []);
        worker.id = Date.now();
        workers.push(worker);
        save(SK.WORKERS, workers);
        return worker;
    },

    updateWorker: async (worker) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.workers.update(worker);
        }
        const workers = load(SK.WORKERS, []);
        const index = workers.findIndex(w => w.id === worker.id);
        if (index !== -1) {
            workers[index] = worker;
            save(SK.WORKERS, workers);
        }
        return worker;
    },

    deleteWorker: async (id) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.workers.delete(id);
        }
        const workers = load(SK.WORKERS, []);
        const filtered = workers.filter(w => w.id !== id);
        save(SK.WORKERS, filtered);
        return { success: true };
    },

    // GRNs
    getGRNs: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.grns.getAll();
        }
        return load(SK.GRNS, []);
    },

    getGRNById: async (id) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.grns.getById(id);
        }
        const grns = load(SK.GRNS, []);
        return grns.find(g => g.id === id);
    },

    createGRN: async (grn) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.grns.create(grn);
        }
        const grns = load(SK.GRNS, []);
        const id = `PUR${String(grns.length + 1).padStart(6, '0')}`;
        grn.id = id;
        grns.push(grn);
        save(SK.GRNS, grns);
        
        // Update product stock
        const products = load(SK.PRODUCTS, []);
        grn.lines.forEach(line => {
            const product = products.find(p => p.id === line.id);
            if (product) {
                product.stock += line.qty;
                product.cost = line.costPrice;
                product.sell = line.sellPrice;
            }
        });
        save(SK.PRODUCTS, products);
        return grn;
    },

    // Customers
    getCustomers: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.customers.getAll();
        }
        return load(SK.CUSTOMERS, []);
    },

    createCustomer: async (customer) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.customers.create(customer);
        }
        const customers = load(SK.CUSTOMERS, []);
        customer.id = customers.length + 1;
        customers.push(customer);
        save(SK.CUSTOMERS, customers);
        return customer;
    },

    searchCustomers: async (searchTerm) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.customers.search(searchTerm);
        }
        const customers = load(SK.CUSTOMERS, []);
        return customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.mobile || '').includes(searchTerm)
        );
    },

    // Expenses
    getExpenses: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.expenses.getAll();
        }
        return load(SK.EXP, []);
    },

    createExpense: async (expense) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.expenses.create(expense);
        }
        const expenses = load(SK.EXP, []);
        expense.id = expenses.length + 1;
        expenses.push(expense);
        save(SK.EXP, expenses);
        return expense;
    },

    deleteExpense: async (id) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.expenses.delete(id);
        }
        const expenses = load(SK.EXP, []);
        const filtered = expenses.filter(e => e.id !== id);
        save(SK.EXP, filtered);
        return { success: true };
    },

    // Jobs
    getJobs: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.jobs.getAll();
        }
        return load(SK.JOBS, []);
    },

    createJob: async (job) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.jobs.create(job);
        }
        const jobs = load(SK.JOBS, []);
        job.id = jobs.length + 1;
        job.orderId = `ORD${String(jobs.length + 1).padStart(6, '0')}`;
        jobs.push(job);
        save(SK.JOBS, jobs);
        return job;
    },

    updateJob: async (job) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.jobs.update(job);
        }
        const jobs = load(SK.JOBS, []);
        const index = jobs.findIndex(j => j.id === job.id);
        if (index !== -1) {
            jobs[index] = job;
            save(SK.JOBS, jobs);
        }
        return job;
    },

    deleteJob: async (id) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.jobs.delete(id);
        }
        const jobs = load(SK.JOBS, []);
        const filtered = jobs.filter(j => j.id !== id);
        save(SK.JOBS, filtered);
        return { success: true };
    },

    // Credits
    getCredits: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.credits.getAll();
        }
        return load(SK.CREDITS, []);
    },

    createCredit: async (credit) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.credits.create(credit);
        }
        const credits = load(SK.CREDITS, []);
        credit.id = `CR_${credit.invoiceId}`;
        credits.push(credit);
        save(SK.CREDITS, credits);
        return credit;
    },

    updateCredit: async (credit) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.credits.update(credit);
        }
        const credits = load(SK.CREDITS, []);
        const index = credits.findIndex(c => c.id === credit.id);
        if (index !== -1) {
            credits[index] = credit;
            save(SK.CREDITS, credits);
        }
        return credit;
    },

    getCreditsByCustomer: async (customerName) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.credits.getByCustomer(customerName);
        }
        const credits = load(SK.CREDITS, []);
        return credits.filter(c => c.customerName && c.customerName.toLowerCase().includes(customerName.toLowerCase()));
    },

    // Daily Balances
    getDailyBalances: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.balances.getAll();
        }
        return load(SK.DAILY_BALANCES, {});
    },

    saveDailyBalance: async (balance) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.balances.save(balance);
        }
        const balances = load(SK.DAILY_BALANCES, {});
        balances[balance.date] = balance;
        save(SK.DAILY_BALANCES, balances);
        return balance;
    },

    getBalanceByDate: async (date) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.balances.getByDate(date);
        }
        const balances = load(SK.DAILY_BALANCES, {});
        return balances[date] || null;
    },

    // Returns (Purchase Returns)
    getReturns: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.returns.getAll();
        }
        return load(SK.RETURNS, []);
    },

    createReturn: async (returnData) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.returns.create(returnData);
        }
        const returns = load(SK.RETURNS, []);
        returnData.id = `RTN${String(returns.length + 1).padStart(6, '0')}`;
        returns.push(returnData);
        save(SK.RETURNS, returns);
        return returnData;
    },

    // Billed Repairs
    getBilled: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.billed.getAll();
        }
        return load(SK.BILLED, []);
    },

    createBilled: async (bill) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.billed.create(bill);
        }
        const billed = load(SK.BILLED, []);
        bill.id = `BILL_${bill.orderId}`;
        billed.push(bill);
        save(SK.BILLED, billed);
        return bill;
    },

    // Sales Returns
    getSalesReturns: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.salesReturns.getAll();
        }
        return load(SK.SR, []);
    },

    createSalesReturn: async (returnData) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.salesReturns.create(returnData);
        }
        const returns = load(SK.SR, []);
        returnData.id = `SR${String(returns.length + 1).padStart(5, '0')}`;
        returns.push(returnData);
        save(SK.SR, returns);
        return returnData;
    },

    // Reports
    getDailyReport: async (date) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.reports.daily(date);
        }
        const sales = load(SK.SALES, []);
        const expenses = load(SK.EXP, []);
        const billed = load(SK.BILLED, []);
        
        const daySales = sales.filter(s => s.date === date);
        const dayExpenses = expenses.filter(e => e.date === date);
        const dayBilled = billed.filter(b => b.billedDate === date);
        
        return {
            date,
            sales: daySales,
            expenses: dayExpenses,
            billed: dayBilled,
            totalSales: daySales.reduce((sum, s) => sum + (s.payable || 0), 0),
            totalExpenses: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
            totalBilled: dayBilled.reduce((sum, b) => sum + (b.netAmount || 0), 0),
            netProfit: daySales.reduce((sum, s) => sum + (s.payable || 0), 0) - 
                       dayExpenses.reduce((sum, e) => sum + e.amount, 0) +
                       dayBilled.reduce((sum, b) => sum + (b.netAmount || 0), 0)
        };
    },

    getMonthlyReport: async (month) => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.reports.monthly(month);
        }
        const sales = load(SK.SALES, []);
        const expenses = load(SK.EXP, []);
        const billed = load(SK.BILLED, []);
        
        const monthSales = sales.filter(s => s.date && s.date.startsWith(month));
        const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(month));
        const monthBilled = billed.filter(b => b.billedDate && b.billedDate.startsWith(month));
        
        return {
            month,
            sales: monthSales,
            expenses: monthExpenses,
            billed: monthBilled,
            totalSales: monthSales.reduce((sum, s) => sum + (s.payable || 0), 0),
            totalExpenses: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
            totalBilled: monthBilled.reduce((sum, b) => sum + (b.netAmount || 0), 0),
            netProfit: monthSales.reduce((sum, s) => sum + (s.payable || 0), 0) - 
                       monthExpenses.reduce((sum, e) => sum + e.amount, 0) +
                       monthBilled.reduce((sum, b) => sum + (b.netAmount || 0), 0)
        };
    },

    getFullReport: async () => {
        if (isElectron && window.electronAPI) {
            return await window.electronAPI.db.reports.full();
        }
        const sales = load(SK.SALES, []);
        const expenses = load(SK.EXP, []);
        const billed = load(SK.BILLED, []);
        const products = load(SK.PRODUCTS, []);
        const suppliers = load(SK.SUPPLIERS, []);
        const workers = load(SK.WORKERS, []);
        
        return {
            sales,
            expenses,
            billed,
            products,
            suppliers,
            workers,
            totalSales: sales.reduce((sum, s) => sum + (s.payable || 0), 0),
            totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
            totalBilled: billed.reduce((sum, b) => sum + (b.netAmount || 0), 0),
            netProfit: sales.reduce((sum, s) => sum + (s.payable || 0), 0) - 
                       expenses.reduce((sum, e) => sum + e.amount, 0) +
                       billed.reduce((sum, b) => sum + (b.netAmount || 0), 0)
        };
    }
};

// Export a unified API
export const db = {
    products: {
        getAll: sqliteOps.getProducts,
        getById: sqliteOps.getSaleById,
        create: sqliteOps.createProduct,
        update: sqliteOps.updateProduct,
        delete: sqliteOps.deleteProduct,
        search: sqliteOps.searchProducts,
        updateStock: sqliteOps.updateProductStock
    },
    suppliers: {
        getAll: sqliteOps.getSuppliers,
        create: sqliteOps.createSupplier,
        update: sqliteOps.updateSupplier,
        delete: sqliteOps.deleteSupplier
    },
    sales: {
        getAll: sqliteOps.getSales,
        getById: sqliteOps.getSaleById,
        create: sqliteOps.createSale,
        getByCustomer: sqliteOps.getSalesByCustomer
    },
    workers: {
        getAll: sqliteOps.getWorkers,
        create: sqliteOps.createWorker,
        update: sqliteOps.updateWorker,
        delete: sqliteOps.deleteWorker
    },
    grns: {
        getAll: sqliteOps.getGRNs,
        getById: sqliteOps.getGRNById,
        create: sqliteOps.createGRN
    },
    customers: {
        getAll: sqliteOps.getCustomers,
        create: sqliteOps.createCustomer,
        search: sqliteOps.searchCustomers
    },
    expenses: {
        getAll: sqliteOps.getExpenses,
        create: sqliteOps.createExpense,
        delete: sqliteOps.deleteExpense
    },
    jobs: {
        getAll: sqliteOps.getJobs,
        create: sqliteOps.createJob,
        update: sqliteOps.updateJob,
        delete: sqliteOps.deleteJob
    },
    credits: {
        getAll: sqliteOps.getCredits,
        create: sqliteOps.createCredit,
        update: sqliteOps.updateCredit,
        getByCustomer: sqliteOps.getCreditsByCustomer
    },
    balances: {
        getAll: sqliteOps.getDailyBalances,
        save: sqliteOps.saveDailyBalance,
        getByDate: sqliteOps.getBalanceByDate
    },
    returns: {
        getAll: sqliteOps.getReturns,
        create: sqliteOps.createReturn
    },
    billed: {
        getAll: sqliteOps.getBilled,
        create: sqliteOps.createBilled
    },
    salesReturns: {
        getAll: sqliteOps.getSalesReturns,
        create: sqliteOps.createSalesReturn
    },
    reports: {
        daily: sqliteOps.getDailyReport,
        monthly: sqliteOps.getMonthlyReport,
        full: sqliteOps.getFullReport
    }
};

// Initialize database with demo data
export const initDatabase = async () => {
    if (isElectron && window.electronAPI) {
        try {
            await window.electronAPI.db.init();
            console.log('SQLite database initialized');
        } catch (error) {
            console.error('Error initializing SQLite:', error);
        }
    }
    initializeDemoData();
};

export default db;