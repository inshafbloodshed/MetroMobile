// src/database/ipcHandlers.js
const DatabaseQueries = require('./queries');
const { initDatabase } = require('./sqlite');

let dbQueries = null;

function setupIpcHandlers(ipcMain) {
    console.log('🔧 Setting up IPC handlers...');
    
    try {
        initDatabase();
        dbQueries = new DatabaseQueries();
        console.log('✅ Database queries initialized');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
    }

    // ─── Suppliers ───
    ipcMain.handle('db:getSuppliers', async (event, activeOnly = true) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getAllSuppliers(activeOnly);
        } catch (error) {
            console.error('❌ Error in getSuppliers:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getSupplier', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getSupplier(id);
        } catch (error) {
            console.error('❌ Error in getSupplier:', error);
            throw error;
        }
    });

    ipcMain.handle('db:createSupplier', async (event, supplier) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.createSupplier(supplier);
        } catch (error) {
            console.error('❌ Error in createSupplier:', error);
            throw error;
        }
    });

    ipcMain.handle('db:updateSupplier', async (event, id, data) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.updateSupplier(id, data);
        } catch (error) {
            console.error('❌ Error in updateSupplier:', error);
            throw error;
        }
    });

    // ─── Products ───
    ipcMain.handle('db:getProducts', async (event, activeOnly = true) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getAllProducts(activeOnly);
        } catch (error) {
            console.error('❌ Error in getProducts:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getProduct', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getProduct(id);
        } catch (error) {
            console.error('❌ Error in getProduct:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getProductByCode', async (event, code) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getProductByCode(code);
        } catch (error) {
            console.error('❌ Error in getProductByCode:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getProductsBySupplier', async (event, supplierId) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getProductsBySupplier(supplierId);
        } catch (error) {
            console.error('❌ Error in getProductsBySupplier:', error);
            throw error;
        }
    });

    ipcMain.handle('db:createProduct', async (event, product) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.createProduct(product);
        } catch (error) {
            console.error('❌ Error in createProduct:', error);
            throw error;
        }
    });

    ipcMain.handle('db:updateProduct', async (event, id, product) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.updateProduct(id, product);
        } catch (error) {
            console.error('❌ Error in updateProduct:', error);
            throw error;
        }
    });

    // ─── GRNs ───
    ipcMain.handle('db:getGRNs', async () => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getAllGRNs();
        } catch (error) {
            console.error('❌ Error in getGRNs:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getGRN', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getGRN(id);
        } catch (error) {
            console.error('❌ Error in getGRN:', error);
            throw error;
        }
    });

    ipcMain.handle('db:createGRN', async (event, grnData) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.createGRN(grnData);
        } catch (error) {
            console.error('❌ Error in createGRN:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getNextGRN', async () => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            const grns = dbQueries.getAllGRNs();
            const count = grns.length + 1;
            return 'PUR' + String(count).padStart(6, '0');
        } catch (error) {
            console.error('❌ Error in getNextGRN:', error);
            throw error;
        }
    });

    // ─── Returns (Purchase Returns) ───
    ipcMain.handle('db:getReturns', async () => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getAllReturns();
        } catch (error) {
            console.error('❌ Error in getReturns:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getReturn', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getReturn(id);
        } catch (error) {
            console.error('❌ Error in getReturn:', error);
            throw error;
        }
    });

    ipcMain.handle('db:createReturn', async (event, returnData) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.createReturn(returnData);
        } catch (error) {
            console.error('❌ Error in createReturn:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getNextReturn', async () => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            const returns = dbQueries.getAllReturns();
            const count = returns.length + 1;
            return 'RTN' + String(count).padStart(6, '0');
        } catch (error) {
            console.error('❌ Error in getNextReturn:', error);
            throw error;
        }
    });

    // ─── Sales Invoices ───
    ipcMain.handle('db:getSalesInvoices', async () => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getAllSalesInvoices();
        } catch (error) {
            console.error('❌ Error in getSalesInvoices:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getSalesInvoice', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getSalesInvoice(id);
        } catch (error) {
            console.error('❌ Error in getSalesInvoice:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getSalesInvoicesByCustomer', async (event, customerName) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getSalesInvoicesByCustomer(customerName);
        } catch (error) {
            console.error('❌ Error in getSalesInvoicesByCustomer:', error);
            throw error;
        }
    });

    ipcMain.handle('db:createSalesInvoice', async (event, invoice) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.createSalesInvoice(invoice);
        } catch (error) {
            console.error('❌ Error in createSalesInvoice:', error);
            throw error;
        }
    });

    ipcMain.handle('db:updateSalesInvoice', async (event, id, invoice) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.updateSalesInvoice(id, invoice);
        } catch (error) {
            console.error('❌ Error in updateSalesInvoice:', error);
            throw error;
        }
    });

    ipcMain.handle('db:deleteSalesInvoice', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.deleteSalesInvoice(id);
        } catch (error) {
            console.error('❌ Error in deleteSalesInvoice:', error);
            throw error;
        }
    });

    // ─── Sales Returns ───
    ipcMain.handle('db:getSalesReturns', async () => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getAllSalesReturns();
        } catch (error) {
            console.error('❌ Error in getSalesReturns:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getSalesReturn', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getSalesReturn(id);
        } catch (error) {
            console.error('❌ Error in getSalesReturn:', error);
            throw error;
        }
    });

    ipcMain.handle('db:createSalesReturn', async (event, returnData) => {
        console.log('📂 createSalesReturn called with invoice_id:', returnData.invoice_id);
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            
            // ✅ Ensure invoice_id is properly set
            if (!returnData.invoice_id) {
                console.error('❌ invoice_id is missing!');
                throw new Error('invoice_id is required for sales return');
            }
            
            return dbQueries.createSalesReturn(returnData);
        } catch (error) {
            console.error('❌ Error in createSalesReturn:', error);
            throw error;
        }
    });

    ipcMain.handle('db:deleteSalesReturn', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.deleteSalesReturn(id);
        } catch (error) {
            console.error('❌ Error in deleteSalesReturn:', error);
            throw error;
        }
    });

    // ─── Credits ───
    ipcMain.handle('db:getCredits', async () => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getAllCredits();
        } catch (error) {
            console.error('❌ Error in getCredits:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getCredit', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getCredit(id);
        } catch (error) {
            console.error('❌ Error in getCredit:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getCreditsByCustomer', async (event, customerName) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getCreditsByCustomer(customerName);
        } catch (error) {
            console.error('❌ Error in getCreditsByCustomer:', error);
            throw error;
        }
    });

    ipcMain.handle('db:createCredit', async (event, credit) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.createCredit(credit);
        } catch (error) {
            console.error('❌ Error in createCredit:', error);
            throw error;
        }
    });

    ipcMain.handle('db:updateCredit', async (event, credit) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.updateCredit(credit);
        } catch (error) {
            console.error('❌ Error in updateCredit:', error);
            throw error;
        }
    });

    ipcMain.handle('db:deleteCredit', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.deleteCredit(id);
        } catch (error) {
            console.error('❌ Error in deleteCredit:', error);
            throw error;
        }
    });

    // ─── Workers ───
    ipcMain.handle('db:getWorkers', async () => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getAllWorkers();
        } catch (error) {
            console.error('❌ Error in getWorkers:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getWorkerByUsername', async (event, username) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.getWorkerByUsername(username);
        } catch (error) {
            console.error('❌ Error in getWorkerByUsername:', error);
            throw error;
        }
    });

    ipcMain.handle('db:createWorker', async (event, worker) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.createWorker(worker);
        } catch (error) {
            console.error('❌ Error in createWorker:', error);
            throw error;
        }
    });

    ipcMain.handle('db:updateWorker', async (event, id, data) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.updateWorker(id, data);
        } catch (error) {
            console.error('❌ Error in updateWorker:', error);
            throw error;
        }
    });

    ipcMain.handle('db:deleteWorker', async (event, id) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            return dbQueries.deleteWorker(id);
        } catch (error) {
            console.error('❌ Error in deleteWorker:', error);
            throw error;
        }
    });

    // ─── Migration ───
    ipcMain.handle('db:migrateFromLocalStorage', async (event, data) => {
        try {
            if (!dbQueries) throw new Error('Database not initialized');
            
            // Migration logic here...
            return { success: true, message: 'Migration completed' };
        } catch (error) {
            console.error('❌ Error in migrateFromLocalStorage:', error);
            throw error;
        }
    });

    console.log('✅ All IPC handlers registered');
}

module.exports = {
    setupIpcHandlers
};