// src/database/sqlite.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

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

            -- ✅ PURCHASE RETURNS TABLE
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

            -- ✅ PURCHASE RETURN LINES TABLE
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

            -- Indexes
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
        
        // Insert default users if they don't exist
        insertDefaultUsers();
    } catch (error) {
        console.error('❌ Failed to initialize schema:', error);
        throw error;
    }
}

function insertDefaultUsers() {
    try {
        const count = db.prepare('SELECT COUNT(*) as count FROM workers').get();
        if (count.count > 0) {
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

function closeDatabase() {
    if (db) {
        try {
            db.close();
            db = null;
            console.log('✅ Database connection closed');
        } catch (error) {
            console.error('❌ Error closing database:', error);
        }
    }
}

module.exports = {
    initDatabase,
    getDb,
    closeDatabase
};