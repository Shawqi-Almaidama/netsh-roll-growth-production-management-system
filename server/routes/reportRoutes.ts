import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest } from '../auth.js';

const router = Router();

// تقرير الإنتاج اليومي
router.get('/daily-production', authenticate, requireRoles('ADMIN', 'PROD_MGR', 'SUPERVISOR', 'ACCOUNTANT'), (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, flockId, houseId } = req.query;
  const user = req.user!;

  let query = `
    SELECT dp.id, dp.record_date, dp.production_quantity, dp.unit,
           dp.mortality_count, dp.feed_consumed_kg, dp.water_consumed_liters, dp.avg_weight_g,
           fl.flock_code, fl.breed,
           h.house_name, h.house_code,
           f.farm_name,
           u.full_name as supervisor_name
    FROM DAILY_PRODUCTION dp
    JOIN FLOCKS fl ON dp.flock_id = fl.id
    JOIN HOUSES h ON dp.house_id = h.id
    JOIN FARMS f ON h.farm_id = f.id
    JOIN USERS u ON dp.supervisor_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Supervisors only see their own operational entries
  if (user.roleCode === 'SUPERVISOR') {
    query += ' AND dp.supervisor_id = ?';
    params.push(user.id);
  }

  if (startDate) {
    query += ' AND dp.record_date >= ?';
    params.push(String(startDate));
  }
  if (endDate) {
    query += ' AND dp.record_date <= ?';
    params.push(String(endDate));
  }
  if (flockId) {
    query += ' AND dp.flock_id = ?';
    params.push(Number(flockId));
  }
  if (houseId) {
    query += ' AND dp.house_id = ?';
    params.push(Number(houseId));
  }

  query += ' ORDER BY dp.record_date DESC, dp.id DESC';

  const rows = db.prepare(query).all(...params) as any[];

  // Aggregations
  const summary = {
    totalRecords: rows.length,
    totalProduction: rows.reduce((acc, r) => acc + (r.production_quantity || 0), 0),
    totalMortality: rows.reduce((acc, r) => acc + (r.mortality_count || 0), 0),
    totalFeedConsumedKg: rows.reduce((acc, r) => acc + (r.feed_consumed_kg || 0), 0),
    totalWaterLiters: rows.reduce((acc, r) => acc + (r.water_consumed_liters || 0), 0),
    avgWeightG: rows.length > 0 ? Math.round(rows.reduce((acc, r) => acc + (r.avg_weight_g || 0), 0) / rows.length) : 0
  };

  res.json({ success: true, reportCode: 'R-01', reportName: 'تقرير الإنتاج والتشغيل اليومي', summary, records: rows });
});

// تقرير طلبات الاحتياج
router.get('/requisitions', authenticate, requireRoles('ADMIN', 'PROD_MGR', 'SUPERVISOR', 'ACCOUNTANT'), (req: AuthenticatedRequest, res: Response) => {
  const { type, status, startDate, endDate } = req.query;
  const user = req.user!;

  let query = `
    SELECT r.id, r.request_no, r.req_type, r.request_date, r.status, r.urgency,
           r.review_date, r.review_notes, r.notes,
           u.full_name as requester_name,
           rev.full_name as reviewer_name,
           f.farm_name, h.house_name,
           (SELECT COUNT(*) FROM REQUISITION_ITEMS ri WHERE ri.requisition_id = r.id) as items_count,
           (SELECT SUM(quantity) FROM REQUISITION_ITEMS ri WHERE ri.requisition_id = r.id) as total_qty
    FROM REQUISITIONS r
    JOIN USERS u ON r.requester_id = u.id
    LEFT JOIN USERS rev ON r.reviewer_id = rev.id
    LEFT JOIN FARMS f ON r.farm_id = f.id
    LEFT JOIN HOUSES h ON r.house_id = h.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Supervisor only sees requisitions submitted by himself
  if (user.roleCode === 'SUPERVISOR') {
    query += ' AND r.requester_id = ?';
    params.push(user.id);
  }

  if (type) {
    query += ' AND r.req_type = ?';
    params.push(String(type));
  }
  if (status) {
    query += ' AND r.status = ?';
    params.push(String(status));
  }
  if (startDate) {
    query += ' AND r.request_date >= ?';
    params.push(String(startDate));
  }
  if (endDate) {
    query += ' AND r.request_date <= ?';
    params.push(String(endDate));
  }

  query += ' ORDER BY r.request_date DESC';

  const rows = db.prepare(query).all(...params) as any[];

  const summary = {
    totalRequisitions: rows.length,
    submittedCount: rows.filter(r => r.status === 'SUBMITTED').length,
    underReviewCount: rows.filter(r => r.status === 'UNDER_REVIEW').length,
    approvedCount: rows.filter(r => r.status === 'APPROVED').length,
    rejectedCount: rows.filter(r => r.status === 'REJECTED').length,
    completedCount: rows.filter(r => r.status === 'COMPLETED').length
  };

  res.json({ success: true, reportCode: 'R-02', reportName: 'تقرير طلبات الاحتياج التشغيلية', summary, records: rows });
});

// تقرير فواتير المبيعات
router.get('/sales', authenticate, requireRoles('ADMIN', 'SALES_OFFICER', 'ACCOUNTANT'), (req: AuthenticatedRequest, res: Response) => {
  const { customerId, status, startDate, endDate } = req.query;

  let query = `
    SELECT inv.id, inv.invoice_no, inv.invoice_date, inv.subtotal, inv.discount,
           inv.tax_amount, inv.total_amount, inv.payment_status, inv.notes,
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

  query += ' ORDER BY inv.invoice_date DESC';

  const rows = db.prepare(query).all(...params) as any[];

  const summary = {
    totalInvoices: rows.length,
    totalGrossAmount: rows.reduce((acc, r) => acc + (r.subtotal || 0), 0),
    totalDiscounts: rows.reduce((acc, r) => acc + (r.discount || 0), 0),
    totalTax: rows.reduce((acc, r) => acc + (r.tax_amount || 0), 0),
    totalNetAmount: rows.reduce((acc, r) => acc + (r.total_amount || 0), 0)
  };

  res.json({ success: true, reportCode: 'R-03', reportName: 'تقرير فواتير المبيعات والإيرادات', summary, records: rows });
});

// تقرير التوريد للمخازن
router.get('/warehouse-receipts', authenticate, requireRoles('ADMIN', 'WAREHOUSE_KEEPER', 'ACCOUNTANT', 'PROD_MGR'), (req: AuthenticatedRequest, res: Response) => {
  const { warehouseId, productId, startDate, endDate } = req.query;

  let query = `
    SELECT wr.id, wr.receipt_no, wr.quantity, wr.supplier_name, wr.receipt_date,
           wr.batch_number, wr.notes,
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

  query += ' ORDER BY wr.receipt_date DESC';

  const rows = db.prepare(query).all(...params) as any[];

  const summary = {
    totalReceipts: rows.length,
    totalQuantitySupplied: rows.reduce((acc, r) => acc + (r.quantity || 0), 0)
  };

  res.json({ success: true, reportCode: 'R-04', reportName: 'تقرير حركات التوريد للمستودعات', summary, records: rows });
});

// تقرير المنتجات والمخزون
router.get('/products-inventory', authenticate, requireRoles('ADMIN', 'WAREHOUSE_KEEPER', 'ACCOUNTANT', 'SALES_OFFICER', 'PROD_MGR'), (req: AuthenticatedRequest, res: Response) => {
  const { category, lowStockOnly } = req.query;

  let query = `
    SELECT p.id, p.product_code, p.product_name, p.category, p.unit,
           p.unit_price, p.current_stock, p.min_stock_alert,
           (p.current_stock * p.unit_price) as stock_valuation,
           (p.current_stock <= p.min_stock_alert) as is_low_stock
    FROM PRODUCTS p
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category) {
    query += ' AND p.category = ?';
    params.push(String(category));
  }
  if (lowStockOnly === 'true') {
    query += ' AND p.current_stock <= p.min_stock_alert';
  }

  query += ' ORDER BY p.category, p.current_stock DESC';

  const rows = db.prepare(query).all(...params) as any[];

  const summary = {
    totalProductsCount: rows.length,
    totalValuation: rows.reduce((acc, r) => acc + (r.stock_valuation || 0), 0),
    lowStockItemsCount: rows.filter(r => r.is_low_stock === 1).length
  };

  res.json({ success: true, reportCode: 'R-05', reportName: 'تقرير جرد وتقييم مخزون المنتجات', summary, records: rows });
});

export default router;
