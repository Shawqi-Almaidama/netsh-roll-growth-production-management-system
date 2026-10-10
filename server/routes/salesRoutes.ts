import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest, triggerLowStockNotifications } from '../auth.js';

const router = Router();

// Generate distinct Invoice Number: INV-YYYYMMDD-XXXX (verified unique in DB)
function generateInvoiceNo(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const maxRecord = db.prepare('SELECT COALESCE(MAX(id), 0) as maxId FROM SALES_INVOICES').get() as any;
  let nextNum = (maxRecord?.maxId || 0) + 1;
  const checkStmt = db.prepare('SELECT 1 FROM SALES_INVOICES WHERE invoice_no = ?');
  while (true) {
    const candidate = `INV-${dateStr}-${String(nextNum).padStart(4, '0')}`;
    if (!checkStmt.get(candidate)) {
      return candidate;
    }
    nextNum++;
  }
}

// -------------------------------------------------------------
// GET /sales/invoices - List Sales Invoices with filters
// -------------------------------------------------------------
router.get('/invoices', authenticate, requireRoles('SALES_OFFICER', 'ACCOUNTANT', 'ADMIN'), (req, res) => {
  const { customerId, startDate, endDate, status, search } = req.query;

  let query = `
    SELECT inv.id, inv.invoice_no, inv.customer_id, inv.user_id, inv.invoice_date,
           inv.subtotal, inv.discount, inv.tax_amount, inv.total_amount,
           inv.payment_status, inv.payment_status as status, inv.notes, inv.created_at,
           c.customer_name, c.customer_code, c.phone as customer_phone,
           c.address as customer_address, c.tax_number as customer_tax,
           u.full_name as issuer_name, u.full_name as created_by_name,
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
router.get('/invoices/:id', authenticate, requireRoles('SALES_OFFICER', 'ACCOUNTANT', 'ADMIN'), (req, res) => {
  const invId = Number(req.params.id);
  if (!Number.isInteger(invId) || invId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف الفاتورة غير صالح' });
  }

  const invoice = db.prepare(`
    SELECT inv.*,
           inv.payment_status as status,
           c.customer_name, c.customer_code, c.phone as customer_phone,
           c.address as customer_address, c.tax_number as customer_tax,
           u.full_name as issuer_name, u.full_name as created_by_name
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

  res.json({ success: true, invoice: { ...invoice, status: invoice.payment_status, lines, items: lines } });
});

// -------------------------------------------------------------
// POST /sales/invoices - Create Invoice (FR-10, UC-10)
// Enforces BR-01 (Check Stock), BR-03 (Decrease Stock), BR-05 (Customer Link & INVOICE_LINES)
// Enforces F-11 (Strict Catalog Unit Price Integrity)
// Fully Atomic Transaction
// -------------------------------------------------------------
router.post('/invoices', authenticate, requireRoles('SALES_OFFICER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { customerId, invoiceDate, discount, discountAmount, taxRate, paymentStatus, notes, lines, items } = req.body;
  const rawLines = Array.isArray(lines) ? lines : Array.isArray(items) ? items : null;
  const rawDiscount = discount !== undefined ? discount : discountAmount;

  // Basic validation
  if (!customerId || !Number.isInteger(Number(customerId)) || Number(customerId) <= 0) {
    return res.status(400).json({ success: false, message: 'يرجى تحديد العميل' });
  }

  if (!rawLines || rawLines.length === 0) {
    return res.status(400).json({ success: false, message: 'يجب أن تحتوي الفاتورة على بند واحد على الأقل (BR-05)' });
  }

  if (paymentStatus && !['PAID', 'PENDING', 'PARTIAL'].includes(paymentStatus)) {
    return res.status(400).json({ success: false, message: 'حالة الدفع غير صالحة (يجب أن تكون PAID أو PENDING أو PARTIAL)' });
  }

  if (rawDiscount !== undefined && (!Number.isFinite(Number(rawDiscount)) || Number(rawDiscount) < 0)) {
    return res.status(400).json({ success: false, message: 'قيمة الخصم لا يمكن أن تكون سالبة أو غير صالحة' });
  }

  if (taxRate !== undefined && (!Number.isFinite(Number(taxRate)) || Number(taxRate) < 0 || Number(taxRate) > 100)) {
    return res.status(400).json({ success: false, message: 'نسبة الضريبة يجب أن تكون بين 0 و 100' });
  }

  // Validate Customer
  const customer = db.prepare('SELECT id, customer_name FROM CUSTOMERS WHERE id = ?').get(Number(customerId));
  if (!customer) {
    return res.status(404).json({ success: false, message: 'العميل المحدد غير موجود في النظام' });
  }

  // BR-01 & Line Calculations: Validate each product and verify sufficient cumulative stock across all lines
  const validatedLines: Array<{
    productId: number;
    productCode: string;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    currentStock: number;
    minAlert: number;
  }> = [];

  const cumulativeQtyByProduct = new Map<number, number>();
  let computedSubtotal = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const item = rawLines[i];
    const qty = Number(item?.quantity);
    if (!item || !item.productId || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `البند رقم ${i + 1}: يجب تحديد المنتج وكمية صالحة أكبر من صفر` });
    }

    const product = db.prepare('SELECT id, product_code, product_name, unit, unit_price, current_stock, min_stock_alert FROM PRODUCTS WHERE id = ?').get(Number(item.productId)) as any;
    if (!product) {
      return res.status(404).json({ success: false, message: `المنتج المحدد في البند رقم ${i + 1} غير موجود` });
    }

    // F-11: Prevent price tampering — if client sends unitPrice, it must match the official catalog product.unit_price
    if (item.unitPrice !== undefined && item.unitPrice !== null) {
      const submittedPrice = Number(item.unitPrice);
      if (!Number.isFinite(submittedPrice) || submittedPrice <= 0 || Math.abs(submittedPrice - Number(product.unit_price)) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `البند رقم ${i + 1}: غير مسموح بالتلاعب بسعر الوحدة للمنتج "${product.product_name}". السعر المعتمد في النظام هو (${product.unit_price})`
        });
      }
    }

    const totalRequestedForProduct = (cumulativeQtyByProduct.get(product.id) || 0) + qty;
    cumulativeQtyByProduct.set(product.id, totalRequestedForProduct);

    // BR-01: Cumulative Stock Check
    if (product.current_stock < totalRequestedForProduct) {
      return res.status(400).json({
        success: false,
        message: `المخزون غير كافٍ للمنتج "${product.product_name}". الرصيد الحالي المتوفر بالمستودعات هو (${product.current_stock}) بينما إجمالي الكمية المطلوبة هي (${totalRequestedForProduct}). تم إيقاف العملية لمنع العجز (BR-01)`
      });
    }

    // Strictly enforce canonical catalog price from database
    const price = Number(product.unit_price);
    const lineTotal = Number((qty * price).toFixed(2));
    computedSubtotal += lineTotal;

    validatedLines.push({
      productId: product.id,
      productCode: product.product_code,
      productName: product.product_name,
      unit: product.unit,
      quantity: qty,
      unitPrice: price,
      lineTotal,
      currentStock: product.current_stock,
      minAlert: product.min_stock_alert
    });
  }

  computedSubtotal = Number(computedSubtotal.toFixed(2));
  const numDiscount = Math.max(0, Number(rawDiscount) || 0);
  if (numDiscount > computedSubtotal) {
    return res.status(400).json({ success: false, message: 'قيمة الخصم لا يمكن أن تتجاوز إجمالي قيمة الفاتورة' });
  }
  const taxable = Math.max(0, computedSubtotal - numDiscount);
  const taxPct = Math.max(0, Number(taxRate) || 0);
  const computedTax = Number(((taxable * taxPct) / 100).toFixed(2));
  const computedTotal = Number((taxable + computedTax).toFixed(2));

  const invDate = invoiceDate || new Date().toISOString().slice(0, 10);

  // EXECUTE ATOMIC TRANSACTION (BR-03 & Consistency Rule 33)
  try {
    db.exec('BEGIN TRANSACTION;');
    const invoiceNo = generateInvoiceNo();

    // 1. Insert SALES_INVOICES
    const insertInvoiceStmt = db.prepare(`
      INSERT INTO SALES_INVOICES (
        invoice_no, customer_id, user_id, invoice_date, subtotal, discount,
        tax_amount, total_amount, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const invResult = insertInvoiceStmt.run(
      invoiceNo,
      Number(customerId),
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

    const lowStockProductsTriggered: Array<{
      id: number;
      product_code: string;
      product_name: string;
      current_stock: number;
      min_stock_alert: number;
      unit: string;
    }> = [];

    for (const vLine of validatedLines) {
      insertLineStmt.run(invoiceId, vLine.productId, vLine.quantity, vLine.unitPrice, vLine.lineTotal);
      updateStockStmt.run(vLine.quantity, vLine.productId);
    }

    for (const [prodId, totalUsed] of cumulativeQtyByProduct.entries()) {
      const pInfo = validatedLines.find(l => l.productId === prodId)!;
      const remainingStock = pInfo.currentStock - totalUsed;
      if (remainingStock <= pInfo.minAlert) {
        lowStockProductsTriggered.push({
          id: pInfo.productId,
          product_code: pInfo.productCode,
          product_name: pInfo.productName,
          current_stock: remainingStock,
          min_stock_alert: pInfo.minAlert,
          unit: pInfo.unit
        });
      }
    }

    db.exec('COMMIT;');

    // Create notifications for low stock products across relevant roles
    if (lowStockProductsTriggered.length > 0) {
      triggerLowStockNotifications(lowStockProductsTriggered, `فاتورة مبيعات رقم ${invoiceNo}`);
    }

    res.status(201).json({
      success: true,
      message: `تم إصدار فاتورة المبيعات رقم ${invoiceNo} وتحديث المخزون بنجاح (BR-03)`,
      invoiceId,
      invoiceNo,
      totalAmount: computedTotal,
      lowStockWarnings: lowStockProductsTriggered
    });
  } catch (err: any) {
    try { db.exec('ROLLBACK;'); } catch {}
    console.error('Error creating sales invoice:', err);
    res.status(500).json({ success: false, message: 'فشلت عملية إنشاء الفاتورة وتحديث المخزون' });
  }
});

export default router;
