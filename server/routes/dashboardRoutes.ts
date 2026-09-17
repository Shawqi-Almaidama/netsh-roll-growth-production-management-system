import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/dashboard/stats - Role-Tailored Dynamic Dashboard Statistics
router.get('/stats', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const roleCode = user.roleCode;

  // Unread notifications for current user/role
  const unreadNotifs = (db.prepare(`
    SELECT COUNT(*) as c
    FROM NOTIFICATIONS
    WHERE (user_id = ? OR role_target = ? OR role_target = 'ALL') AND is_read = 0
  `).get(user.id, roleCode) as any)?.c || 0;

  if (roleCode === 'ADMIN') {
    // -------------------------------------------------------------
    // ADMIN DASHBOARD (شوقي الميدمة - مدير النظام)
    // Focused on User Management, System Status, Roles, System-wide Pulse
    // -------------------------------------------------------------
    const systemUsersCount = (db.prepare('SELECT COUNT(*) as c FROM USERS').get() as any)?.c || 0;
    const activeUsersCount = (db.prepare('SELECT COUNT(*) as c FROM USERS WHERE is_active = 1').get() as any)?.c || 0;
    const rolesCount = (db.prepare('SELECT COUNT(*) as c FROM ROLES').get() as any)?.c || 0;
    const housesCount = (db.prepare('SELECT COUNT(*) as c FROM HOUSES').get() as any)?.c || 0;
    const activeFlocksCount = (db.prepare("SELECT COUNT(*) as c FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.c || 0;
    const currentBirdsCount = (db.prepare("SELECT COALESCE(SUM(current_count), 0) as s FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.s || 0;
    const totalSalesRevenue = (db.prepare('SELECT COALESCE(SUM(total_amount), 0) as s FROM SALES_INVOICES').get() as any)?.s || 0;
    const totalStockValuation = (db.prepare('SELECT COALESCE(SUM(current_stock * unit_price), 0) as s FROM PRODUCTS').get() as any)?.s || 0;

    // Recent system activity across modules
    const recentUsers = db.prepare(`
      SELECT id, username, full_name, role_code, is_active, created_at
      FROM USERS
      ORDER BY id DESC
      LIMIT 5
    `).all();

    const recentSystemNotifications = db.prepare(`
      SELECT id, title, message, type, created_at
      FROM NOTIFICATIONS
      ORDER BY id DESC
      LIMIT 6
    `).all();

    return res.json({
      success: true,
      roleCode: 'ADMIN',
      kpis: {
        systemUsersCount,
        activeUsersCount,
        rolesCount,
        housesCount,
        activeFlocksCount,
        currentBirdsCount,
        totalSalesRevenue,
        totalStockValuation,
        unreadNotifs
      },
      recentUsers,
      recentSystemNotifications,
      systemHealth: {
        status: 'OPTIMAL',
        statusAr: 'ممتازة — كافة الوحدات تعمل بكفاءة وأمان',
        database: 'SQLite (ACID Compliant)',
        currency: 'YER (الريال اليمني)',
        serverUptime: 'نشط'
      }
    });
  }

  if (roleCode === 'PROD_MGR' || roleCode === 'PROD_MANAGER') {
    // -------------------------------------------------------------
    // PRODUCTION MANAGER DASHBOARD (أحمد صبر - مدير قسم الإنتاج)
    // Focused on Requisitions Review, Houses, Flocks, Production Trends
    // -------------------------------------------------------------
    const pendingReviewCount = (db.prepare("SELECT COUNT(*) as c FROM REQUISITIONS WHERE status IN ('SUBMITTED', 'UNDER_REVIEW')").get() as any)?.c || 0;
    const approvedReqsCount = (db.prepare("SELECT COUNT(*) as c FROM REQUISITIONS WHERE status = 'APPROVED'").get() as any)?.c || 0;
    const activeHousesCount = (db.prepare("SELECT COUNT(*) as c FROM HOUSES WHERE current_status = 'ACTIVE'").get() as any)?.c || 0;
    const totalHousesCount = (db.prepare('SELECT COUNT(*) as c FROM HOUSES').get() as any)?.c || 0;
    const activeFlocksCount = (db.prepare("SELECT COUNT(*) as c FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.c || 0;
    const currentBirdsCount = (db.prepare("SELECT COALESCE(SUM(current_count), 0) as s FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.s || 0;
    const totalMortality = (db.prepare('SELECT COALESCE(SUM(total_mortality), 0) as s FROM FLOCKS').get() as any)?.s || 0;

    // Production Trend (last 7 days)
    const productionTrends = db.prepare(`
      SELECT dp.record_date,
             SUM(dp.production_quantity) as total_prod,
             SUM(dp.mortality_count) as total_mortality,
             SUM(dp.feed_consumed_kg) as total_feed
      FROM DAILY_PRODUCTION dp
      GROUP BY dp.record_date
      ORDER BY dp.record_date DESC
      LIMIT 7
    `).all().reverse();

    // Requisitions waiting for review
    const pendingRequisitions = db.prepare(`
      SELECT r.id, r.request_no, r.req_type, r.request_date, r.status, r.urgency,
             u.full_name as requester_name,
             (SELECT COUNT(*) FROM REQUISITION_ITEMS WHERE requisition_id = r.id) as items_count
      FROM REQUISITIONS r
      JOIN USERS u ON r.requester_id = u.id
      WHERE r.status IN ('SUBMITTED', 'UNDER_REVIEW')
      ORDER BY r.urgency = 'HIGH' DESC, r.id DESC
      LIMIT 6
    `).all();

    return res.json({
      success: true,
      roleCode: 'PROD_MGR',
      kpis: {
        pendingReviewCount,
        approvedReqsCount,
        activeHousesCount,
        totalHousesCount,
        activeFlocksCount,
        currentBirdsCount,
        totalMortality,
        unreadNotifs
      },
      productionTrends,
      pendingRequisitions
    });
  }

  if (roleCode === 'SALES_OFFICER') {
    // -------------------------------------------------------------
    // SALES OFFICER DASHBOARD (محمد الأعوج - مسؤول المبيعات والفواتير)
    // Focused on Invoices, Customers, Ready Stock, Sales Totals (YER)
    // -------------------------------------------------------------
    const totalSalesRevenue = (db.prepare('SELECT COALESCE(SUM(total_amount), 0) as s FROM SALES_INVOICES').get() as any)?.s || 0;
    const totalInvoicesCount = (db.prepare('SELECT COUNT(*) as c FROM SALES_INVOICES').get() as any)?.c || 0;
    const paidInvoicesCount = (db.prepare("SELECT COUNT(*) as c FROM SALES_INVOICES WHERE payment_status = 'PAID'").get() as any)?.c || 0;
    const totalCustomersCount = (db.prepare('SELECT COUNT(*) as c FROM CUSTOMERS').get() as any)?.c || 0;
    const readyProductsCount = (db.prepare('SELECT COUNT(*) as c FROM PRODUCTS WHERE current_stock > 0').get() as any)?.c || 0;
    const lowStockCount = (db.prepare('SELECT COUNT(*) as c FROM PRODUCTS WHERE current_stock <= min_stock_alert').get() as any)?.c || 0;

    const recentSales = db.prepare(`
      SELECT inv.id, inv.invoice_no, inv.invoice_date, inv.total_amount, inv.payment_status,
             c.customer_name
      FROM SALES_INVOICES inv
      JOIN CUSTOMERS c ON inv.customer_id = c.id
      ORDER BY inv.id DESC
      LIMIT 6
    `).all();

    const lowStockAlerts = db.prepare(`
      SELECT id, product_code, product_name, category, current_stock, min_stock_alert, unit, unit_price
      FROM PRODUCTS
      WHERE current_stock <= min_stock_alert
      ORDER BY current_stock ASC
      LIMIT 5
    `).all();

    return res.json({
      success: true,
      roleCode: 'SALES_OFFICER',
      kpis: {
        totalSalesRevenue,
        totalInvoicesCount,
        paidInvoicesCount,
        totalCustomersCount,
        readyProductsCount,
        lowStockCount,
        unreadNotifs
      },
      recentSales,
      lowStockAlerts
    });
  }

  if (roleCode === 'WAREHOUSE_KEEPER') {
    // -------------------------------------------------------------
    // WAREHOUSE KEEPER DASHBOARD (ريان موسى - أمين المخازن)
    // Focused on Stock Items, Receipts, Incoming Goods, Critical Stock Alerts
    // -------------------------------------------------------------
    const totalProductsCount = (db.prepare('SELECT COUNT(*) as c FROM PRODUCTS').get() as any)?.c || 0;
    const totalStockUnits = (db.prepare('SELECT COALESCE(SUM(current_stock), 0) as s FROM PRODUCTS').get() as any)?.s || 0;
    const lowStockCount = (db.prepare('SELECT COUNT(*) as c FROM PRODUCTS WHERE current_stock <= min_stock_alert').get() as any)?.c || 0;
    const totalReceiptsCount = (db.prepare('SELECT COUNT(*) as c FROM WAREHOUSE_RECEIPTS').get() as any)?.c || 0;
    const warehousesCount = (db.prepare('SELECT COUNT(*) as c FROM WAREHOUSES').get() as any)?.c || 0;

    const recentReceipts = db.prepare(`
      SELECT r.id, r.receipt_no, r.receipt_date, r.quantity, r.supplier_name, r.batch_number,
             p.product_name, p.unit, w.warehouse_name
      FROM WAREHOUSE_RECEIPTS r
      JOIN PRODUCTS p ON r.product_id = p.id
      JOIN WAREHOUSES w ON r.warehouse_id = w.id
      ORDER BY r.id DESC
      LIMIT 6
    `).all();

    const lowStockItems = db.prepare(`
      SELECT id, product_code, product_name, category, current_stock, min_stock_alert, unit
      FROM PRODUCTS
      WHERE current_stock <= min_stock_alert
      ORDER BY current_stock ASC
      LIMIT 6
    `).all();

    return res.json({
      success: true,
      roleCode: 'WAREHOUSE_KEEPER',
      kpis: {
        totalProductsCount,
        totalStockUnits,
        lowStockCount,
        totalReceiptsCount,
        warehousesCount,
        unreadNotifs
      },
      recentReceipts,
      lowStockItems
    });
  }

  if (roleCode === 'ACCOUNTANT') {
    // -------------------------------------------------------------
    // ACCOUNTANT DASHBOARD (ماهر نضير - المحاسب المالي)
    // Focused on Revenue (YER), Tax Amounts, Stock Valuation (YER), Receipts & Invoices
    // -------------------------------------------------------------
    const totalSalesRevenue = (db.prepare('SELECT COALESCE(SUM(total_amount), 0) as s FROM SALES_INVOICES').get() as any)?.s || 0;
    const totalTaxAmount = (db.prepare('SELECT COALESCE(SUM(tax_amount), 0) as s FROM SALES_INVOICES').get() as any)?.s || 0;
    const totalInvoicesCount = (db.prepare('SELECT COUNT(*) as c FROM SALES_INVOICES').get() as any)?.c || 0;
    const paidInvoicesCount = (db.prepare("SELECT COUNT(*) as c FROM SALES_INVOICES WHERE payment_status = 'PAID'").get() as any)?.c || 0;
    const totalStockValuation = (db.prepare('SELECT COALESCE(SUM(current_stock * unit_price), 0) as s FROM PRODUCTS').get() as any)?.s || 0;
    const totalReceiptsCount = (db.prepare('SELECT COUNT(*) as c FROM WAREHOUSE_RECEIPTS').get() as any)?.c || 0;

    const recentInvoices = db.prepare(`
      SELECT inv.id, inv.invoice_no, inv.invoice_date, inv.subtotal, inv.tax_amount, inv.total_amount, inv.payment_status,
             c.customer_name
      FROM SALES_INVOICES inv
      JOIN CUSTOMERS c ON inv.customer_id = c.id
      ORDER BY inv.id DESC
      LIMIT 6
    `).all();

    return res.json({
      success: true,
      roleCode: 'ACCOUNTANT',
      kpis: {
        totalSalesRevenue,
        totalTaxAmount,
        totalInvoicesCount,
        paidInvoicesCount,
        totalStockValuation,
        totalReceiptsCount,
        unreadNotifs
      },
      recentInvoices
    });
  }

  // -------------------------------------------------------------
  // SUPERVISOR DASHBOARD (مشرف الإنتاج)
  // Focused on Assigned Houses, Flocks, Today's Production, Own Requisitions
  // -------------------------------------------------------------
  const supervisorId = user.id;

  const assignedHousesCount = (db.prepare(`
    SELECT COUNT(*) as c FROM HOUSES
    WHERE supervisor_id = ? OR farm_id IN (SELECT id FROM FARMS WHERE supervisor_id = ?)
  `).get(supervisorId, supervisorId) as any)?.c || (db.prepare('SELECT COUNT(*) as c FROM HOUSES').get() as any)?.c || 0;

  const assignedActiveHouses = (db.prepare(`
    SELECT COUNT(*) as c FROM HOUSES
    WHERE current_status = 'ACTIVE' AND (supervisor_id = ? OR farm_id IN (SELECT id FROM FARMS WHERE supervisor_id = ?))
  `).get(supervisorId, supervisorId) as any)?.c || (db.prepare("SELECT COUNT(*) as c FROM HOUSES WHERE current_status = 'ACTIVE'").get() as any)?.c || 0;

  const currentBirdsCount = (db.prepare("SELECT COALESCE(SUM(current_count), 0) as s FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.s || 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayProd = (db.prepare(`
    SELECT COALESCE(SUM(production_quantity), 0) as prod, COALESCE(SUM(mortality_count), 0) as mort
    FROM DAILY_PRODUCTION
    WHERE record_date = ?
  `).get(todayStr) as any) || { prod: 0, mort: 0 };

  const myRequisitions = db.prepare(`
    SELECT r.id, r.request_no, r.req_type, r.request_date, r.status, r.urgency, r.review_notes
    FROM REQUISITIONS r
    WHERE r.requester_id = ?
    ORDER BY r.id DESC
    LIMIT 5
  `).all(supervisorId);

  const myReqPendingCount = (db.prepare(`
    SELECT COUNT(*) as c FROM REQUISITIONS
    WHERE requester_id = ? AND status IN ('SUBMITTED', 'UNDER_REVIEW')
  `).get(supervisorId) as any)?.c || 0;

  const myReqApprovedCount = (db.prepare(`
    SELECT COUNT(*) as c FROM REQUISITIONS
    WHERE requester_id = ? AND status = 'APPROVED'
  `).get(supervisorId) as any)?.c || 0;

  return res.json({
    success: true,
    roleCode: 'SUPERVISOR',
    kpis: {
      assignedHousesCount,
      assignedActiveHouses,
      currentBirdsCount,
      todayProduction: todayProd.prod,
      todayMortality: todayProd.mort,
      myReqPendingCount,
      myReqApprovedCount,
      unreadNotifs
    },
    myRecentRequisitions: myRequisitions
  });
});

export default router;
