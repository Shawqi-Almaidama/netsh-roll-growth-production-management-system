import { Router, Response } from 'express';
import { db } from '../db.js';
import {
  authenticate,
  requireRoles,
  AuthenticatedRequest,
  triggerLowStockNotifications,
  resolveLowStockNotificationsIfRestocked
} from '../auth.js';

const router = Router();

// -------------------------------------------------------------
// PRODUCTS (FR-08, UC-09) & LOW STOCK ALERTS
// -------------------------------------------------------------
router.get('/products', authenticate, requireRoles('SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT', 'PROD_MANAGER', 'ADMIN'), (req, res) => {
  const { category, search, lowStockOnly } = req.query;

  let query = `
    SELECT p.id, p.product_code, p.product_name, p.category, p.unit, p.unit_price,
           p.current_stock, p.min_stock_alert, p.description,
           CASE WHEN p.current_stock <= p.min_stock_alert THEN 1 ELSE 0 END as is_low_stock,
           CASE WHEN p.current_stock <= 0 THEN 1 ELSE 0 END as is_out_of_stock,
           CASE WHEN p.current_stock > p.min_stock_alert AND p.current_stock <= (p.min_stock_alert * 1.25) THEN 1 ELSE 0 END as is_near_low_stock,
           CASE WHEN p.min_stock_alert > p.current_stock THEN ROUND(p.min_stock_alert - p.current_stock, 2) ELSE 0 END as deficit_qty
    FROM PRODUCTS p
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category && category !== 'all') {
    query += ' AND p.category = ?';
    params.push(String(category));
  }
  if (lowStockOnly === 'true' || lowStockOnly === '1') {
    query += ' AND p.current_stock <= p.min_stock_alert';
  }
  if (search) {
    query += ' AND (p.product_code LIKE ? OR p.product_name LIKE ? OR p.category LIKE ? OR p.unit LIKE ? OR p.description LIKE ?)';
    const s = `%${String(search).trim()}%`;
    params.push(s, s, s, s, s);
  }

  query += ' ORDER BY (p.current_stock <= p.min_stock_alert) DESC, p.category, p.product_name';

  const products = db.prepare(query).all(...params);
  res.json({ success: true, products });
});

// Dedicated Low Stock Alerts Endpoint
router.get('/low-stock-alerts', authenticate, requireRoles('SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT', 'PROD_MANAGER', 'ADMIN'), (req, res) => {
  const allProducts = db.prepare(`
    SELECT p.id, p.product_code, p.product_name, p.category, p.unit, p.unit_price,
           p.current_stock, p.min_stock_alert, p.description,
           CASE WHEN p.current_stock <= p.min_stock_alert THEN 1 ELSE 0 END as is_low_stock,
           CASE WHEN p.current_stock <= 0 THEN 1 ELSE 0 END as is_out_of_stock,
           CASE WHEN p.current_stock > p.min_stock_alert AND p.current_stock <= (p.min_stock_alert * 1.25) THEN 1 ELSE 0 END as is_near_low_stock,
           CASE WHEN p.min_stock_alert > p.current_stock THEN ROUND(p.min_stock_alert - p.current_stock, 2) ELSE 0 END as deficit_qty
    FROM PRODUCTS p
    ORDER BY p.current_stock ASC, p.product_name ASC
  `).all() as any[];

  const lowStockProducts = allProducts
    .filter(p => Number(p.current_stock) <= Number(p.min_stock_alert))
    .map(p => ({
      ...p,
      severity: Number(p.current_stock) <= 0 || Number(p.current_stock) <= Number(p.min_stock_alert) * 0.5 ? 'CRITICAL' : 'WARNING',
      recommended_restock_qty: Math.max(Number(p.min_stock_alert) * 2 - Number(p.current_stock), Number(p.min_stock_alert) || 10)
    }));

  const nearLowStockProducts = allProducts.filter(
    p => Number(p.current_stock) > Number(p.min_stock_alert) && Number(p.current_stock) <= Number(p.min_stock_alert) * 1.25
  );

  res.json({
    success: true,
    lowStockProducts,
    nearLowStockProducts,
    summary: {
      totalProductsCount: allProducts.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: lowStockProducts.filter(p => Number(p.current_stock) <= 0).length,
      nearLowStockCount: nearLowStockProducts.length
    }
  });
});

router.post('/products', authenticate, requireRoles('SALES_OFFICER', 'ADMIN'), (req, res) => {
  const { productCode, productName, category, unit, unitPrice, initialStock, minStockAlert, description } = req.body;

  if (!productCode || !productName || !category || !unit || unitPrice === undefined) {
    return res.status(400).json({ success: false, message: 'كود المنتج، اسمه، فئته، وحدته، وسعر الوحدة حقول إلزامية' });
  }

  const numPrice = Number(unitPrice);
  const numStock = initialStock !== undefined ? Number(initialStock) : 0;
  const numAlert = minStockAlert !== undefined ? Number(minStockAlert) : 10;

  if (!Number.isFinite(numPrice) || numPrice < 0 || !Number.isFinite(numStock) || numStock < 0 || !Number.isFinite(numAlert) || numAlert < 0) {
    return res.status(400).json({ success: false, message: 'سعر الوحدة والرصيد الابتدائي وحد الإنذار يجب أن تكون أرقاماً غير سالبة' });
  }

  const existing = db.prepare('SELECT id FROM PRODUCTS WHERE product_code = ?').get(String(productCode).trim());
  if (existing) {
    return res.status(400).json({ success: false, message: 'كود المنتج مسجل مسبقاً' });
  }

  const result = db.prepare(`
    INSERT INTO PRODUCTS (product_code, product_name, category, unit, unit_price, current_stock, min_stock_alert, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(productCode).trim(),
    String(productName).trim(),
    String(category).trim(),
    String(unit).trim(),
    numPrice,
    numStock,
    numAlert,
    description || null
  );

  const newProdId = Number(result.lastInsertRowid);
  if (numStock <= numAlert) {
    triggerLowStockNotifications(
      [
        {
          id: newProdId,
          product_code: String(productCode).trim(),
          product_name: String(productName).trim(),
          current_stock: numStock,
          min_stock_alert: numAlert,
          unit: String(unit).trim()
        }
      ],
      `إضافة منتج برصيد ابتدائي تحت حد الإنذار: ${String(productCode).trim()}`
    );
  }

  res.status(201).json({ success: true, message: 'تم إضافة المنتج بنجاح', productId: result.lastInsertRowid });
});

router.put('/products/:id', authenticate, requireRoles('SALES_OFFICER', 'ADMIN'), (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف المنتج غير صالح' });
  }

  const { productName, category, unit, unitPrice, minStockAlert, description } = req.body;

  const current = db.prepare('SELECT * FROM PRODUCTS WHERE id = ?').get(productId) as any;
  if (!current) {
    return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
  }

  if (unitPrice !== undefined && (!Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0)) {
    return res.status(400).json({ success: false, message: 'سعر الوحدة لا يمكن أن يكون سالباً' });
  }

  if (minStockAlert !== undefined && (!Number.isFinite(Number(minStockAlert)) || Number(minStockAlert) < 0)) {
    return res.status(400).json({ success: false, message: 'حد الإنذار لا يمكن أن يكون سالباً' });
  }

  db.prepare(`
    UPDATE PRODUCTS
    SET product_name = COALESCE(?, product_name),
        category = COALESCE(?, category),
        unit = COALESCE(?, unit),
        unit_price = COALESCE(?, unit_price),
        min_stock_alert = COALESCE(?, min_stock_alert),
        description = COALESCE(?, description)
    WHERE id = ?
  `).run(
    productName || null,
    category || null,
    unit || null,
    unitPrice !== undefined ? Number(unitPrice) : null,
    minStockAlert !== undefined ? Number(minStockAlert) : null,
    description !== undefined ? description : null,
    productId
  );

  const updated = db.prepare('SELECT * FROM PRODUCTS WHERE id = ?').get(productId) as any;
  if (updated) {
    if (Number(updated.current_stock) <= Number(updated.min_stock_alert)) {
      triggerLowStockNotifications([updated], `تحديث حد الإنذار للمنتج ${updated.product_code}`);
    } else {
      resolveLowStockNotificationsIfRestocked(productId);
    }
  }

  res.json({ success: true, message: 'تم تحديث بيانات المنتج بنجاح', product: updated });
});

// -------------------------------------------------------------
// CUSTOMERS (FR-09, UC-09)
// -------------------------------------------------------------
router.get('/customers', authenticate, requireRoles('SALES_OFFICER', 'ACCOUNTANT', 'ADMIN'), (req, res) => {
  const { search } = req.query;

  let query = `
    SELECT c.id, c.customer_code, c.customer_name, c.phone, c.address,
           c.commercial_reg, c.tax_number, c.customer_type, c.notes, c.created_at,
           (SELECT COUNT(*) FROM SALES_INVOICES inv WHERE inv.customer_id = c.id) as total_invoices,
           (SELECT COALESCE(SUM(total_amount), 0) FROM SALES_INVOICES inv WHERE inv.customer_id = c.id) as total_sales
    FROM CUSTOMERS c
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    query += ' AND (c.customer_code LIKE ? OR c.customer_name LIKE ? OR c.phone LIKE ? OR c.address LIKE ? OR c.commercial_reg LIKE ? OR c.tax_number LIKE ?)';
    const s = `%${String(search).trim()}%`;
    params.push(s, s, s, s, s, s);
  }

  query += ' ORDER BY c.customer_name ASC';

  const customers = db.prepare(query).all(...params);
  res.json({ success: true, customers });
});

router.post('/customers', authenticate, requireRoles('SALES_OFFICER', 'ADMIN'), (req, res) => {
  const { customerCode, customerName, phone, address, commercialReg, taxNumber, customerType, notes } = req.body;

  if (!customerCode || !customerName || !phone) {
    return res.status(400).json({ success: false, message: 'كود العميل، الاسم، ورقم الهاتف حقول إلزامية' });
  }

  if (customerType && !['WHOLESALE', 'RETAIL', 'DISTRIBUTOR'].includes(customerType)) {
    return res.status(400).json({ success: false, message: 'نوع العميل غير صالح' });
  }

  const existing = db.prepare('SELECT id FROM CUSTOMERS WHERE customer_code = ?').get(String(customerCode).trim());
  if (existing) {
    return res.status(400).json({ success: false, message: 'كود العميل مسجل مسبقاً' });
  }

  const result = db.prepare(`
    INSERT INTO CUSTOMERS (customer_code, customer_name, phone, address, commercial_reg, tax_number, customer_type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(customerCode).trim(),
    String(customerName).trim(),
    String(phone).trim(),
    address || null,
    commercialReg || null,
    taxNumber || null,
    customerType || 'WHOLESALE',
    notes || null
  );

  res.status(201).json({ success: true, message: 'تم تسجيل العميل بنجاح', customerId: result.lastInsertRowid });
});

router.put('/customers/:id', authenticate, requireRoles('SALES_OFFICER', 'ADMIN'), (req, res) => {
  const customerId = Number(req.params.id);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف العميل غير صالح' });
  }

  const { customerName, phone, address, commercialReg, taxNumber, customerType, notes } = req.body;

  const current = db.prepare('SELECT id FROM CUSTOMERS WHERE id = ?').get(customerId);
  if (!current) {
    return res.status(404).json({ success: false, message: 'العميل غير موجود' });
  }

  if (customerType && !['WHOLESALE', 'RETAIL', 'DISTRIBUTOR'].includes(customerType)) {
    return res.status(400).json({ success: false, message: 'نوع العميل غير صالح' });
  }

  db.prepare(`
    UPDATE CUSTOMERS
    SET customer_name = COALESCE(?, customer_name),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        commercial_reg = COALESCE(?, commercial_reg),
        tax_number = COALESCE(?, tax_number),
        customer_type = COALESCE(?, customer_type),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(customerName || null, phone || null, address || null, commercialReg || null, taxNumber || null, customerType || null, notes || null, customerId);

  res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح' });
});

// -------------------------------------------------------------
// OPERATIONAL CATALOGS (FEED, TREATMENT, SUPPLY ITEMS)
// -------------------------------------------------------------
router.get('/feed-items', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'WAREHOUSE_KEEPER', 'ADMIN'), (req, res) => {
  const items = db.prepare('SELECT * FROM FEED_ITEMS ORDER BY item_name').all();
  res.json({ success: true, items });
});

router.get('/treatment-items', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'WAREHOUSE_KEEPER', 'ADMIN'), (req, res) => {
  const items = db.prepare('SELECT * FROM TREATMENT_ITEMS ORDER BY item_name').all();
  res.json({ success: true, items });
});

router.get('/supply-items', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'WAREHOUSE_KEEPER', 'ADMIN'), (req, res) => {
  const items = db.prepare('SELECT * FROM SUPPLY_ITEMS ORDER BY item_name').all();
  res.json({ success: true, items });
});

export default router;
