import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest, createNotification } from '../auth.js';

const router = Router();

// Generate distinct Receipt Number: RCP-YYYYMMDD-XXXX (verified unique in DB)
function generateReceiptNo(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const maxRecord = db.prepare('SELECT COALESCE(MAX(id), 0) as maxId FROM WAREHOUSE_RECEIPTS').get() as any;
  let nextNum = (maxRecord?.maxId || 0) + 1;
  const checkStmt = db.prepare('SELECT 1 FROM WAREHOUSE_RECEIPTS WHERE receipt_no = ? OR receipt_no LIKE ?');
  while (true) {
    const candidate = `RCP-${dateStr}-${String(nextNum).padStart(4, '0')}`;
    if (!checkStmt.get(candidate, `${candidate}-%`)) {
      return candidate;
    }
    nextNum++;
  }
}

// -------------------------------------------------------------
// GET /warehouses - List Warehouses
// -------------------------------------------------------------
router.get('/list', authenticate, requireRoles('WAREHOUSE_KEEPER', 'ACCOUNTANT', 'PROD_MANAGER', 'ADMIN'), (req, res) => {
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
router.get('/receipts', authenticate, requireRoles('WAREHOUSE_KEEPER', 'ACCOUNTANT', 'PROD_MANAGER', 'ADMIN'), (req, res) => {
  const { warehouseId, productId, startDate, endDate, search } = req.query;

  let query = `
    SELECT wr.id, wr.receipt_no, wr.warehouse_id, wr.product_id, wr.quantity,
           wr.supplier_name, wr.received_by, wr.receipt_date, wr.batch_number,
           wr.notes, wr.created_at,
           w.warehouse_name, w.warehouse_code,
           p.product_name, p.product_code, p.unit, p.category,
           u.full_name as receiver_name,
           u.full_name as received_by_name,
           wr.receipt_date as supply_date
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
    query += ' AND (wr.receipt_no LIKE ? OR wr.supplier_name LIKE ? OR p.product_name LIKE ? OR w.warehouse_name LIKE ? OR u.full_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  query += ' ORDER BY wr.id DESC LIMIT 200';

  const receipts = db.prepare(query).all(...params);
  res.json({ success: true, receipts });
});

// GET /warehouses/receipts/:id - Get Receipt Details
router.get('/receipts/:id', authenticate, requireRoles('WAREHOUSE_KEEPER', 'ACCOUNTANT', 'PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const receiptId = Number(req.params.id);
  if (!Number.isInteger(receiptId) || receiptId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف سند الاستلام غير صالح' });
  }

  const receipt = db.prepare(`
    SELECT wr.*, w.warehouse_name, w.warehouse_code, p.product_name, p.unit, p.product_code,
           u.full_name as receiver_name,
           u.full_name as received_by_name,
           wr.receipt_date as supply_date
    FROM WAREHOUSE_RECEIPTS wr
    JOIN WAREHOUSES w ON wr.warehouse_id = w.id
    JOIN PRODUCTS p ON wr.product_id = p.id
    JOIN USERS u ON wr.received_by = u.id
    WHERE wr.id = ?
  `).get(receiptId) as any;

  if (!receipt) {
    return res.status(404).json({ success: false, message: 'سند الاستلام غير موجود' });
  }

  // format items array for UI
  receipt.items = [
    {
      product_id: receipt.product_id,
      product_code: receipt.product_code,
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
router.post('/receipts', authenticate, requireRoles('WAREHOUSE_KEEPER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { warehouseId, productId, quantity, supplierName, receiptDate, supplyDate, batchNumber, notes, items } = req.body;

  const finalSupplier = (supplierName || '').trim();
  if (!finalSupplier) {
    return res.status(400).json({ success: false, message: 'اسم المورد أو جهة التوريد حقل إلزامي' });
  }

  // Resolve target warehouse
  let targetWarehouseId = Number(warehouseId);
  if (!targetWarehouseId || isNaN(targetWarehouseId)) {
    const defaultWh = db.prepare('SELECT id, warehouse_name FROM WAREHOUSES ORDER BY id ASC LIMIT 1').get() as any;
    if (!defaultWh) {
      return res.status(400).json({ success: false, message: 'لا يوجد أي مستودع مسجل في النظام' });
    }
    targetWarehouseId = defaultWh.id;
  }

  const warehouse = db.prepare('SELECT id, warehouse_name FROM WAREHOUSES WHERE id = ?').get(targetWarehouseId) as any;
  if (!warehouse) {
    return res.status(404).json({ success: false, message: 'المستودع المحدد غير موجود' });
  }

  // Normalize items list (supports both multi-item and single-item requests)
  const itemsToProcess: Array<{ productId: number; quantity: number; batchNumber?: string }> = [];

  if (Array.isArray(items) && items.length > 0) {
    for (const it of items) {
      const pid = Number(it.productId || it.product_id);
      const qty = Number(it.quantityReceived || it.quantity);
      if (!pid || !Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'يجب تحديد الصنف وكمية استلام موجبة أكبر من صفر لجميع البنود' });
      }
      itemsToProcess.push({
        productId: pid,
        quantity: qty,
        batchNumber: (it.batchNumber || it.batch_number || '').trim() || undefined
      });
    }
  } else if (productId && quantity) {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'يجب أن تكون كمية التوريد رقماً موجباً أكبر من صفر' });
    }
    itemsToProcess.push({
      productId: Number(productId),
      quantity: qty,
      batchNumber: (batchNumber || '').trim() || undefined
    });
  } else {
    return res.status(400).json({ success: false, message: 'يرجى تحديد الأصناف والكميات المطلوب توريدها للمستودع' });
  }

  // Validate all products exist before opening transaction
  for (const it of itemsToProcess) {
    const product = db.prepare('SELECT id FROM PRODUCTS WHERE id = ?').get(it.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: `المنتج رقم ${it.productId} غير موجود في النظام` });
    }
  }

  const recDate = receiptDate || supplyDate || new Date().toISOString().slice(0, 10);
  let firstReceiptId: number | bigint = 0;
  let totalQty = 0;

  // ATOMIC TRANSACTION (BR-04)
  try {
    db.exec('BEGIN TRANSACTION;');
    const baseReceiptNo = generateReceiptNo();

    const insertReceipt = db.prepare(`
      INSERT INTO WAREHOUSE_RECEIPTS (
        receipt_no, warehouse_id, product_id, quantity, supplier_name,
        received_by, receipt_date, batch_number, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE PRODUCTS
      SET current_stock = current_stock + ?
      WHERE id = ?
    `);

    itemsToProcess.forEach((it, idx) => {
      const rNo = itemsToProcess.length > 1 ? `${baseReceiptNo}-${idx + 1}` : baseReceiptNo;

      const resInsert = insertReceipt.run(
        rNo,
        targetWarehouseId,
        it.productId,
        it.quantity,
        finalSupplier,
        req.user!.id,
        recDate,
        it.batchNumber || null,
        notes || null
      );

      if (idx === 0) {
        firstReceiptId = resInsert.lastInsertRowid;
      }

      updateStock.run(it.quantity, it.productId);
      totalQty += it.quantity;
    });

    db.exec('COMMIT;');

    // Trigger Notification to Management
    createNotification({
      roleTarget: 'PROD_MANAGER',
      title: `سند توريد مستودعي جديد: ${baseReceiptNo}`,
      message: `تم توريد عدد ${itemsToProcess.length} صنف بإجمالي كمية ${totalQty} إلى ${warehouse.warehouse_name} بنجاح`,
      type: 'SUCCESS',
      link: '/warehouse'
    });

    res.status(201).json({
      success: true,
      message: `تم تسجيل سند التوريد رقم ${baseReceiptNo} وإضافة الكمية للمخزون بنجاح (BR-04)`,
      receiptId: firstReceiptId,
      receiptNo: baseReceiptNo,
      totalItems: itemsToProcess.length
    });
  } catch (err: any) {
    try { db.exec('ROLLBACK;'); } catch {}
    console.error('Error recording warehouse receipt:', err);
    res.status(500).json({ success: false, message: 'فشلت عملية التوريد وتحديث المخزون' });
  }
});

export default router;
