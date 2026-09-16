import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest, createNotification } from '../auth.js';

const router = Router();

// Generate distinct Invoice Number: INV-YYYYMMDD-XXXX
function generateInvoiceNo(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countRecord = db.prepare(`SELECT COUNT(*) as count FROM SALES_INVOICES WHERE invoice_date LIKE ?`).get(`${new Date().toISOString().slice(0, 7)}%`) as any;
  const seq = String((countRecord?.count || 0) + 1).padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
}

// -------------------------------------------------------------
// GET /sales/invoices - List Sales Invoices with filters
// -------------------------------------------------------------
router.get('/invoices', authenticate, (req, res) => {
  const { customerId, startDate, endDate, status, search } = req.query;

  let query = `
    SELECT inv.id, inv.invoice_no, inv.customer_id, inv.user_id, inv.invoice_date,
           inv.subtotal, inv.discount, inv.tax_amount, inv.total_amount,
           inv.payment_status, inv.notes, inv.created_at,
           c.customer_name, c.customer_code, c.phone as customer_phone,
           u.full_name as issuer_name,
           (SELECT COUNT(*) FROM INVOICE_LINES il WHERE il.invoice_id = inv.id) as lines_count
    FROM SALES_INVOICES inv
    JOIN CUSTOMERS c ON inv.customer_id = c.id
    JOIN USERS u ON inv.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (customerId) {
    query += ' AND inv.customer_id = ?';
    params.push(Number(customerId));
  }
  if (status) {
    query += ' AND inv.payment_status = ?';
    params.push(String(status));
  }
  if (startDate) {
    query += ' AND inv.invoice_date >= ?';
    params.push(String(startDate));
  }
  if (endDate) {
    query += ' AND inv.invoice_date <= ?';
    params.push(String(endDate));
  }
  if (search) {
    query += ' AND (inv.invoice_no LIKE ? OR c.customer_name LIKE ? OR inv.notes LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY inv.id DESC LIMIT 200';

  const invoices = db.prepare(query).all(...params);
  res.json({ success: true, invoices });
});

// -------------------------------------------------------------
// GET /sales/invoices/:id - Invoice Details with Lines
// -------------------------------------------------------------
router.get('/invoices/:id', authenticate, (req, res) => {
  const invId = Number(req.params.id);

  const invoice = db.prepare(`
    SELECT inv.*,
           c.customer_name, c.customer_code, c.phone as customer_phone,
           c.address as customer_address, c.tax_number as customer_tax,
           u.full_name as issuer_name
    FROM SALES_INVOICES inv
    JOIN CUSTOMERS c ON inv.customer_id = c.id
    JOIN USERS u ON inv.user_id = u.id
    WHERE inv.id = ?
  `).get(invId) as any;

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'فاتورة المبيعات غير موجودة' });
  }

  const lines = db.prepare(`
    SELECT il.id, il.product_id, il.quantity, il.unit_price, il.line_total,
           p.product_code, p.product_name, p.unit, p.category
    FROM INVOICE_LINES il
    JOIN PRODUCTS p ON il.product_id = p.id
    WHERE il.invoice_id = ?
    ORDER BY il.id ASC
  `).all(invId);

  res.json({ success: true, invoice: { ...invoice, lines } });
});

// -------------------------------------------------------------
// POST /sales/invoices - Create Invoice (FR-10, UC-10)
// Enforces BR-01 (Check Stock), BR-03 (Decrease Stock), BR-05 (Calculations)
// Fully Atomic Transaction
// -------------------------------------------------------------
router.post('/invoices', authenticate, requireRoles('SALES_OFFICER', 'PROD_MGR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { customerId, invoiceDate, discount, taxRate, paymentStatus, notes, lines } = req.body;

  // Basic validation
  if (!customerId) {
    return res.status(400).json({ success: false, message: 'يرجى تحديد العميل' });
  }

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ success: false, message: 'يجب أن تحتوي الفاتورة على بند واحد على الأقل (BR-05)' });
  }

  // Validate Customer
  const customer = db.prepare('SELECT id, customer_name FROM CUSTOMERS WHERE id = ?').get(customerId);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'العميل المحدد غير موجود في النظام' });
  }

  // BR-01 & Line Calculations: Validate each product and verify sufficient stock
  const validatedLines: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    currentStock: number;
    minAlert: number;
  }> = [];

  let computedSubtotal = 0;

  for (let i = 0; i < lines.length; i++) {
    const item = lines[i];
    const qty = Number(item.quantity);
    if (!item.productId || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `البند رقم ${i + 1}: يجب تحديد المنتج وكمية صالحة أكبر من صفر` });
    }

    const product = db.prepare('SELECT id, product_name, unit_price, current_stock, min_stock_alert FROM PRODUCTS WHERE id = ?').get(item.productId) as any;
    if (!product) {
      return res.status(404).json({ success: false, message: `المنتج المحدد في البند رقم ${i + 1} غير موجود` });
    }

    // BR-01: Stock Check
    if (product.current_stock < qty) {
      return res.status(400).json({
        success: false,
        message: `المخزون غير كافٍ للمنتج "${product.product_name}". الرصيد الحالي المتوفر بالمستودعات هو (${product.current_stock}) بينما الكمية المطلوبة هي (${qty}). تم إيقاف العملية لمنع العجز (BR-01)`
      });
    }

    const price = item.unitPrice !== undefined && Number(item.unitPrice) >= 0 ? Number(item.unitPrice) : Number(product.unit_price);
    const lineTotal = Number((qty * price).toFixed(2));
    computedSubtotal += lineTotal;

    validatedLines.push({
      productId: product.id,
      productName: product.product_name,
      quantity: qty,
      unitPrice: price,
      lineTotal,
      currentStock: product.current_stock,
      minAlert: product.min_stock_alert
    });
  }

  computedSubtotal = Number(computedSubtotal.toFixed(2));
  const numDiscount = Math.max(0, Number(discount) || 0);
  const taxable = Math.max(0, computedSubtotal - numDiscount);
  const taxPct = Math.max(0, Number(taxRate) || 0);
  const computedTax = Number(((taxable * taxPct) / 100).toFixed(2));
  const computedTotal = Number((taxable + computedTax).toFixed(2));

  const invoiceNo = generateInvoiceNo();
  const invDate = invoiceDate || new Date().toISOString().slice(0, 10);

  // EXECUTE ATOMIC TRANSACTION (BR-03 & Consistency Rule 33)
  try {
    db.exec('BEGIN TRANSACTION;');

    // 1. Insert SALES_INVOICES
    const insertInvoiceStmt = db.prepare(`
      INSERT INTO SALES_INVOICES (
        invoice_no, customer_id, user_id, invoice_date, subtotal, discount,
        tax_amount, total_amount, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const invResult = insertInvoiceStmt.run(
      invoiceNo,
      customerId,
      req.user!.id,
      invDate,
      computedSubtotal,
      numDiscount,
      computedTax,
      computedTotal,
      paymentStatus || 'PAID',
      notes || null
    );

    const invoiceId = Number(invResult.lastInsertRowid);

    // 2. Insert INVOICE_LINES & Decrement Product Stock (BR-03)
    const insertLineStmt = db.prepare(`
      INSERT INTO INVOICE_LINES (invoice_id, product_id, quantity, unit_price, line_total)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      UPDATE PRODUCTS
      SET current_stock = current_stock - ?
      WHERE id = ?
    `);

    const lowStockAlerts: string[] = [];

    for (const vLine of validatedLines) {
      insertLineStmt.run(invoiceId, vLine.productId, vLine.quantity, vLine.unitPrice, vLine.lineTotal);
      updateStockStmt.run(vLine.quantity, vLine.productId);

      const remainingStock = vLine.currentStock - vLine.quantity;
      if (remainingStock <= vLine.minAlert) {
        lowStockAlerts.push(`${vLine.productName} (الرصيد المتبقي: ${remainingStock})`);
      }
    }

    db.exec('COMMIT;');

    // Create notifications for low stock products
    if (lowStockAlerts.length > 0) {
      createNotification({
        roleTarget: 'PROD_MGR',
        title: 'تنبيه: انخفاض مخزون بعض المنتجات للحد الأدنى',
        message: `تم إصدار الفاتورة ${invoiceNo} وأصبح مخزون المواد التالية أقل من الحد الحرج: ${lowStockAlerts.join('، ')}`,
        type: 'WARNING',
        link: '/products'
      });
    }

    res.status(201).json({
      success: true,
      message: `تم إصدار فاتورة المبيعات رقم ${invoiceNo} وتحديث المخزون بنجاح (BR-03)`,
      invoiceId,
      invoiceNo,
      totalAmount: computedTotal
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    console.error('Error creating sales invoice:', err);
    res.status(500).json({ success: false, message: 'فشلت عملية إنشاء الفاتورة وتحديث المخزون: ' + err.message });
  }
});

export default router;
