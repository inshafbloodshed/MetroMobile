// public/electron.js
const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Check if running in development mode
const isDev = process.env.NODE_ENV === 'development' || 
              !app.isPackaged ||
              process.argv.includes('--dev');

console.log('🚀 Running in', isDev ? 'development' : 'production', 'mode');

let mainWindow;
let db = null;

// ─── SQLITE DATABASE FUNCTIONS ──────────────────────────────

function getDbPath() {
    try {
        const userDataPath = app.getPath('userData');
        const dbDir = path.join(userDataPath, 'database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        return path.join(dbDir, 'phone-repair.db');
    } catch (error) {
        const dbDir = path.join(process.cwd(), 'data', 'database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        return path.join(dbDir, 'phone-repair.db');
    }
}

function initDatabase() {
    if (db) return db;
    try {
        const dbPath = getDbPath();
        console.log('📁 Database path:', dbPath);
        
        let Database;
        try {
            Database = require('better-sqlite3');
        } catch (e) {
            console.error('❌ better-sqlite3 not found, using fallback');
            try {
                const sqlite3 = require('sqlite3');
                Database = function(dbPath) {
                    this.db = new sqlite3.Database(dbPath);
                    this.pragma = function(cmd) {
                        this.db.run(cmd);
                        return this;
                    };
                    this.prepare = function(sql) {
                        return {
                            run: (...params) => {
                                return new Promise((resolve, reject) => {
                                    this.db.run(sql, params, function(err) {
                                        if (err) reject(err);
                                        else resolve({ changes: this.changes, lastInsertRowid: this.lastID });
                                    });
                                });
                            },
                            all: (...params) => {
                                return new Promise((resolve, reject) => {
                                    this.db.all(sql, params, (err, rows) => {
                                        if (err) reject(err);
                                        else resolve(rows);
                                    });
                                });
                            },
                            get: (...params) => {
                                return new Promise((resolve, reject) => {
                                    this.db.get(sql, params, (err, row) => {
                                        if (err) reject(err);
                                        else resolve(row);
                                    });
                                });
                            }
                        };
                    };
                    this.exec = function(sql) {
                        return new Promise((resolve, reject) => {
                            this.db.exec(sql, (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                    };
                    this.close = function() {
                        this.db.close();
                    };
                };
            } catch (e2) {
                console.error('❌ No SQLite module available:', e2);
                throw new Error('SQLite module not available');
            }
        }

        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 5000');
        initSchema();
        console.log('✅ Database initialized successfully');
        return db;
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        throw error;
    }
}

function initSchema() {
    try {
        const schema = `
            CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                address TEXT,
                active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                barcode TEXT UNIQUE,
                brand TEXT,
                model TEXT,
                color TEXT,
                nature TEXT,
                category TEXT DEFAULT 'DISPLAY',
                cost REAL DEFAULT 0,
                sell REAL DEFAULT 0,
                stock INTEGER DEFAULT 0,
                reorder_level INTEGER DEFAULT 5,
                storage TEXT,
                supplier_id TEXT,
                supplier_name TEXT,
                compatible TEXT,
                margin REAL,
                active INTEGER DEFAULT 1,
                supplier_warranty TEXT DEFAULT 'NO WARRANTY',
                customer_warranty TEXT DEFAULT 'NO WARRANTY',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            );

            CREATE TABLE IF NOT EXISTS grns (
                id TEXT PRIMARY KEY,
                supplier_id TEXT NOT NULL,
                supplier_name TEXT NOT NULL,
                bill_no TEXT,
                bill_type TEXT DEFAULT 'CASH',
                date DATE NOT NULL,
                sub_total REAL DEFAULT 0,
                discount REAL DEFAULT 0,
                net_total REAL DEFAULT 0,
                amt_paid REAL DEFAULT 0,
                settled INTEGER DEFAULT 1,
                created_by TEXT DEFAULT 'ADMIN',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            );

            CREATE TABLE IF NOT EXISTS grn_lines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grn_id TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                code TEXT,
                qty INTEGER NOT NULL DEFAULT 1,
                cost_price REAL NOT NULL DEFAULT 0,
                sell_price REAL NOT NULL DEFAULT 0,
                total REAL NOT NULL DEFAULT 0,
                brand TEXT,
                model TEXT,
                barcode_num TEXT,
                encrypted_cost TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            -- ─── PURCHASE RETURNS TABLES ───
            CREATE TABLE IF NOT EXISTS returns (
                id TEXT PRIMARY KEY,
                grn_id TEXT NOT NULL,
                supplier_name TEXT NOT NULL,
                date TEXT NOT NULL,
                subtotal REAL DEFAULT 0,
                discount_percent REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                net_total REAL DEFAULT 0,
                pay_method TEXT DEFAULT 'CASH',
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (grn_id) REFERENCES grns(id)
            );

            CREATE TABLE IF NOT EXISTS return_lines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                return_id TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                code TEXT,
                return_qty INTEGER NOT NULL DEFAULT 1,
                max_qty INTEGER NOT NULL DEFAULT 1,
                cost_price REAL NOT NULL DEFAULT 0,
                refund_total REAL NOT NULL DEFAULT 0,
                grn_ref TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS sales_invoices (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                customer TEXT NOT NULL,
                mobile TEXT,
                address TEXT,
                subtotal REAL DEFAULT 0,
                discount REAL DEFAULT 0,
                payable REAL DEFAULT 0,
                paid REAL DEFAULT 0,
                due REAL DEFAULT 0,
                method TEXT DEFAULT 'Cash',
                reference TEXT,
                remarks TEXT,
                status TEXT DEFAULT 'paid',
                is_credit_sale INTEGER DEFAULT 0,
                created_by TEXT DEFAULT 'ADMIN',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sales_invoice_lines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                qty INTEGER NOT NULL DEFAULT 1,
                sell_price REAL NOT NULL DEFAULT 0,
                total REAL NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS sales_returns (
                id TEXT PRIMARY KEY,
                invoice_id TEXT NOT NULL,
                customer TEXT NOT NULL,
                mobile TEXT,
                return_date TEXT NOT NULL,
                return_type TEXT DEFAULT 'REFUND',
                return_subtotal REAL DEFAULT 0,
                restock_fee REAL DEFAULT 0,
                net_refund REAL DEFAULT 0,
                exchange_value REAL DEFAULT 0,
                net_balance REAL DEFAULT 0,
                refund_method TEXT DEFAULT 'Cash',
                refund_reference TEXT,
                remarks TEXT,
                processed_by TEXT DEFAULT 'ADMIN',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                returned_items TEXT,
                exchange_items TEXT,
                FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id)
            );

            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                mobile TEXT,
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS credits (
                id TEXT PRIMARY KEY,
                invoice_id TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                mobile TEXT,
                date TEXT NOT NULL,
                total_amount REAL NOT NULL DEFAULT 0,
                paid_amount REAL NOT NULL DEFAULT 0,
                balance REAL NOT NULL DEFAULT 0,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id)
            );

            CREATE TABLE IF NOT EXISTS credit_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                credit_id TEXT NOT NULL,
                date TEXT NOT NULL,
                amount REAL NOT NULL DEFAULT 0,
                method TEXT DEFAULT 'Cash',
                reference TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS workers (
                id INTEGER PRIMARY KEY,
                name TEXT,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT,
                active INTEGER DEFAULT 1,
                joinedDate TEXT,
                permissions TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
            CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
            CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
            CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(customer);
            CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(date);
            CREATE INDEX IF NOT EXISTS idx_credits_customer_name ON credits(customer_name);
            CREATE INDEX IF NOT EXISTS idx_returns_grn_id ON returns(grn_id);
            CREATE INDEX IF NOT EXISTS idx_return_lines_return_id ON return_lines(return_id);
        `;
        db.exec(schema);
        console.log('✅ Database schema initialized');
        insertDefaultUsers();
    } catch (error) {
        console.error('❌ Failed to initialize schema:', error);
        throw error;
    }
}

function insertDefaultUsers() {
    try {
        const count = db.prepare('SELECT COUNT(*) as count FROM workers').get();
        if (count && count.count > 0) {
            console.log('✅ Workers already exist');
            return;
        }

        const insert = db.prepare(`
            INSERT INTO workers (id, name, username, password, role, active, joinedDate, permissions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const defaultUsers = [
            {
                id: 1,
                name: 'Metro Admin',
                username: 'Metroadd',
                password: 'Metro123',
                role: 'admin',
                active: 1,
                joinedDate: new Date().toISOString().slice(0, 10),
                permissions: JSON.stringify({
                    salesInvoice: true,
                    salesReturn: true,
                    productCatalog: true,
                    repairBilling: true,
                    viewCostPrice: true
                })
            },
            {
                id: 2,
                name: 'Demo Worker',
                username: 'worker1',
                password: '123',
                role: 'user',
                active: 1,
                joinedDate: new Date().toISOString().slice(0, 10),
                permissions: JSON.stringify({
                    salesInvoice: true,
                    salesReturn: true,
                    productCatalog: true,
                    viewCostPrice: false,
                    repairBilling: true
                })
            }
        ];

        for (const user of defaultUsers) {
            insert.run(
                user.id,
                user.name,
                user.username,
                user.password,
                user.role,
                user.active,
                user.joinedDate,
                user.permissions
            );
        }
        console.log('✅ Default users created');
    } catch (error) {
        console.error('Error inserting default users:', error);
    }
}

function getDb() {
    if (!db) {
        initDatabase();
    }
    return db;
}

// ─── SETUP IPC HANDLERS ─────────────────────────────────────

function setupIpcHandlers() {
    console.log('🔧 Setting up IPC handlers...');
    
    try {
        initDatabase();
        console.log('✅ Database ready');

        // ─── Suppliers ───
        ipcMain.handle('db:getSuppliers', async (event, activeOnly = true) => {
            try {
                const db = getDb();
                const sql = activeOnly 
                    ? 'SELECT * FROM suppliers WHERE active = 1 ORDER BY name'
                    : 'SELECT * FROM suppliers ORDER BY name';
                return db.prepare(sql).all();
            } catch (error) {
                console.error('Error in getSuppliers:', error);
                return [];
            }
        });

        ipcMain.handle('db:createSupplier', async (event, supplier) => {
            try {
                const db = getDb();
                const stmt = db.prepare(`
                    INSERT INTO suppliers (id, name, phone, address, active)
                    VALUES (?, ?, ?, ?, ?)
                `);
                return stmt.run(
                    supplier.id,
                    supplier.name,
                    supplier.phone,
                    supplier.address || null,
                    supplier.active !== false ? 1 : 0
                );
            } catch (error) {
                console.error('Error in createSupplier:', error);
                throw error;
            }
        });

        ipcMain.handle('db:updateSupplier', async (event, id, data) => {
            try {
                const db = getDb();
                const stmt = db.prepare(`
                    UPDATE suppliers 
                    SET name = ?, phone = ?, address = ?, active = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                return stmt.run(data.name, data.phone, data.address, data.active ? 1 : 0, id);
            } catch (error) {
                console.error('Error in updateSupplier:', error);
                throw error;
            }
        });

        ipcMain.handle('db:getSupplier', async (event, id) => {
            try {
                const db = getDb();
                return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
            } catch (error) {
                console.error('Error in getSupplier:', error);
                return null;
            }
        });

        // ─── Products ───
        ipcMain.handle('db:getProducts', async (event, activeOnly = true) => {
            try {
                const db = getDb();
                const sql = activeOnly
                    ? 'SELECT * FROM products WHERE active = 1 ORDER BY name'
                    : 'SELECT * FROM products ORDER BY name';
                return db.prepare(sql).all();
            } catch (error) {
                console.error('Error in getProducts:', error);
                return [];
            }
        });

        ipcMain.handle('db:createProduct', async (event, product) => {
            try {
                const db = getDb();
                const stmt = db.prepare(`
                    INSERT INTO products (
                        code, name, barcode, brand, model, color, nature, category,
                        cost, sell, stock, reorder_level, storage, supplier_id, supplier_name,
                        compatible, margin, active, supplier_warranty, customer_warranty
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                return stmt.run(
                    product.code,
                    product.name,
                    product.barcode || null,
                    product.brand || null,
                    product.model || null,
                    product.color || null,
                    product.nature || null,
                    product.category || 'DISPLAY',
                    product.cost || 0,
                    product.sell || 0,
                    product.stock || 0,
                    product.reorder_level || 5,
                    product.storage || null,
                    product.supplier_id || null,
                    product.supplier_name || null,
                    product.compatible || null,
                    product.margin || null,
                    product.active !== false ? 1 : 0,
                    product.supplier_warranty || 'NO WARRANTY',
                    product.customer_warranty || 'NO WARRANTY'
                );
            } catch (error) {
                console.error('Error in createProduct:', error);
                throw error;
            }
        });

        ipcMain.handle('db:updateProduct', async (event, id, product) => {
            try {
                const db = getDb();
                const stmt = db.prepare(`
                    UPDATE products SET
                        code = ?, name = ?, barcode = ?, brand = ?, model = ?, color = ?,
                        nature = ?, category = ?, cost = ?, sell = ?, stock = ?,
                        reorder_level = ?, storage = ?, supplier_id = ?, supplier_name = ?,
                        compatible = ?, margin = ?, active = ?, supplier_warranty = ?,
                        customer_warranty = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                return stmt.run(
                    product.code,
                    product.name,
                    product.barcode || null,
                    product.brand || null,
                    product.model || null,
                    product.color || null,
                    product.nature || null,
                    product.category || 'DISPLAY',
                    product.cost || 0,
                    product.sell || 0,
                    product.stock || 0,
                    product.reorder_level || 5,
                    product.storage || null,
                    product.supplier_id || null,
                    product.supplier_name || null,
                    product.compatible || null,
                    product.margin || null,
                    product.active !== false ? 1 : 0,
                    product.supplier_warranty || 'NO WARRANTY',
                    product.customer_warranty || 'NO WARRANTY',
                    id
                );
            } catch (error) {
                console.error('Error in updateProduct:', error);
                throw error;
            }
        });

        ipcMain.handle('db:getProductByCode', async (event, code) => {
            try {
                const db = getDb();
                return db.prepare('SELECT * FROM products WHERE code = ?').get(code);
            } catch (error) {
                console.error('Error in getProductByCode:', error);
                return null;
            }
        });

        // ─── GRNs ───
        ipcMain.handle('db:getGRNs', async () => {
            try {
                const db = getDb();
                const grns = db.prepare('SELECT * FROM grns ORDER BY created_at DESC').all();

                for (const grn of grns) {
                    const rawLines = db.prepare('SELECT * FROM grn_lines WHERE grn_id = ?').all(grn.id);
                    grn.lines = rawLines.map(line => ({
                        id: line.product_id,
                        product_id: line.product_id,
                        name: line.name,
                        code: line.code,
                        qty: line.qty,
                        cost_price: line.cost_price,
                        sell_price: line.sell_price,
                        total: line.total,
                        brand: line.brand,
                        model: line.model,
                        barcode_num: line.barcode_num,
                        encrypted_cost: line.encrypted_cost,
                        costPrice: line.cost_price,
                        sellPrice: line.sell_price,
                        barcodeNum: line.barcode_num,
                        encryptedCost: line.encrypted_cost,
                    }));
                    grn.supplierName = grn.supplier_name;
                    grn.subTotal = grn.sub_total;
                    grn.billNo = grn.bill_no;
                    grn.billType = grn.bill_type;
                    grn.netTotal = grn.net_total;
                    grn.amtPaid = grn.amt_paid;
                }
                return grns;
            } catch (error) {
                console.error('Error in getGRNs:', error);
                return [];
            }
        });

        ipcMain.handle('db:createGRN', async (event, grn) => {
            try {
                const db = getDb();
                const transaction = db.transaction(() => {
                    const stmt = db.prepare(`
                        INSERT INTO grns (
                            id, supplier_id, supplier_name, bill_no, bill_type, date,
                            sub_total, discount, net_total, amt_paid, settled, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    stmt.run(
                        grn.id,
                        grn.supplier_id,
                        grn.supplier_name,
                        grn.bill_no || null,
                        grn.bill_type || 'CASH',
                        grn.date,
                        grn.sub_total || 0,
                        grn.discount || 0,
                        grn.net_total || 0,
                        grn.amt_paid || 0,
                        grn.settled !== false ? 1 : 0,
                        grn.created_by || 'ADMIN'
                    );

                    const lineStmt = db.prepare(`
                        INSERT INTO grn_lines (
                            grn_id, product_id, name, code, qty, cost_price, sell_price,
                            total, brand, model, barcode_num, encrypted_cost
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    for (const line of grn.lines) {
                        lineStmt.run(
                            grn.id,
                            line.product_id,
                            line.name,
                            line.code || null,
                            line.qty || 1,
                            line.cost_price || 0,
                            line.sell_price || 0,
                            line.total || 0,
                            line.brand || null,
                            line.model || null,
                            line.barcode_num || null,
                            line.encrypted_cost || null
                        );
                    }

                    for (const line of grn.lines) {
                        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(line.product_id);
                        if (product) {
                            db.prepare(`
                                UPDATE products SET stock = stock + ?, cost = ?, updated_at = CURRENT_TIMESTAMP
                                WHERE id = ?
                            `).run(line.qty || 1, line.cost_price || 0, line.product_id);
                        }
                    }
                    return { success: true, id: grn.id };
                });
                return transaction();
            } catch (error) {
                console.error('Error in createGRN:', error);
                throw error;
            }
        });

        ipcMain.handle('db:getNextGRN', async () => {
            try {
                const db = getDb();
                const grns = db.prepare('SELECT COUNT(*) as count FROM grns').get();
                const count = grns.count + 1;
                return `PUR${String(count).padStart(6, '0')}`;
            } catch (error) {
                console.error('Error in getNextGRN:', error);
                return 'PUR000001';
            }
        });

        // ─── PURCHASE RETURNS ───
        ipcMain.handle('db:getReturns', async () => {
            try {
                const db = getDb();
                console.log('📋 Fetching purchase returns...');
                
                const returns = db.prepare('SELECT * FROM returns ORDER BY created_at DESC').all();
                
                for (const ret of returns) {
                    try {
                        ret.lines = db.prepare('SELECT * FROM return_lines WHERE return_id = ?').all(ret.id);
                    } catch (e) {
                        ret.lines = [];
                    }
                }
                
                console.log(`✅ Found ${returns.length} returns`);
                return returns;
            } catch (error) {
                console.error('Error in getReturns:', error);
                return [];
            }
        });

        ipcMain.handle('db:getReturn', async (event, id) => {
            try {
                const db = getDb();
                const ret = db.prepare('SELECT * FROM returns WHERE id = ?').get(id);
                if (ret) {
                    ret.lines = db.prepare('SELECT * FROM return_lines WHERE return_id = ?').all(id);
                }
                return ret;
            } catch (error) {
                console.error('Error in getReturn:', error);
                return null;
            }
        });

        ipcMain.handle('db:createReturn', async (event, returnData) => {
            try {
                const db = getDb();
                console.log('📝 Creating purchase return:', returnData.id);
                
                const transaction = db.transaction(() => {
                    const stmt = db.prepare(`
                        INSERT INTO returns (
                            id, grn_id, supplier_name, date, subtotal,
                            discount_percent, discount_amount, net_total, pay_method, reason
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    
                    stmt.run(
                        returnData.id,
                        returnData.grn_id,
                        returnData.supplier_name,
                        returnData.date,
                        returnData.subtotal || 0,
                        returnData.discount_percent || 0,
                        returnData.discount_amount || 0,
                        returnData.net_total || 0,
                        returnData.pay_method || 'CASH',
                        returnData.reason || null
                    );

                    const lineStmt = db.prepare(`
                        INSERT INTO return_lines (
                            return_id, product_id, name, code, return_qty, max_qty,
                            cost_price, refund_total, grn_ref
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    
                    for (const line of returnData.lines) {
                        lineStmt.run(
                            returnData.id,
                            line.product_id || line.id,
                            line.name,
                            line.code || null,
                            line.return_qty || line.returnQty || 1,
                            line.max_qty || line.maxQty || 1,
                            line.cost_price || line.costPrice || 0,
                            line.refund_total || line.refundTotal || 0,
                            line.grn_ref || returnData.grn_id
                        );
                    }

                    for (const line of returnData.lines) {
                        const productId = line.product_id || line.id;
                        const qty = line.return_qty || line.returnQty || 0;
                        if (productId && qty > 0) {
                            const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
                            if (product) {
                                const newStock = Math.max(0, (product.stock || 0) - qty);
                                db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                                    .run(newStock, productId);
                                console.log(`📦 Updated product ${productId} stock to ${newStock}`);
                            }
                        }
                    }

                    return { success: true, id: returnData.id };
                });
                
                return transaction();
            } catch (error) {
                console.error('❌ Error in createReturn:', error);
                throw error;
            }
        });

        ipcMain.handle('db:getNextReturn', async () => {
            try {
                const db = getDb();
                const result = db.prepare('SELECT COUNT(*) as count FROM returns').get();
                const count = (result?.count || 0) + 1;
                return `RTN${String(count).padStart(6, '0')}`;
            } catch (error) {
                console.error('Error in getNextReturn:', error);
                return 'RTN000001';
            }
        });

        // ─── Sales Invoices ───
        ipcMain.handle('db:getSalesInvoices', async () => {
            try {
                const db = getDb();
                const invoices = db.prepare('SELECT * FROM sales_invoices ORDER BY created_at DESC').all();
                for (const invoice of invoices) {
                    const rawLines = db.prepare('SELECT * FROM sales_invoice_lines WHERE invoice_id = ?').all(invoice.id);
                    invoice.lines = rawLines.map(line => ({
                        id: line.product_id,
                        product_id: line.product_id,
                        name: line.product_name,
                        product_name: line.product_name,
                        qty: line.qty,
                        sellPrice: line.sell_price,
                        sell_price: line.sell_price,
                        total: line.total
                    }));
                }
                return invoices;
            } catch (error) {
                console.error('Error in getSalesInvoices:', error);
                return [];
            }
        });

        ipcMain.handle('db:getSalesInvoice', async (event, id) => {
            try {
                const db = getDb();
                const invoice = db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id);
                if (invoice) {
                    const rawLines = db.prepare('SELECT * FROM sales_invoice_lines WHERE invoice_id = ?').all(id);
                    invoice.lines = rawLines.map(line => ({
                        id: line.product_id,
                        product_id: line.product_id,
                        name: line.product_name,
                        product_name: line.product_name,
                        qty: line.qty,
                        sellPrice: line.sell_price,
                        sell_price: line.sell_price,
                        total: line.total
                    }));
                }
                return invoice;
            } catch (error) {
                console.error('Error in getSalesInvoice:', error);
                return null;
            }
        });

        ipcMain.handle('db:createSalesInvoice', async (event, invoice) => {
            try {
                const db = getDb();
                console.log('📂 createSalesInvoice called with:', invoice.id);
                
                const transaction = db.transaction(() => {
                    const stmt = db.prepare(`
                        INSERT INTO sales_invoices (
                            id, date, customer, mobile, address, subtotal, discount, payable,
                            paid, due, method, reference, remarks, status, is_credit_sale, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    stmt.run(
                        invoice.id,
                        invoice.date,
                        invoice.customer,
                        invoice.mobile || null,
                        invoice.address || null,
                        invoice.subtotal || 0,
                        invoice.discount || 0,
                        invoice.payable || 0,
                        invoice.paid || 0,
                        invoice.due || 0,
                        invoice.method || 'Cash',
                        invoice.reference || null,
                        invoice.remarks || null,
                        invoice.status || 'paid',
                        invoice.is_credit_sale ? 1 : 0,
                        invoice.created_by || 'ADMIN'
                    );

                    const lineStmt = db.prepare(`
                        INSERT INTO sales_invoice_lines (
                            invoice_id, product_id, product_name, qty, sell_price, total
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `);
                    for (const line of invoice.lines) {
                        lineStmt.run(
                            invoice.id,
                            line.product_id || line.id,
                            line.product_name || line.name,
                            line.qty || 1,
                            line.sell_price || line.price || 0,
                            (line.qty || 1) * (line.sell_price || line.price || 0)
                        );
                    }

                    for (const line of invoice.lines) {
                        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(line.product_id);
                        if (product) {
                            db.prepare(`
                                UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
                                WHERE id = ?
                            `).run(line.qty || 1, line.product_id);
                        }
                    }
                    return { success: true, id: invoice.id };
                });
                return transaction();
            } catch (error) {
                console.error('Error in createSalesInvoice:', error);
                throw error;
            }
        });

        ipcMain.handle('db:updateSalesInvoice', async (event, id, invoice) => {
            try {
                const db = getDb();
                console.log('📂 updateSalesInvoice called for:', id);
                
                const transaction = db.transaction(() => {
                    const stmt = db.prepare(`
                        UPDATE sales_invoices SET
                            date = ?, customer = ?, mobile = ?, address = ?,
                            subtotal = ?, discount = ?, payable = ?, paid = ?, due = ?,
                            method = ?, reference = ?, remarks = ?, status = ?,
                            is_credit_sale = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `);
                    stmt.run(
                        invoice.date,
                        invoice.customer,
                        invoice.mobile || null,
                        invoice.address || null,
                        invoice.subtotal || 0,
                        invoice.discount || 0,
                        invoice.payable || 0,
                        invoice.paid || 0,
                        invoice.due || 0,
                        invoice.method || 'Cash',
                        invoice.reference || null,
                        invoice.remarks || null,
                        invoice.status || 'paid',
                        invoice.is_credit_sale ? 1 : 0,
                        id
                    );

                    db.prepare('DELETE FROM sales_invoice_lines WHERE invoice_id = ?').run(id);
                    const lineStmt = db.prepare(`
                        INSERT INTO sales_invoice_lines (
                            invoice_id, product_id, product_name, qty, sell_price, total
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `);
                    for (const line of invoice.lines) {
                        lineStmt.run(
                            id,
                            line.product_id,
                            line.product_name,
                            line.qty || 1,
                            line.sell_price || 0,
                            line.total || 0
                        );
                    }
                    return { changes: 1 };
                });
                return transaction();
            } catch (error) {
                console.error('Error in updateSalesInvoice:', error);
                throw error;
            }
        });

        // ─── Sales Returns ───
        ipcMain.handle('db:getSalesReturns', async () => {
            try {
                const db = getDb();
                const returns = db.prepare('SELECT * FROM sales_returns ORDER BY created_at DESC').all();
                for (const ret of returns) {
                    ret.returned_items = ret.returned_items ? JSON.parse(ret.returned_items) : [];
                    ret.exchange_items = ret.exchange_items ? JSON.parse(ret.exchange_items) : [];
                }
                return returns;
            } catch (error) {
                console.error('Error in getSalesReturns:', error);
                return [];
            }
        });

        ipcMain.handle('db:createSalesReturn', async (event, returnData) => {
            try {
                const db = getDb();
                const stmt = db.prepare(`
                    INSERT INTO sales_returns (
                        id, invoice_id, customer, mobile, return_date, return_type,
                        return_subtotal, restock_fee, net_refund, exchange_value,
                        net_balance, refund_method, refund_reference, remarks,
                        processed_by, returned_items, exchange_items
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                return stmt.run(
                    returnData.id,
                    returnData.invoice_id,
                    returnData.customer || 'Unknown',
                    returnData.mobile || null,
                    returnData.return_date || new Date().toISOString().slice(0, 10),
                    returnData.return_type || 'REFUND',
                    returnData.return_subtotal || 0,
                    returnData.restock_fee || 0,
                    returnData.net_refund || 0,
                    returnData.exchange_value || 0,
                    returnData.net_balance || 0,
                    returnData.refund_method || 'Cash',
                    returnData.refund_reference || null,
                    returnData.remarks || null,
                    returnData.processed_by || 'ADMIN',
                    returnData.returned_items || '[]',
                    returnData.exchange_items || '[]'
                );
            } catch (error) {
                console.error('Error in createSalesReturn:', error);
                throw error;
            }
        });

        // ─── Customers ───
        ipcMain.handle('db:getCustomers', async () => {
            try {
                const db = getDb();
                return db.prepare('SELECT * FROM customers ORDER BY name').all();
            } catch (error) {
                console.error('Error in getCustomers:', error);
                return [];
            }
        });

        ipcMain.handle('db:createCustomer', async (event, customer) => {
            try {
                const db = getDb();
                const stmt = db.prepare(`
                    INSERT INTO customers (name, mobile, address)
                    VALUES (?, ?, ?)
                `);
                return stmt.run(customer.name, customer.mobile || null, customer.address || null);
            } catch (error) {
                console.error('Error in createCustomer:', error);
                throw error;
            }
        });

        ipcMain.handle('db:searchCustomers', async (event, searchTerm) => {
            try {
                const db = getDb();
                return db.prepare('SELECT * FROM customers WHERE name LIKE ? OR mobile LIKE ? ORDER BY name')
                    .all(`%${searchTerm}%`, `%${searchTerm}%`);
            } catch (error) {
                console.error('Error in searchCustomers:', error);
                return [];
            }
        });

        // ─── Credits ───
        ipcMain.handle('db:getCredits', async () => {
            try {
                const db = getDb();
                return db.prepare('SELECT * FROM credits ORDER BY created_at DESC').all();
            } catch (error) {
                console.error('Error in getCredits:', error);
                return [];
            }
        });

        ipcMain.handle('db:getCredit', async (event, id) => {
            try {
                const db = getDb();
                return db.prepare('SELECT * FROM credits WHERE id = ?').get(id);
            } catch (error) {
                console.error('Error in getCredit:', error);
                return null;
            }
        });

        ipcMain.handle('db:getCreditsByCustomer', async (event, customerName) => {
            try {
                const db = getDb();
                return db.prepare('SELECT * FROM credits WHERE customer_name LIKE ? AND status = "pending" ORDER BY created_at DESC')
                    .all(`%${customerName}%`);
            } catch (error) {
                console.error('Error in getCreditsByCustomer:', error);
                return [];
            }
        });

        ipcMain.handle('db:createCredit', async (event, credit) => {
            try {
                const db = getDb();
                const stmt = db.prepare(`
                    INSERT INTO credits (
                        id, invoice_id, customer_name, mobile, date,
                        total_amount, paid_amount, balance, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                return stmt.run(
                    credit.id,
                    credit.invoiceId,
                    credit.customerName,
                    credit.mobile || null,
                    credit.date,
                    credit.totalAmount || 0,
                    credit.paidAmount || 0,
                    credit.balance || 0,
                    credit.status || 'pending'
                );
            } catch (error) {
                console.error('Error in createCredit:', error);
                throw error;
            }
        });

        ipcMain.handle('db:updateCredit', async (event, credit) => {
            try {
                const db = getDb();
                const stmt = db.prepare(`
                    UPDATE credits SET
                        paid_amount = ?, balance = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                return stmt.run(credit.paidAmount || 0, credit.balance || 0, credit.status || 'pending', credit.id);
            } catch (error) {
                console.error('Error in updateCredit:', error);
                throw error;
            }
        });

        ipcMain.handle('db:deleteCredit', async (event, id) => {
            try {
                const db = getDb();
                return db.prepare('DELETE FROM credits WHERE id = ?').run(id);
            } catch (error) {
                console.error('Error in deleteCredit:', error);
                throw error;
            }
        });

        // ─── Workers ───
        ipcMain.handle('db:getWorkers', async () => {
            try {
                const db = getDb();
                return db.prepare('SELECT * FROM workers ORDER BY name').all();
            } catch (error) {
                console.error('Error in getWorkers:', error);
                return [];
            }
        });

        ipcMain.handle('db:getWorkerByUsername', async (event, username) => {
            try {
                const db = getDb();
                return db.prepare('SELECT * FROM workers WHERE username = ?').get(username);
            } catch (error) {
                console.error('Error in getWorkerByUsername:', error);
                return null;
            }
        });

        // ─── Migration ───
        ipcMain.handle('db:migrateFromLocalStorage', async (event, data) => {
            try {
                if (data.suppliers) localStorage.setItem('suppliers', JSON.stringify(data.suppliers));
                if (data.products) localStorage.setItem('products', JSON.stringify(data.products));
                if (data.grns) localStorage.setItem('grns', JSON.stringify(data.grns));
                if (data.returns) localStorage.setItem('returns', JSON.stringify(data.returns));
                if (data.workers) localStorage.setItem('workers', JSON.stringify(data.workers));
                if (data.salesInvoices) localStorage.setItem('salesInvoices', JSON.stringify(data.salesInvoices));
                if (data.salesReturns) localStorage.setItem('salesReturns', JSON.stringify(data.salesReturns));
                if (data.customers) localStorage.setItem('customers', JSON.stringify(data.customers));
                if (data.credits) localStorage.setItem('credits', JSON.stringify(data.credits));
                return { success: true, message: 'Migration completed' };
            } catch (error) {
                console.error('Migration error:', error);
                return { success: false, message: error.message };
            }
        });

        // ─── Print ───
        ipcMain.handle('print:html', async (event, htmlContent) => {
            try {
                const printWindow = new BrowserWindow({
                    width: 400,
                    height: 600,
                    show: false,
                    webPreferences: { nodeIntegration: false, contextIsolation: true },
                    parent: mainWindow,
                    modal: false,
                });
                await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
                return new Promise((resolve) => {
                    printWindow.webContents.on('did-finish-load', () => {
                        setTimeout(() => {
                            printWindow.webContents.print({
                                silent: false,
                                printBackground: true,
                            }, (success, failureReason) => {
                                setTimeout(() => {
                                    if (printWindow && !printWindow.isDestroyed()) {
                                        printWindow.close();
                                    }
                                }, 1000);
                                resolve({ success, error: failureReason });
                            });
                        }, 500);
                    });
                });
            } catch (error) {
                console.error('Print error:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('✅ All IPC handlers registered');
    } catch (error) {
        console.error('❌ Failed to setup IPC handlers:', error);
    }
}

// ─── CREATE WINDOW ──────────────────────────────────────────

function createWindow() {
    try {
        setupIpcHandlers();

        mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1024,
            minHeight: 768,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
                webSecurity: false,
                sandbox: false,
                backgroundThrottling: false,
                enableRemoteModule: false
            },
            icon: path.join(__dirname, 'icon.ico'),
            show: false,
            frame: true,
            backgroundColor: '#f1f5f9'
        });

        let startUrl;
        if (isDev) {
            startUrl = 'http://localhost:3000';
            console.log('📍 Loading from development server:', startUrl);
        } else {
            const indexPath = path.join(__dirname, '../build/index.html');
            if (fs.existsSync(indexPath)) {
                startUrl = `file://${indexPath}`;
                console.log('📍 Loading from:', startUrl);
            } else {
                const altPath = path.join(process.cwd(), 'build/index.html');
                if (fs.existsSync(altPath)) {
                    startUrl = `file://${altPath}`;
                    console.log('📍 Loading from:', startUrl);
                } else {
                    dialog.showErrorBox('Error', 'Application files not found. Please reinstall.');
                    app.quit();
                    return;
                }
            }
        }

        mainWindow.loadURL(startUrl);

        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            mainWindow.maximize();
            console.log('✅ Window ready and shown');
        });

        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        if (isDev) {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        }

        const menuTemplate = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Exit',
                        accelerator: 'CmdOrCtrl+Q',
                        click: () => app.quit()
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forcereload' },
                    { role: 'toggledevtools' },
                    { type: 'separator' },
                    { role: 'resetzoom' },
                    { role: 'zoomin' },
                    { role: 'zoomout' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About',
                        click: () => {
                            dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                title: 'About Phone Repair App',
                                message: '📱 Phone Repair Shop POS System',
                                detail: `Version: 1.0.0\n\nDatabase: SQLite\nMode: ${isDev ? 'Development' : 'Production'}`,
                                buttons: ['OK']
                            });
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

    } catch (error) {
        console.error('❌ Failed to create window:', error);
        app.quit();
    }
}

// ─── APP LIFECYCLE ──────────────────────────────────────────

app.whenReady().then(() => {
    console.log('🚀 App is ready');
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection:', reason);
});