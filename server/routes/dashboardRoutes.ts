import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/dashboard/stats - Real calculated statistics
router.get('/stats', authenticate, (req: AuthenticatedRequest, res: Response) => {
  // 1. Farms & Houses KPIs
  const farmsCount = (db.prepare('SELECT COUNT(*) as c FROM FARMS').get() as any)?.c || 0;
  const housesCount = (db.prepare('SELECT COUNT(*) as c FROM HOUSES').get() as any)?.c || 0;
  const activeHousesCount = (db.prepare("SELECT COUNT(*) as c FROM HOUSES WHERE current_status = 'ACTIVE'").get() as any)?.c || 0;
  const totalCapacity = (db.prepare('SELECT COALESCE(SUM(capacity), 0) as s FROM HOUSES').get() as any)?.s || 0;

  // 2. Flocks & Birds KPIs
  const activeFlocksCount = (db.prepare("SELECT COUNT(*) as c FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.c || 0;
  const currentBirdsCount = (db.prepare("SELECT COALESCE(SUM(current_count), 0) as s FROM FLOCKS WHERE status = 'ACTIVE'").get() as any)?.s || 0;
  const totalMortality = (db.prepare('SELECT COALESCE(SUM(total_mortality), 0) as s FROM FLOCKS').get() as any)?.s || 0;

  // 3. Requisitions Status Breakdown
  const reqStatusRows = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM REQUISITIONS
    GROUP BY status
  `).all() as any[];

  const reqStatusMap: Record<string, number> = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    COMPLETED: 0
  };
  reqStatusRows.forEach(r => {
    reqStatusMap[r.status] = r.count;
  });

  // 4. Products & Stock KPIs
  const productsCount = (db.prepare('SELECT COUNT(*) as c FROM PRODUCTS').get() as any)?.c || 0;
  const lowStockCount = (db.prepare('SELECT COUNT(*) as c FROM PRODUCTS WHERE current_stock <= min_stock_alert').get() as any)?.c || 0;
  const totalStockValuation = (db.prepare('SELECT COALESCE(SUM(current_stock * unit_price), 0) as s FROM PRODUCTS').get() as any)?.s || 0;

  // 5. Sales & Invoices KPIs
  const totalSalesRevenue = (db.prepare('SELECT COALESCE(SUM(total_amount), 0) as s FROM SALES_INVOICES').get() as any)?.s || 0;
  const totalInvoicesCount = (db.prepare('SELECT COUNT(*) as c FROM SALES_INVOICES').get() as any)?.c || 0;

  // 6. Production Trend (last 7 days)
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

  // 7. Recent Requisitions
  const recentRequisitions = db.prepare(`
    SELECT r.id, r.request_no, r.req_type, r.request_date, r.status, r.urgency,
           u.full_name as requester_name
    FROM REQUISITIONS r
    JOIN USERS u ON r.requester_id = u.id
    ORDER BY r.id DESC
    LIMIT 5
  `).all();

  // 8. Recent Sales
  const recentSales = db.prepare(`
    SELECT inv.id, inv.invoice_no, inv.invoice_date, inv.total_amount, inv.payment_status,
           c.customer_name
    FROM SALES_INVOICES inv
    JOIN CUSTOMERS c ON inv.customer_id = c.id
    ORDER BY inv.id DESC
    LIMIT 5
  `).all();

  // 9. Low Stock Alert Items
  const lowStockItems = db.prepare(`
    SELECT id, product_code, product_name, category, current_stock, min_stock_alert, unit
    FROM PRODUCTS
    WHERE current_stock <= min_stock_alert
    ORDER BY current_stock ASC
    LIMIT 5
  `).all();

  res.json({
    success: true,
    kpis: {
      farmsCount,
      housesCount,
      activeHousesCount,
      totalCapacity,
      activeFlocksCount,
      currentBirdsCount,
      totalMortality,
      productsCount,
      lowStockCount,
      totalStockValuation,
      totalSalesRevenue,
      totalInvoicesCount,
      pendingRequisitionsCount: (reqStatusMap['SUBMITTED'] || 0) + (reqStatusMap['UNDER_REVIEW'] || 0)
    },
    requisitionStatusBreakdown: reqStatusMap,
    productionTrends,
    recentRequisitions,
    recentSales,
    lowStockItems
  });
});

export default router;
