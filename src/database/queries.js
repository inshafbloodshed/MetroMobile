// src/database/queries.js
const { getDb } = require('./sqlite');

class DatabaseQueries {
    constructor() {
        this.db = getDb();
    }
    
    // ─── Suppliers ───
    getAllSuppliers(activeOnly = true) {
        const sql = activeOnly 
            ? 'SELECT * FROM suppliers WHERE active = 1 ORDER BY name'
            : 'SELECT * FROM suppliers ORDER BY name';
        return this.db.prepare(sql).all();
    }
    
    getSupplier(id) {
        return this.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    }
    
    createSupplier(supplier) {
        const stmt = this.db.prepare(`
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
    }
    
    updateSupplier(id, data) {
        try {
            const existing = this.getSupplier(id);
            if (!existing) {
                return { changes: 0, error: 'Supplier not found' };
            }
            
            const stmt = this.db.prepare(`
                UPDATE suppliers 
                SET name = ?, phone = ?, address = ?, active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            
            return stmt.run(
                data.name !== undefined ? data.name : existing.name,
                data.phone !== undefined ? data.phone : existing.phone,
                data.address !== undefined ? data.address : existing.address,
                data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
                id
            );
        } catch (error) {
            console.error('updateSupplier error:', error);
            throw error;
        }
    }
    
    // ─── Products ───
    getAllProducts(activeOnly = true) {
        const sql = activeOnly
            ? 'SELECT * FROM products WHERE active = 1 ORDER BY name'
            : 'SELECT * FROM products ORDER BY name';
        return this.db.prepare(sql).all();
    }
    
    getProduct(id) {
        return this.db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    }
    
    getProductByCode(code) {
        return this.db.prepare('SELECT * FROM products WHERE code = ?').get(code);
    }
    
    getProductsBySupplier(supplierId) {
        return this.db.prepare('SELECT * FROM products WHERE supplier_id = ? ORDER BY name')
            .all(supplierId);
    }
    
    createProduct(product) {
        const stmt = this.db.prepare(`
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
    }
    
    updateProduct(id, product) {
        const stmt = this.db.prepare(`
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
    }
    
    // ─── GRNs ───
    getAllGRNs() {
        return this.db.prepare('SELECT * FROM grns ORDER BY created_at DESC').all();
    }
    
    getGRN(id) {
        const grn = this.db.prepare('SELECT * FROM grns WHERE id = ?').get(id);
        if (grn) {
            grn.lines = this.db.prepare('SELECT * FROM grn_lines WHERE grn_id = ?').all(id);
        }
        return grn;
    }
    
    createGRN(grn) {
        const stmt = this.db.prepare(`
            INSERT INTO grns (
                id, supplier_id, supplier_name, bill_no, bill_type, date,
                sub_total, discount, net_total, amt_paid, settled, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
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
    }
    
    createGRNLines(grnId, lines) {
        const stmt = this.db.prepare(`
            INSERT INTO grn_lines (
                grn_id, product_id, name, code, qty, cost_price, sell_price,
                total, brand, model, barcode_num, encrypted_cost
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertMany = this.db.transaction((lines) => {
            for (const line of lines) {
                stmt.run(
                    grnId, 
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
        });
        
        return insertMany(lines);
    }
    
    // ─── Returns (Purchase Returns) ───
    getAllReturns() {
        return this.db.prepare('SELECT * FROM returns ORDER BY created_at DESC').all();
    }
    
    getReturn(id) {
        const ret = this.db.prepare('SELECT * FROM returns WHERE id = ?').get(id);
        if (ret) {
            ret.lines = this.db.prepare('SELECT * FROM return_lines WHERE return_id = ?').all(id);
        }
        return ret;
    }
    
    createReturn(returnData) {
        const stmt = this.db.prepare(`
            INSERT INTO returns (
                id, grn_id, supplier_name, date, subtotal,
                discount_percent, discount_amount, net_total, pay_method, reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
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
    }
    
    createReturnLines(returnId, lines) {
        const stmt = this.db.prepare(`
            INSERT INTO return_lines (
                return_id, product_id, name, code, return_qty, max_qty,
                cost_price, refund_total, grn_ref
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertMany = this.db.transaction((lines) => {
            for (const line of lines) {
                stmt.run(
                    returnId, 
                    line.product_id, 
                    line.name, 
                    line.code || null,
                    line.return_qty || 1, 
                    line.max_qty || 1,
                    line.cost_price || 0, 
                    line.refund_total || 0,
                    line.grn_ref || null
                );
            }
        });
        
        return insertMany(lines);
    }

    // ─── Sales Invoices ───
    getAllSalesInvoices() {
        const invoices = this.db.prepare(`
            SELECT 
                id, date, customer, mobile, address, subtotal, discount, payable,
                paid, due, method, reference, remarks, status, is_credit_sale, created_by, created_at
            FROM sales_invoices 
            ORDER BY created_at DESC
        `).all();
        
        for (const invoice of invoices) {
            try {
                const lines = this.db.prepare(`
                    SELECT 
                        id,
                        product_id,
                        product_name AS name,
                        qty,
                        sell_price AS sellPrice,
                        total
                    FROM sales_invoice_lines 
                    WHERE invoice_id = ?
                `).all(invoice.id);
                
                invoice.lines = lines.map(line => ({
                    id: line.product_id,
                    name: line.name,
                    qty: line.qty,
                    sellPrice: line.sellPrice,
                    total: line.total
                }));
            } catch (error) {
                invoice.lines = [];
            }
        }
        
        return invoices;
    }

    getSalesInvoice(id) {
        const invoice = this.db.prepare(`
            SELECT 
                id, date, customer, mobile, address, subtotal, discount, payable,
                paid, due, method, reference, remarks, status, is_credit_sale, created_by, created_at
            FROM sales_invoices 
            WHERE id = ?
        `).get(id);
        
        if (invoice) {
            try {
                const lines = this.db.prepare(`
                    SELECT 
                        id,
                        product_id,
                        product_name AS name,
                        qty,
                        sell_price AS sellPrice,
                        total
                    FROM sales_invoice_lines 
                    WHERE invoice_id = ?
                `).all(id);
                
                invoice.lines = lines.map(line => ({
                    id: line.product_id,
                    name: line.name,
                    qty: line.qty,
                    sellPrice: line.sellPrice,
                    total: line.total
                }));
            } catch (error) {
                invoice.lines = [];
            }
        }
        
        return invoice;
    }

    getSalesInvoicesByCustomer(customerName) {
        const invoices = this.db.prepare(`
            SELECT 
                id, date, customer, mobile, address, subtotal, discount, payable,
                paid, due, method, reference, remarks, status, is_credit_sale, created_by, created_at
            FROM sales_invoices 
            WHERE customer LIKE ?
            ORDER BY created_at DESC
        `).all(`%${customerName}%`);
        
        for (const invoice of invoices) {
            try {
                const lines = this.db.prepare(`
                    SELECT 
                        id,
                        product_id,
                        product_name AS name,
                        qty,
                        sell_price AS sellPrice,
                        total
                    FROM sales_invoice_lines 
                    WHERE invoice_id = ?
                `).all(invoice.id);
                
                invoice.lines = lines.map(line => ({
                    id: line.product_id,
                    name: line.name,
                    qty: line.qty,
                    sellPrice: line.sellPrice,
                    total: line.total
                }));
            } catch (error) {
                invoice.lines = [];
            }
        }
        
        return invoices;
    }

    createSalesInvoice(invoice) {
        const stmt = this.db.prepare(`
            INSERT INTO sales_invoices (
                id, date, customer, mobile, address, subtotal, discount, payable,
                paid, due, method, reference, remarks, status, is_credit_sale, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
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
        
        if (invoice.lines && invoice.lines.length > 0) {
            this.createSalesInvoiceLines(invoice.id, invoice.lines);
        }
        
        return result;
    }

    createSalesInvoiceLines(invoiceId, lines) {
        const stmt = this.db.prepare(`
            INSERT INTO sales_invoice_lines (
                invoice_id, product_id, product_name, qty, sell_price, total
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const insertMany = this.db.transaction((lines) => {
            for (const line of lines) {
                stmt.run(
                    invoiceId,
                    line.product_id || line.id,
                    line.product_name || line.name,
                    line.qty || 1,
                    line.sell_price || line.price || 0,
                    (line.qty || 1) * (line.sell_price || line.price || 0)
                );
            }
        });
        
        return insertMany(lines);
    }

    updateSalesInvoice(id, invoice) {
        const stmt = this.db.prepare(`
            UPDATE sales_invoices SET
                date = ?, customer = ?, mobile = ?, address = ?,
                subtotal = ?, discount = ?, payable = ?, paid = ?, due = ?,
                method = ?, reference = ?, remarks = ?, status = ?,
                is_credit_sale = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        const result = stmt.run(
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
        
        this.db.prepare('DELETE FROM sales_invoice_lines WHERE invoice_id = ?').run(id);
        if (invoice.lines && invoice.lines.length > 0) {
            this.createSalesInvoiceLines(id, invoice.lines);
        }
        
        return result;
    }

    deleteSalesInvoice(id) {
        return this.db.prepare('DELETE FROM sales_invoices WHERE id = ?').run(id);
    }

    // ─── Sales Returns ───
    getAllSalesReturns() {
        try {
            // Check if table exists
            const tableCheck = this.db.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='sales_returns'"
            ).get();
            
            if (!tableCheck) {
                console.log('📋 sales_returns table does not exist yet');
                return [];
            }
            
            const results = this.db.prepare(`
                SELECT * FROM sales_returns ORDER BY created_at DESC
            `).all();
            
            return results.map(r => ({
                ...r,
                returned_items: r.returned_items ? JSON.parse(r.returned_items) : [],
                exchange_items: r.exchange_items ? JSON.parse(r.exchange_items) : []
            }));
        } catch (error) {
            console.error('Error getting sales returns:', error);
            return [];
        }
    }

    getSalesReturn(id) {
        try {
            const ret = this.db.prepare('SELECT * FROM sales_returns WHERE id = ?').get(id);
            if (ret) {
                ret.returned_items = ret.returned_items ? JSON.parse(ret.returned_items) : [];
                ret.exchange_items = ret.exchange_items ? JSON.parse(ret.exchange_items) : [];
            }
            return ret;
        } catch (error) {
            console.error('Error getting sales return:', error);
            return null;
        }
    }

    createSalesReturn(returnData) {
        console.log('📝 createSalesReturn called with:', returnData);
        
        try {
            // ✅ Verify invoice_id exists
            if (!returnData.invoice_id) {
                console.error('❌ invoice_id is missing!');
                throw new Error('invoice_id is required');
            }
            
            const stmt = this.db.prepare(`
                INSERT INTO sales_returns (
                    id, invoice_id, customer, mobile, return_date, return_type,
                    return_subtotal, restock_fee, net_refund, exchange_value,
                    net_balance, refund_method, refund_reference, remarks,
                    processed_by, returned_items, exchange_items
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(
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
            
            console.log('✅ Sales return inserted:', result);
            return { success: true, id: returnData.id };
            
        } catch (error) {
            console.error('❌ Error in createSalesReturn:', error);
            throw error;
        }
    }

    deleteSalesReturn(id) {
        return this.db.prepare('DELETE FROM sales_returns WHERE id = ?').run(id);
    }

    // ─── Credits ───
    getAllCredits() {
        return this.db.prepare(`
            SELECT * FROM credits ORDER BY created_at DESC
        `).all();
    }

    getCredit(id) {
        const credit = this.db.prepare('SELECT * FROM credits WHERE id = ?').get(id);
        if (credit) {
            credit.payments = this.db.prepare('SELECT * FROM credit_payments WHERE credit_id = ?').all(id);
        }
        return credit;
    }

    getCreditsByCustomer(customerName) {
        const sql = `
            SELECT * FROM credits 
            WHERE customer_name LIKE ? AND status = 'pending'
            ORDER BY created_at DESC
        `;
        return this.db.prepare(sql).all(`%${customerName}%`);
    }

    createCredit(credit) {
        const stmt = this.db.prepare(`
            INSERT INTO credits (
                id, invoice_id, customer_name, mobile, date, total_amount,
                paid_amount, balance, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
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
        
        if (credit.payments && credit.payments.length > 0) {
            this.createCreditPayments(credit.id, credit.payments);
        }
        
        return result;
    }

    createCreditPayments(creditId, payments) {
        const stmt = this.db.prepare(`
            INSERT INTO credit_payments (credit_id, date, amount, method, reference)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const insertMany = this.db.transaction((payments) => {
            for (const payment of payments) {
                stmt.run(
                    creditId,
                    payment.date,
                    payment.amount || 0,
                    payment.method || 'Cash',
                    payment.reference || null
                );
            }
        });
        
        return insertMany(payments);
    }

    updateCredit(credit) {
        const stmt = this.db.prepare(`
            UPDATE credits SET
                total_amount = ?, paid_amount = ?, balance = ?, status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        const result = stmt.run(
            credit.totalAmount || 0,
            credit.paidAmount || 0,
            credit.balance || 0,
            credit.status || 'pending',
            credit.id
        );
        
        if (credit.newPayment) {
            this.createCreditPayments(credit.id, [credit.newPayment]);
        }
        
        return result;
    }

    deleteCredit(id) {
        return this.db.prepare('DELETE FROM credits WHERE id = ?').run(id);
    }

    // ─── Workers ───
    getAllWorkers(activeOnly = true) {
        const sql = activeOnly 
            ? 'SELECT * FROM workers WHERE active = 1 ORDER BY name'
            : 'SELECT * FROM workers ORDER BY name';
        return this.db.prepare(sql).all();
    }

    getWorkerByUsername(username) {
        return this.db.prepare('SELECT * FROM workers WHERE username = ?').get(username);
    }

    createWorker(worker) {
        const stmt = this.db.prepare(`
            INSERT INTO workers (id, name, username, password, role, active, joinedDate, permissions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            worker.id,
            worker.name,
            worker.username,
            worker.password,
            worker.role || 'user',
            worker.active !== false ? 1 : 0,
            worker.joinedDate || new Date().toISOString().slice(0, 10),
            worker.permissions ? JSON.stringify(worker.permissions) : null
        );
    }

    updateWorker(id, data) {
        const stmt = this.db.prepare(`
            UPDATE workers 
            SET name = ?, username = ?, password = ?, role = ?, active = ?, permissions = ?
            WHERE id = ?
        `);
        return stmt.run(
            data.name,
            data.username,
            data.password,
            data.role || 'user',
            data.active !== false ? 1 : 0,
            data.permissions ? JSON.stringify(data.permissions) : null,
            id
        );
    }

    deleteWorker(id) {
        return this.db.prepare('DELETE FROM workers WHERE id = ?').run(id);
    }
}

module.exports = DatabaseQueries;