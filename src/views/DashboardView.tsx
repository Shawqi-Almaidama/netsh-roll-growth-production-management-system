import React, { useState, useEffect } from 'react';
import {
  Home,
  Egg,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  ShoppingCart,
  Warehouse,
  PlusCircle,
  FileText,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  ShieldCheck,
  Package,
  Receipt,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { StatCard } from '../components/ui/StatCard.js';
import { Badge } from '../components/ui/Badge.js';
import { formatCurrency } from '../utils/currency.js';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm font-medium" dir="rtl">
        جاري تحميل لوحة التحكم وتحديث المؤشرات التشغيلية...
      </div>
    );
  }

  const roleCode = user?.roleCode;
  const { kpis } = data;

  const statusArabic: Record<string, { label: string; variant: 'slate' | 'amber' | 'blue' | 'emerald' | 'rose' }> = {
    DRAFT: { label: 'مسودة', variant: 'slate' },
    SUBMITTED: { label: 'مُقدّم', variant: 'amber' },
    UNDER_REVIEW: { label: 'قيد المراجعة', variant: 'blue' },
    APPROVED: { label: 'معتمد', variant: 'emerald' },
    REJECTED: { label: 'مرفوض', variant: 'rose' },
    COMPLETED: { label: 'مكتمل', variant: 'emerald' }
  };

  return (
    <div id="dashboard-view" className="space-y-6 pb-12" dir="rtl">
      {/* Welcome & Role Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">
              أهلاً بك، {user?.fullName}
            </h1>
            <Badge variant="emerald">{user?.roleNameAr}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            نظام إدارة قسم الإنتاج — شركة نتش رول جروث للتنمية والاستثمار الزراعي
          </p>
        </div>

        {/* Quick Action Shortcuts tailored to role */}
        <div className="flex flex-wrap items-center gap-2">
          {hasRole('ADMIN') && (
            <button
              type="button"
              onClick={() => onNavigate('users-management')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Users className="w-4 h-4" />
              <span>إدارة المستخدمين</span>
            </button>
          )}

          {hasRole('PROD_MGR', 'ADMIN') && (
            <button
              type="button"
              onClick={() => onNavigate('requisitions')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <ClipboardList className="w-4 h-4" />
              <span>مراجعة واعتماد الطلبات</span>
            </button>
          )}

          {hasRole('SUPERVISOR', 'ADMIN') && (
            <button
              type="button"
              onClick={() => onNavigate('daily-production')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل إنتاج يومي</span>
            </button>
          )}

          {hasRole('SUPERVISOR') && (
            <button
              type="button"
              onClick={() => onNavigate('requisitions')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <ClipboardList className="w-4 h-4" />
              <span>طلب احتياج جديد</span>
            </button>
          )}

          {hasRole('SALES_OFFICER', 'ADMIN') && (
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>إصدار فاتورة بيع</span>
            </button>
          )}

          {hasRole('WAREHOUSE_KEEPER', 'ADMIN') && (
            <button
              type="button"
              onClick={() => onNavigate('warehouse')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Warehouse className="w-4 h-4" />
              <span>سند توريد مستودع</span>
            </button>
          )}

          {hasRole('ACCOUNTANT', 'ADMIN', 'PROD_MGR') && (
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>التقارير المعتمدة</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. ADMIN DASHBOARD (شوقي الميدمة) */}
      {/* ------------------------------------------------------------- */}
      {roleCode === 'ADMIN' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              id="stat-users"
              title="مستخدمو النظام"
              value={`${kpis.systemUsersCount} مستخدم`}
              subtitle={`${kpis.activeUsersCount} حسابات نشطة عبر ${kpis.rolesCount} أدوار`}
              icon={Users}
              colorTheme="slate"
            />
            <StatCard
              id="stat-houses-flocks"
              title="الهناجر والقطعان"
              value={`${kpis.housesCount} هنجر`}
              subtitle={`${kpis.activeFlocksCount} قطيع نشط (${kpis.currentBirdsCount.toLocaleString('ar-EG')} طائر)`}
              icon={Home}
              colorTheme="emerald"
            />
            <StatCard
              id="stat-sales-yer"
              title="إجمالي إيرادات المبيعات"
              value={formatCurrency(kpis.totalSalesRevenue)}
              subtitle="العملة الرسمية: الريال اليمني (YER)"
              icon={TrendingUp}
              colorTheme="blue"
            />
            <StatCard
              id="stat-inventory-yer"
              title="تقييم المخزون الإجمالي"
              value={formatCurrency(kpis.totalStockValuation)}
              subtitle="قيمة البضائع والمستلزمات الحالية بالريال اليمني"
              icon={Warehouse}
              colorTheme="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Status Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <span>حالة واستقرار النظام المركزي</span>
                </h2>
                <Badge variant="emerald">جاهزية 100%</Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <span className="text-slate-600">قاعدة البيانات والمعاملات:</span>
                  <span className="font-bold text-slate-900">{data.systemHealth?.database}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <span className="text-slate-600">العملة المعتمدة في التقارير والفواتير:</span>
                  <span className="font-bold text-emerald-800">{data.systemHealth?.currency}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <span className="text-slate-600">حالة الخادم والاستجابة:</span>
                  <span className="font-bold text-emerald-700">{data.systemHealth?.serverUptime}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <span className="text-slate-600">التقييم العام للمنظومة:</span>
                  <span className="font-bold text-slate-800">{data.systemHealth?.statusAr}</span>
                </div>
              </div>
            </div>

            {/* Recent Users List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-700" />
                  <span>أحدث الحسابات والمستخدمين المسجلين</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('users-management')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  عرض الكل
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {data.recentUsers?.map((u: any) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{u.full_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">@{u.username}</p>
                    </div>
                    <Badge variant={u.is_active ? 'emerald' : 'rose'}>
                      {u.is_active ? 'نشط' : 'معطل'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. PRODUCTION MANAGER DASHBOARD (أحمد صبر) */}
      {/* ------------------------------------------------------------- */}
      {(roleCode === 'PROD_MGR' || roleCode === 'PROD_MANAGER') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              id="stat-pending-reqs"
              title="الطلبات بانتظار الاعتماد"
              value={`${kpis.pendingReviewCount} طلب`}
              subtitle="طلبات احتياج مقدمة من مشرفي الهناجر"
              icon={ClipboardList}
              colorTheme="amber"
            />
            <StatCard
              id="stat-approved-reqs"
              title="الطلبات المعتمدة"
              value={`${kpis.approvedReqsCount} طلب`}
              subtitle="تمت مراجعتها وجاهزة للتوريد والصرف"
              icon={CheckCircle2}
              colorTheme="emerald"
            />
            <StatCard
              id="stat-active-houses"
              title="الهناجر المشغولة"
              value={`${kpis.activeHousesCount} / ${kpis.totalHousesCount}`}
              subtitle={`${kpis.currentBirdsCount.toLocaleString('ar-EG')} طائر في القطعان النشطة`}
              icon={Home}
              colorTheme="blue"
            />
            <StatCard
              id="stat-total-mortality"
              title="إجمالي وفيات القطعان"
              value={`${kpis.totalMortality.toLocaleString('ar-EG')} طائر`}
              subtitle="نسبة النفوق ضمن الحدود الطبيعية المستهدفة"
              icon={AlertTriangle}
              colorTheme="rose"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Production Trend Chart (2 cols) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    حركة الإنتاج والوفيات الميدانية (آخر 7 أيام)
                  </h2>
                  <p className="text-xs text-slate-500">
                    مقارنة الإنتاج اليومي بالوفيات وفق السجلات الرسمية
                  </p>
                </div>
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="h-64 w-full" dir="ltr">
                {(!data.productionTrends || data.productionTrends.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    لا توجد سجلات إنتاج كافية للرسم البياني
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.productionTrends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="record_date" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="total_prod" name="الإنتاج اليومي" fill="#047857" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_mortality" name="الوفيات" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pending Requisitions awaiting review */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>طلبات بانتظار قرارك</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('requisitions')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  عرض الكل
                </button>
              </div>

              <div className="space-y-2.5">
                {(!data.pendingRequisitions || data.pendingRequisitions.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    لا توجد طلبات معلقة بانتظار المراجعة
                  </div>
                ) : (
                  data.pendingRequisitions.map((req: any) => (
                    <div
                      key={req.id}
                      onClick={() => onNavigate('requisitions')}
                      className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200/80 cursor-pointer transition-all flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900">{req.request_no}</span>
                          {req.urgency === 'HIGH' && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                              عاجل
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          المقدم: {req.requester_name} ({req.items_count} بنود)
                        </p>
                      </div>
                      <Badge variant={statusArabic[req.status]?.variant || 'slate'}>
                        {statusArabic[req.status]?.label || req.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SALES OFFICER DASHBOARD (محمد الأعوج) */}
      {/* ------------------------------------------------------------- */}
      {roleCode === 'SALES_OFFICER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              id="stat-sales-total"
              title="إجمالي إيراد المبيعات"
              value={formatCurrency(kpis.totalSalesRevenue)}
              subtitle={`${kpis.totalInvoicesCount} فواتير مسجلة`}
              icon={TrendingUp}
              colorTheme="blue"
            />
            <StatCard
              id="stat-invoices-paid"
              title="الفواتير المسددة"
              value={`${kpis.paidInvoicesCount} فاتورة`}
              subtitle={`من إجمالي ${kpis.totalInvoicesCount} فاتورة`}
              icon={CheckCircle2}
              colorTheme="emerald"
            />
            <StatCard
              id="stat-customers-count"
              title="العملاء المسجلون"
              value={`${kpis.totalCustomersCount} عميل`}
              subtitle="عملاء الجملة والتجزئة والمطاعم"
              icon={Users}
              colorTheme="slate"
            />
            <StatCard
              id="stat-ready-products"
              title="أصناف البيع المتوفرة"
              value={`${kpis.readyProductsCount} أصناف`}
              subtitle={kpis.lowStockCount > 0 ? `⚠️ ${kpis.lowStockCount} أصناف تحت حد الطلب` : 'أرصدة جاهزة للبيع'}
              icon={Package}
              colorTheme={kpis.lowStockCount > 0 ? 'amber' : 'purple'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sales Invoices */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-700" />
                  <span>أحدث فواتير المبيعات</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('sales')}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800"
                >
                  إدارة الفواتير
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {data.recentSales?.map((inv: any) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-slate-900">{inv.invoice_no}</p>
                      <p className="text-[11px] text-slate-500">{inv.customer_name} — {inv.invoice_date}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-mono font-bold text-emerald-800">{formatCurrency(inv.total_amount)}</p>
                      <Badge variant={inv.payment_status === 'PAID' ? 'emerald' : 'amber'}>
                        {inv.payment_status === 'PAID' ? 'مدفوعة' : 'معلقة'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock Alerts for Sales */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>تنبيهات الأصناف منخفضة الرصيد</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('products-customers')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  فحص المخزون
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {(!data.lowStockAlerts || data.lowStockAlerts.length === 0) ? (
                  <div className="p-8 text-center text-slate-400">
                    جميع المنتجات تمتلك أرصدة كافية فوق حد الأمان
                  </div>
                ) : (
                  data.lowStockAlerts.map((prod: any) => (
                    <div key={prod.id} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{prod.product_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          السعر: {formatCurrency(prod.unit_price)} / {prod.unit}
                        </p>
                      </div>
                      <div className="text-left">
                        <span className="font-mono font-bold text-rose-700">
                          {prod.current_stock} {prod.unit}
                        </span>
                        <p className="text-[10px] text-slate-400">حد الأمان: {prod.min_stock_alert}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. WAREHOUSE KEEPER DASHBOARD (ريان موسى) */}
      {/* ------------------------------------------------------------- */}
      {roleCode === 'WAREHOUSE_KEEPER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              id="stat-products-count"
              title="إجمالي الأصناف المسجلة"
              value={`${kpis.totalProductsCount} صنف`}
              subtitle="منتجات وأعلاف ومستلزمات بيطرية"
              icon={Package}
              colorTheme="purple"
            />
            <StatCard
              id="stat-stock-units"
              title="الوحدات المخزنة الفعلية"
              value={`${kpis.totalStockUnits.toLocaleString('ar-EG')} وحدة`}
              subtitle="جاهزة للصرف أو التوريد الفوري"
              icon={Warehouse}
              colorTheme="emerald"
            />
            <StatCard
              id="stat-low-stock-count"
              title="أصناف بحاجة لتوريد"
              value={`${kpis.lowStockCount} أصناف`}
              subtitle="أرصدتها بلغت أو انخفضت عن حد الأمان"
              icon={AlertTriangle}
              colorTheme={kpis.lowStockCount > 0 ? 'rose' : 'slate'}
            />
            <StatCard
              id="stat-receipts-count"
              title="سندات التوريد المعتمدة"
              value={`${kpis.totalReceiptsCount} سند`}
              subtitle="حركات استلام موثقة مع الموردين والدفعات"
              icon={CheckCircle2}
              colorTheme="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Warehouse Receipts */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-purple-700" />
                  <span>أحدث سندات استلام التوريد</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('warehouse')}
                  className="text-xs font-bold text-purple-700 hover:text-purple-800"
                >
                  إصدار سند جديد
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {data.recentReceipts?.map((rcp: any) => (
                  <div key={rcp.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-slate-900">{rcp.receipt_no}</p>
                      <p className="text-[11px] text-slate-500">{rcp.product_name} — {rcp.supplier_name}</p>
                    </div>
                    <div className="text-left">
                      <span className="font-mono font-bold text-emerald-800">+{rcp.quantity} {rcp.unit}</span>
                      <p className="text-[10px] text-slate-400">{rcp.receipt_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Low Stock Items */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>أصناف وصلت للحد الأدنى (مطلوب توريد)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('products-customers')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  سجل الأصناف
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {(!data.lowStockItems || data.lowStockItems.length === 0) ? (
                  <div className="p-8 text-center text-slate-400">
                    كافة الأصناف بحالة استقرار ومخزون آمن
                  </div>
                ) : (
                  data.lowStockItems.map((it: any) => (
                    <div key={it.id} className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{it.product_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{it.product_code}</p>
                      </div>
                      <div className="text-left">
                        <span className="font-mono font-bold text-rose-700">{it.current_stock} {it.unit}</span>
                        <p className="text-[10px] text-slate-500">الحد: {it.min_stock_alert}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. ACCOUNTANT DASHBOARD (ماهر نضير) */}
      {/* ------------------------------------------------------------- */}
      {roleCode === 'ACCOUNTANT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              id="stat-acc-revenue"
              title="إجمالي الإيرادات المسجلة"
              value={formatCurrency(kpis.totalSalesRevenue)}
              subtitle="العملة الرسمية: الريال اليمني (YER)"
              icon={TrendingUp}
              colorTheme="blue"
            />
            <StatCard
              id="stat-acc-tax"
              title="إجمالي الضريبة المعتمدة"
              value={formatCurrency(kpis.totalTaxAmount)}
              subtitle="مستحقات ضريبية على المبيعات"
              icon={Receipt}
              colorTheme="slate"
            />
            <StatCard
              id="stat-acc-stock-val"
              title="تقييم المخزون المالي"
              value={formatCurrency(kpis.totalStockValuation)}
              subtitle="قيمة الأصول المخزنية المسعرة بالريال اليمني"
              icon={Warehouse}
              colorTheme="emerald"
            />
            <StatCard
              id="stat-acc-invoices"
              title="فواتير المبيعات"
              value={`${kpis.paidInvoicesCount} / ${kpis.totalInvoicesCount}`}
              subtitle="فواتير مسددة بالكامل مقابل الإجمالي"
              icon={CheckCircle2}
              colorTheme="purple"
            />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <span>أحدث العمليات المالية والفواتير</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                دفتر فواتير المبيعات
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-y border-slate-100">
                  <tr>
                    <th className="p-3 font-bold">رقم الفاتورة</th>
                    <th className="p-3 font-bold">اسم العميل</th>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">المجموع الفرعي</th>
                    <th className="p-3 font-bold">الضريبة</th>
                    <th className="p-3 font-bold">الإجمالي النهائي</th>
                    <th className="p-3 font-bold">حالة السداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentInvoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-900">{inv.invoice_no}</td>
                      <td className="p-3 font-semibold text-slate-900">{inv.customer_name}</td>
                      <td className="p-3 font-mono text-slate-600">{inv.invoice_date}</td>
                      <td className="p-3 font-mono font-medium">{formatCurrency(inv.subtotal)}</td>
                      <td className="p-3 font-mono text-slate-500">{formatCurrency(inv.tax_amount)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-800">{formatCurrency(inv.total_amount)}</td>
                      <td className="p-3">
                        <Badge variant={inv.payment_status === 'PAID' ? 'emerald' : 'amber'}>
                          {inv.payment_status === 'PAID' ? 'مسددة' : 'معلقة'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. SUPERVISOR DASHBOARD (مشرف الإنتاج) */}
      {/* ------------------------------------------------------------- */}
      {roleCode === 'SUPERVISOR' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              id="stat-sup-houses"
              title="الهناجر التابعة لإشرافك"
              value={`${kpis.assignedActiveHouses} / ${kpis.assignedHousesCount}`}
              subtitle="هناجر نشطة منتجة حالياً"
              icon={Home}
              colorTheme="emerald"
            />
            <StatCard
              id="stat-sup-birds"
              title="الطيور الحية بالقطعان"
              value={`${kpis.currentBirdsCount.toLocaleString('ar-EG')} طائر`}
              subtitle="رعاية وتغذية دورية منتظمة"
              icon={Egg}
              colorTheme="blue"
            />
            <StatCard
              id="stat-sup-prod"
              title="إنتاج اليوم المسجل"
              value={`${kpis.todayProduction.toLocaleString('ar-EG')}`}
              subtitle="طبق / كجم مسجل اليوم"
              icon={PlusCircle}
              colorTheme="purple"
            />
            <StatCard
              id="stat-sup-reqs"
              title="طلباتك قيد المتابعة"
              value={`${kpis.myReqPendingCount} طلب`}
              subtitle={`${kpis.myReqApprovedCount} طلبات معتمدة بالفعل`}
              icon={ClipboardList}
              colorTheme="amber"
            />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-700" />
                <span>سجل طلبات الاحتياج التشغيلية الخاصة بك</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('requisitions')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                تقديم طلب احتياج جديد
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {(!data.myRecentRequisitions || data.myRecentRequisitions.length === 0) ? (
                <div className="p-8 text-center text-slate-400">
                  لم تقم بتسجيل أي طلبات احتياج مؤخراً
                </div>
              ) : (
                data.myRecentRequisitions.map((req: any) => (
                  <div key={req.id} className="p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{req.request_no}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        النوع: {req.req_type} — التاريخ: {req.request_date}
                      </p>
                      {req.review_notes && (
                        <p className="text-[11px] text-emerald-800 mt-0.5 font-medium">
                          رد الإدارة: {req.review_notes}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusArabic[req.status]?.variant || 'slate'}>
                      {statusArabic[req.status]?.label || req.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
