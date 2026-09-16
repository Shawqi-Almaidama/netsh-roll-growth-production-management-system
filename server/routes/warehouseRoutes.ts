import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest, createNotification } from '../auth.js';

const router = Router();

// Generate distinct Receipt Number: RCP-YYYYMMDD-XXXX
function generateReceiptNo(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countRecord = db.prepare(`SELECT COUNT(*) as count FROM WAREHOUSE_RECEIPTS WHERE receipt_date LIKE ?`).get(`${new Date().toISOString().slice(0, 7)}%`) as any;
  const seq = String((countRecord?.count || 0) + 1).padStart(4, '0');
  return `RCP-${dateStr}-${seq}`;
}

// -------------------------------------------------------------
// GET /warehouses - List Warehouses
// -------------------------------------------------------------
router.get('/list', authenticate, (req, res) => {
  const warehouses = db.prepare(`
    SELECT w.id, w.warehouse_code, w.warehouse_name, w.location, w.capacity, w.keeper_name,
           b.branch_name,
           (SELECT COUNT(*) FROM WAREHOUSE_RECEIPTS r WHERE r.warehouse_id = w.id) as total_receipts
    FROM WAREHOUSES w
    LEFT JOIN BRANCHES b ON w.branch_id = b.id
    ORDER BY w.id ASC
  `).all();
  res.json({ success: true, warehouses });
});

// -------------------------------------------------------------
// GET /warehouses/receipts - List Receipts with filters
// -------------------------------------------------------------
router.get('/receipts', authenticate, (req, res) => {
  const { warehouseId, productId, startDate, endDate, search } = req.query;

  let query = `
    SELECT wr.id, wr.receipt_no, wr.warehouse_id, wr.product_id, wr.quantity,
           wr.supplier_name, wr.received_by, wr.receipt_date, wr.batch_number,
           wr.notes, wr.created_at,
           w.warehouse_name, w.warehouse_code,
           p.product_name, p.product_code, p.unit, p.category,
           u.full_name as receiver_name
    FROM WAREHOUSE_RECEIPTS wr
    JOIN WAREHOUSES w ON wr.warehouse_id = w.id
    JOIN PRODUCTS p ON wr.product_id = p.id
    JOIN USERS u ON wr.received_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (warehouseId) {
    query += ' AND wr.warehouse_id = ?';
    params.push(Number(warehouseId));
  }
  if (productId) {
    query += ' AND wr.product_id = ?';
    params.push(Number(productId));
  }
  if (startDate) {
    query += ' AND wr.receipt_date >= ?';
    params.push(String(startDate));
  }
  if (endDate) {
    query += ' AND wr.receipt_date <= ?';
    params.push(String(endDate));
  }
  if (search) {
    query += ' AND (wr.receipt_no LIKE ? OR wr.supplier_name LIKE ? OR p.product_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY wr.id DESC LIMIT 200';

  const receipts = db.prepare(query).all(...params);
  res.json({ success: true, receipts });
});

// GET /warehouses/receipts/:id - Get Receipt Details
router.get('/receipts/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const receipt = db.prepare(`
    SELECT wr.*, w.warehouse_name, p.product_name, p.unit, p.product_code, u.full_name as received_by_name,
           r.request_no
    FROM WAREHOUSE_RECEIPTS wr
    JOIN WAREHOUSES w ON wr.warehouse_id = w.id
    JOIN PRODUCTS p ON wr.product_id = p.id
    JOIN USERS u ON wr.received_by = u.id
    LEFT JOIN REQUISITIONS r ON wr.requisition_id = r.id
    WHERE wr.id = ?
  `).get(req.params.id) as any;

  if (!receipt) {
    return res.status(404).json({ success: false, message: 'سند الاستلام غير موجود' });
  }

  // format items array for UI
  receipt.items = [
    {
      product_id: receipt.product_id,
      product_name: receipt.product_name,
      quantity_received: receipt.quantity,
      unit: receipt.unit,
      batch_number: receipt.batch_number
    }
  ];

  res.json({ success: true, receipt });
});

// -------------------------------------------------------------
// POST /warehouses/receipts - Create Warehouse Receipt (FR-11, UC-11)
// Enforces BR-04: Supply records warehouse receipt and increments stock atomically
// -------------------------------------------------------------
router.post('/receipts', authenticate, requireRoles('WAREHOUSE_KEEPER', 'PROD_MGR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { warehouseId, productId, quantity, supplierName, receiptDate, batchNumber, notes } = req.body;

  if (!warehouseId || !productId || !quantity || !supplierName) {
    return res.status(400).json({ success: false, message: 'المستودع، المنتج، الكمية، واسم المورد/المصدر حقول إلزامية' });
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: 'يجب أن تكون كمية التوريد رقماً موجباً أكبر من صفر' });
  }

  const warehouse = db.prepare('SELECT id, warehouse_name FROM WAREHOUSES WHERE id = ?').get(warehouseId);
  if (!warehouse) {
    return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
  }

  const product = db.prepare('SELECT id, product_name, current_stock FROM PRODUCTS WHERE id = ?').get(productId) as any;
  if (!product) {
    return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
  }

  const receiptNo = generateReceiptNo();
  const recDate = receiptDate || new Date().toISOString().slice(0, 10);

  // ATOMIC TRANSACTION (BR-04)
  try {
    db.exec('BEGIN TRANSACTION;');

    const insertReceipt = db.prepare(`
      INSERT INTO WAREHOUSE_RECEIPTS (
        receipt_no, warehouse_id, product_id, quantity, supplier_name,
        received_by, receipt_date, batch_number, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertReceipt.run(
      receiptNo,
      warehouseId,
      productId,
      qty,
      supplierName.trim(),
      req.user!.id,
      recDate,
      batchNumber ? batchNumber.trim() : null,
      notes || null
    );

    // Atomically increment stock
    db.prepare(`
      UPDATE PRODUCTS
      SET current_stock = current_stock + ?
      WHERE id = ?
    `).run(qty, productId);

    db.exec('COMMIT;');

    // Trigger Notification to Management
    createNotification({
      roleTarget: 'PROD_MGR',
      title: `سند توريد مستودعي جديد: ${receiptNo}`,
      message: `تم توريد ${qty} من ${product.product_name} إلى ${warehouse.warehouse_name} بنجاح`,
      type: 'SUCCESS',
      link: '/warehouse'
    });

    res.status(201).json({
      success: true,
      message: `تم تسجيل سند التوريد رقم ${receiptNo} وإضافة الكمية للمخزون بنجاح (BR-04)`,
      receiptId: result.lastInsertRowid,
      receiptNo,
      newStock: product.current_stock + qty
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    console.error('Error recording warehouse receipt:', err);
    res.status(500).json({ success: false, message: 'فشلت عملية التوريد وتحديث المخزون: ' + err.message });
  }
});

export default router;
