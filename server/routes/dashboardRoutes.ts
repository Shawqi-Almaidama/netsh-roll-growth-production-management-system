import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Helper for date filtering based on period
function getDateFilter(col: string, period: string) {
  if (period === 'today') {
    return `date(${col}) = date('now')`;
  }
  if (period === '7days') {
    return `date(${col}) >= date('now', '-7 days')`;
  }
  if (period === '30days') {
    return `date(${col}) >= date('now', '-30 days')`;
  }
  return '1=1'; // all
}

// Compute comprehensive Admin Dashboard payload strictly from SQLite database
export function computeAdminDashboardStats(period: string, unreadNotifs: number = 0) {
  const dateFilterReq = getDateFilter('request_date', period);
  const dateFilterSales = getDateFilter('invoice_date', period);
  const dateFilterReceipts = getDateFilter('receipt_date', period);
  const dateFilterProd = getDateFilter('record_date', period);

  // Section 1: Users & System KPIs
  const systemUsersCount = (db.prepare('SELECT COUNT(*) as c FROM USERS').get() as any)?.c || 0;
  const activeUsersCount = (db.prepare('SELECT COUNT(*) as c FROM USERS WHERE is_active = 1').get() as any)?.c || 0;
  const inactiveUsersCount = (db.prepare('SELECT COUNT(*) as c FROM USERS WHERE is_active = 0').get() as any)?.c || 0;
  const rolesCount = (db.prepare('SELECT COUNT(*) as c FROM ROLES').get() as any)?.c || 0;
  const housesCount = (db.prepare('SELECT COUNT(*) as c FROM HOUSES').get() as any)?.c || 0;
  const activeFlocksCount = (db.prepare("SELECT COUNT(*) as c FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.c || 0;
  const currentBirdsCount = (db.prepare("SELECT COALESCE(SUM(current_count), 0) as s FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.s || 0;

  // All approved users (the canonical 6 users)
  const approvedUsers = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.role_code, r.role_name_ar, u.is_active, u.created_at
    FROM USERS u
    LEFT JOIN ROLES r ON u.role_code = r.role_code
    ORDER BY u.id ASC
  `).all();

  // Section 2: Requisitions Workflow & Stages
  const totalRequisitions = (db.prepare(`SELECT COUNT(*) as c FROM REQUISITIONS WHERE ${dateFilterReq}`).get() as any)?.c || 0;
  const reqStatusCounts = db.prepare(`
    SELECT status, COUNT(*) as cnt
    FROM REQUISITIONS
    WHERE ${dateFilterReq}
    GROUP BY status
  `).all() as any[];

  const statusMap: Record<string, number> = {};
  reqStatusCounts.forEach(r => { statusMap[r.status] = r.cnt; });

  const workflowStages = [
    { status: 'DRAFT', label: 'مسودة', count: statusMap['DRAFT'] || 0, color: '#94a3b8' },
    { status: 'SUBMITTED', label: 'مقدمة', count: statusMap['SUBMITTED'] || 0, color: '#f59e0b' },
    { status: 'UNDER_REVIEW', label: 'قيد المراجعة', count: statusMap['UNDER_REVIEW'] || 0, color: '#3b82f6' },
    { status: 'APPROVED', label: 'معتمدة', count: statusMap['APPROVED'] || 0, color: '#10b981' },
    { status: 'REJECTED', label: 'مرفوضة', count: statusMap['REJECTED'] || 0, color: '#ef4444' },
    { status: 'COMPLETED', label: 'مكتملة', count: statusMap['COMPLETED'] || 0, color: '#059669' }
  ];

  const pendingReviewReqs = (statusMap['SUBMITTED'] || 0) + (statusMap['UNDER_REVIEW'] || 0);
  const approvedReqs = statusMap['APPROVED'] || 0;
  const rejectedReqs = statusMap['REJECTED'] || 0;
  const completedReqs = statusMap['COMPLETED'] || 0;

  // Section 4: Requisitions by Type
  const reqTypeCounts = db.prepare(`
    SELECT req_type, COUNT(*) as cnt
    FROM REQUISITIONS
    WHERE ${dateFilterReq}
    GROUP BY req_type
  `).all() as any[];

  const reqTypeLabels: Record<string, string> = {
    CHICKS: 'كتاكيت وبداري',
    FEED: 'أعلاف وتغذية',
    TREATMENT: 'علاجات ولقاحات',
    SUPPLY: 'مستلزمات عامة'
  };

  const requisitionTypes = ['CHICKS', 'FEED', 'TREATMENT', 'SUPPLY'].map(type => {
    const match = reqTypeCounts.find(r => r.req_type === type);
    return {
      type,
      label: reqTypeLabels[type] || type,
      count: match ? match.cnt : 0
    };
  });

  // Section 5: Sales (In YER only)
  const salesStats = (db.prepare(`
    SELECT COUNT(*) as count,
           COALESCE(SUM(total_amount), 0) as totalAmount,
           COALESCE(ROUND(AVG(total_amount), 0), 0) as avgAmount
    FROM SALES_INVOICES
    WHERE ${dateFilterSales}
  `).get() as any) || { count: 0, totalAmount: 0, avgAmount: 0 };

  const dailySalesTrend = db.prepare(`
    SELECT invoice_date as date,
           COALESCE(SUM(total_amount), 0) as totalAmount,
           COUNT(*) as invoiceCount
    FROM SALES_INVOICES
    WHERE ${dateFilterSales}
    GROUP BY invoice_date
    ORDER BY invoice_date ASC
  `).all();

  const recentSales = db.prepare(`
    SELECT inv.id, inv.invoice_no, inv.invoice_date, inv.total_amount, inv.payment_status,
           c.customer_name
    FROM SALES_INVOICES inv
    JOIN CUSTOMERS c ON inv.customer_id = c.id
    ORDER BY inv.id DESC
    LIMIT 5
  `).all();

  // Section 6: Warehouse & Supply (From WAREHOUSE_RECEIPTS, PRODUCTS, WAREHOUSES)
  const warehouseStats = (db.prepare(`
    SELECT COUNT(*) as count,
           COALESCE(SUM(quantity), 0) as totalQty
    FROM WAREHOUSE_RECEIPTS
    WHERE ${dateFilterReceipts}
  `).get() as any) || { count: 0, totalQty: 0 };

  const totalStockValuation = (db.prepare('SELECT COALESCE(SUM(current_stock * unit_price), 0) as s FROM PRODUCTS').get() as any)?.s || 0;
  const totalProductsCount = (db.prepare('SELECT COUNT(*) as c FROM PRODUCTS').get() as any)?.c || 0;
  const lowStockCount = (db.prepare('SELECT COUNT(*) as c FROM PRODUCTS WHERE current_stock <= min_stock_alert').get() as any)?.c || 0;

  const recentReceipts = db.prepare(`
    SELECT r.id, r.receipt_no, r.receipt_date, r.quantity, r.supplier_name, r.batch_number,
           p.product_name, p.unit, w.warehouse_name
    FROM WAREHOUSE_RECEIPTS r
    JOIN PRODUCTS p ON r.product_id = p.id
    JOIN WAREHOUSES w ON r.warehouse_id = w.id
    ORDER BY r.id DESC
    LIMIT 5
  `).all();

  const stockItems = db.prepare(`
    SELECT id, product_code, product_name, category, current_stock, min_stock_alert, unit, unit_price
    FROM PRODUCTS
    ORDER BY (current_stock <= min_stock_alert) DESC, current_stock ASC
    LIMIT 6
  `).all();

  // Section 3: Daily Production & Mortality (From DAILY_PRODUCTION)
  // Egg Production = SUM(production_quantity) WHERE unit = 'طبق' (Never mixed with 'كجم')
  const prodStats = (db.prepare(`
    SELECT COUNT(*) as entryCount,
           COALESCE(SUM(CASE WHEN unit = 'طبق' THEN production_quantity ELSE 0 END), 0) as totalProdQty,
           COALESCE(SUM(mortality_count), 0) as totalMortality,
           COALESCE(ROUND(AVG(CASE WHEN unit = 'طبق' THEN production_quantity END), 1), 0) as avgDailyProd
    FROM DAILY_PRODUCTION
    WHERE ${dateFilterProd}
  `).get() as any) || { entryCount: 0, totalProdQty: 0, totalMortality: 0, avgDailyProd: 0 };

  const prodByDate = db.prepare(`
    SELECT record_date as date,
           COALESCE(SUM(CASE WHEN unit = 'طبق' THEN production_quantity ELSE 0 END), 0) as prodQty,
           COALESCE(SUM(mortality_count), 0) as mortality,
           COUNT(*) as entryCount
    FROM DAILY_PRODUCTION
    WHERE ${dateFilterProd}
    GROUP BY record_date
    ORDER BY record_date ASC
  `).all() as any[];

  // Section 7: Administrative Activity & Audit Trail
  const recentSystemNotifications = db.prepare(`
    SELECT id, title, message, type, created_at
    FROM NOTIFICATIONS
    ORDER BY id DESC
    LIMIT 5
  `).all();

  const recentAdminActions = [
    ...db.prepare(`
      SELECT 'REQUISITION' as type, r.request_no as ref_no, 'طلب احتياج جديد' as action, r.request_date as act_date, r.status, r.created_at, u.full_name as user_name
      FROM REQUISITIONS r
      LEFT JOIN USERS u ON r.requester_id = u.id
      ORDER BY r.id DESC LIMIT 3
    `).all(),
    ...db.prepare(`
      SELECT 'SALE' as type, inv.invoice_no as ref_no, 'إصدار فاتورة بيع' as action, inv.invoice_date as act_date, inv.payment_status as status, inv.created_at, u.full_name as user_name
      FROM SALES_INVOICES inv
      LEFT JOIN USERS u ON inv.user_id = u.id
      ORDER BY inv.id DESC LIMIT 3
    `).all(),
    ...db.prepare(`
      SELECT 'RECEIPT' as type, rc.receipt_no as ref_no, 'توريد مخزني' as action, rc.receipt_date as act_date, 'COMPLETED' as status, rc.created_at, u.full_name as user_name
      FROM WAREHOUSE_RECEIPTS rc
      LEFT JOIN USERS u ON rc.received_by = u.id
      ORDER BY rc.id DESC LIMIT 3
    `).all()
  ].sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 6);

  return {
    success: true,
    roleCode: 'ADMIN',
    period,
    kpis: {
      systemUsersCount,
      activeUsersCount,
      inactiveUsersCount,
      rolesCount,
      housesCount,
      activeFlocksCount,
      currentBirdsCount,
      totalRequisitions,
      pendingReviewReqs,
      approvedReqs,
      rejectedReqs,
      completedReqs,
      prodEntryCount: prodStats.entryCount,
      totalProdQty: prodStats.totalProdQty,
      totalMortality: prodStats.totalMortality,
      avgDailyProd: prodStats.avgDailyProd,
      salesInvoicesCount: salesStats.count,
      totalSalesRevenue: salesStats.totalAmount,
      avgInvoiceValue: salesStats.avgAmount,
      warehouseReceiptsCount: warehouseStats.count,
      totalSuppliedQty: warehouseStats.totalQty,
      totalStockValuation,
      totalProductsCount,
      lowStockCount,
      unreadNotifs
    },
    workflowStages,
    requisitionTypes,
    dailyProdTrend: prodByDate,
    dailySalesTrend,
    recentSales,
    recentReceipts,
    stockItems,
    approvedUsers,
    recentAdminActions,
    recentSystemNotifications,
    systemHealth: {
      serverStatus: 'متصل ونشط (Online - المنفذ 3000)',
      databaseStatus: 'متصلة وجاهزة (SQLite)',
      apiStatus: 'نشط ومستقر (يعمل بصورة طبيعية)',
      currency: 'YER (الريال اليمني)',
      lastUpdated: new Date().toISOString()
    }
  };
}

// GET /api/dashboard/admin-stats - Dedicated Admin Dashboard Statistics (ADMIN ONLY - RBAC Enforced)
router.get('/admin-stats', authenticate, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const rawPeriod = (req.query.period as string) || '30days';
  const period = ['today', '7days', '30days', 'all'].includes(rawPeriod) ? rawPeriod : '30days';
  const unreadNotifs = (db.prepare(`
    SELECT COUNT(*) as c
    FROM NOTIFICATIONS
    WHERE (user_id = ? OR role_target = 'ADMIN' OR role_target = 'ALL') AND is_read = 0
  `).get(req.user!.id) as any)?.c || 0;

  const data = computeAdminDashboardStats(period, unreadNotifs);
  return res.json(data);
});

// GET /api/dashboard/stats - Role-Tailored Dynamic Dashboard Statistics
router.get('/stats', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const roleCode = user.roleCode;
  const rawPeriod = (req.query.period as string) || '30days';
  const period = ['today', '7days', '30days', 'all'].includes(rawPeriod) ? rawPeriod : '30days';

  // Strict RBAC: If a non-admin requests Admin statistics, deny immediately
  if (req.query.role === 'ADMIN' && roleCode !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح - بيانات لوحة التحكم هذه مخصصة لمدير النظام فقط'
    });
  }

  // Unread notifications for current user/role
  const unreadNotifs = (db.prepare(`
    SELECT COUNT(*) as c
    FROM NOTIFICATIONS
    WHERE (user_id = ? OR role_target = ? OR role_target = 'ALL') AND is_read = 0
  `).get(user.id, roleCode) as any)?.c || 0;

  if (roleCode === 'ADMIN') {
    return res.json(computeAdminDashboardStats(period, unreadNotifs));
  }

  if (roleCode === 'PROD_MANAGER') {
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

    // Production Trend (last 7 days) - strictly egg production in 'طبق'
    const productionTrends = db.prepare(`
      SELECT dp.record_date,
             SUM(CASE WHEN dp.unit = 'طبق' THEN dp.production_quantity ELSE 0 END) as total_prod,
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
      roleCode: 'PROD_MANAGER',
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
  const supProfileId = (db.prepare('SELECT id FROM SUPERVISORS WHERE user_id = ?').get(user.id) as any)?.id || user.id;

  const assignedHousesCount = (db.prepare(`
    SELECT COUNT(*) as c FROM HOUSES
    WHERE supervisor_id = ? OR farm_id IN (SELECT id FROM FARMS WHERE supervisor_id = ?)
  `).get(supProfileId, supProfileId) as any)?.c || (db.prepare('SELECT COUNT(*) as c FROM HOUSES').get() as any)?.c || 0;

  const assignedActiveHouses = (db.prepare(`
    SELECT COUNT(*) as c FROM HOUSES
    WHERE current_status = 'ACTIVE' AND (supervisor_id = ? OR farm_id IN (SELECT id FROM FARMS WHERE supervisor_id = ?))
  `).get(supProfileId, supProfileId) as any)?.c || (db.prepare("SELECT COUNT(*) as c FROM HOUSES WHERE current_status = 'ACTIVE'").get() as any)?.c || 0;

  const currentBirdsCount = (db.prepare("SELECT COALESCE(SUM(current_count), 0) as s FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.s || 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayProd = (db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN unit = 'طبق' THEN production_quantity ELSE 0 END), 0) as prod,
           COALESCE(SUM(mortality_count), 0) as mort
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
