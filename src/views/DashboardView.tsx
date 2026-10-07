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
  ArrowRight,
  ChevronLeft,
  Filter,
  Layers,
  Boxes,
  ArrowUpRight
} from 'lucide-react';
import {
  HorizontalWorkflowChart,
  VerticalBarChart,
  TrendLineAreaChart,
  ComparisonBarChart
} from '../components/charts/DashboardCharts.js';
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchStats = async (period = selectedPeriod) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardStats(period);
      if (res && res.success) {
        setData(res);
      } else {
        setError(res?.message || 'تعذر تحميل بيانات لوحة التحكم. يرجى إعادة المحاولة.');
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('تعذر الاتصال بالخادم لتحميل لوحة التحكم. يرجى التحقق من اتصال الشبكة وإعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedPeriod);
  }, [selectedPeriod]);

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm font-medium space-y-3" dir="rtl">
        <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>جاري تحميل لوحة التحكم وتحديث المؤشرات التشغيلية...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 my-8 max-w-md mx-auto bg-white rounded-2xl border border-rose-200 shadow-xs text-center space-y-4" dir="rtl">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">تعذر تحميل بيانات لوحة التحكم</h3>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => fetchStats(selectedPeriod)}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const roleCode = user?.roleCode;
  const { kpis } = data || { kpis: {} };

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
            <Badge variant="emerald">{user?.roleNameAr || 'مدير النظام'}</Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            نتش رول جروث — نظام إدارة قسم الإنتاج والمزارع الداجنة
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

          {hasRole('PROD_MANAGER', 'ADMIN') && (
            <button
              type="button"
              onClick={() => onNavigate('requisitions')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <ClipboardList className="w-4 h-4" />
              <span>إدارة الطلبات</span>
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

          {hasRole('ACCOUNTANT', 'ADMIN', 'PROD_MANAGER') && (
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
      {/* 1. ADMIN DASHBOARD (شوقي الميدمة — مدير النظام) */}
      {/* ------------------------------------------------------------- */}
      {roleCode === 'ADMIN' && (
        <div className="space-y-6">
          {/* Period Filter & Executive Subtitle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800">نطاق التقارير والمؤشرات:</span>
              <span className="text-xs text-slate-500">
                {selectedPeriod === 'today' && 'بيانات اليوم الفعلي'}
                {selectedPeriod === '7days' && 'مؤشرات آخر 7 أيام تشغيلية'}
                {selectedPeriod === '30days' && 'مؤشرات آخر 30 يومًا (الشهر الحالي)'}
                {selectedPeriod === 'all' && 'كافة السجلات التراكمية في المنظومة'}
              </span>
            </div>

            {/* Segmented Period Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedPeriod('today')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedPeriod === 'today'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('7days')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedPeriod === '7days'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                آخر 7 أيام
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('30days')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedPeriod === '30days'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                آخر 30 يومًا
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('all')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedPeriod === 'all'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كافة الفترات
              </button>
            </div>
          </div>

          {/* Section 1: Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => onNavigate('users-management')}
              className="cursor-pointer transition-transform active:scale-[0.99]"
            >
              <StatCard
                id="stat-admin-users"
                title="مستخدمو المنظومة"
                value={`${kpis.systemUsersCount} مستخدمين`}
                subtitle={`${kpis.activeUsersCount} نشط • ${kpis.inactiveUsersCount} معطل (${kpis.rolesCount} أدوار معتمدة)`}
                icon={Users}
                colorTheme="slate"
              />
            </div>
            <div
              onClick={() => onNavigate('requisitions')}
              className="cursor-pointer transition-transform active:scale-[0.99]"
            >
              <StatCard
                id="stat-admin-reqs"
                title="طلبات الاحتياج"
                value={`${kpis.totalRequisitions} طلب`}
                subtitle={`${kpis.pendingReviewReqs} قيد المراجعة • ${kpis.approvedReqs} معتمد`}
                icon={ClipboardList}
                colorTheme="amber"
              />
            </div>
            <div
              onClick={() => onNavigate('sales')}
              className="cursor-pointer transition-transform active:scale-[0.99]"
            >
              <StatCard
                id="stat-admin-sales"
                title="إيرادات المبيعات (YER)"
                value={formatCurrency(kpis.totalSalesRevenue)}
                subtitle={`${kpis.salesInvoicesCount} فاتورة بيع • العملة: الريال اليمني حصراً`}
                icon={TrendingUp}
                colorTheme="blue"
              />
            </div>
            <div
              onClick={() => onNavigate('warehouse')}
              className="cursor-pointer transition-transform active:scale-[0.99]"
            >
              <StatCard
                id="stat-admin-warehouse"
                title="سندات التوريد والمخزون"
                value={`${kpis.warehouseReceiptsCount} سند توريد`}
                subtitle={`${kpis.totalSuppliedQty.toLocaleString('ar-EG')} وحدة موردة • تقييم ${formatCurrency(kpis.totalStockValuation)}`}
                icon={Warehouse}
                colorTheme="purple"
              />
            </div>
          </div>

          {/* Section 2 & 4: Requisitions Workflow Stages & Types Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requisitions Workflow Stages Pipeline */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-700" />
                      <span>مخطط سير ومراحل طلبات الاحتياج</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      توزيع الطلبات الفعلية وفق دورة الاعتماد الرسمية من قاعدة البيانات
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('requisitions')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <span>مراجعة الطلبات</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Workflow Stage Bars */}
                <div className="w-full pt-1">
                  <HorizontalWorkflowChart
                    data={data.workflowStages || []}
                    totalCount={kpis.totalRequisitions || 0}
                  />
                </div>
              </div>

              {/* Status Pills Breakdown */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-3 border-t border-slate-100 mt-3 text-center">
                {data.workflowStages?.map((st: any) => (
                  <div key={st.status} className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-medium">{st.label}</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{st.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Requisitions by Category Types */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Boxes className="w-5 h-5 text-blue-700" />
                      <span>مخطط أنواع طلبات الاحتياج</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      تصنيف طلبات التوريد والمشتريات حسب القطاعات الأربعة المعتمدة
                    </p>
                  </div>
                  <Badge variant="blue">{kpis.totalRequisitions} إجمالي</Badge>
                </div>

                <div className="w-full pt-1">
                  <VerticalBarChart
                    data={(data.requisitionTypes || []).map((t: any) => ({
                      label: t.label,
                      value: t.count,
                      color: '#2563eb',
                      formattedValue: `${t.count} طلب`
                    }))}
                    height={190}
                    barColor="#2563eb"
                    unitLabel="طلب"
                    emptyMessage="لا توجد بيانات كافية للفترة المحددة"
                  />
                </div>
              </div>

              {/* Types Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 mt-3">
                {data.requisitionTypes?.map((t: any) => (
                  <div key={t.type} className="p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-center">
                    <span className="text-[11px] font-bold text-blue-900 block truncate">{t.label}</span>
                    <span className="text-xs font-black text-blue-700">{t.count} طلب</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Daily Production (الإنتاج اليومي - DAILY_PRODUCTION) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-700" />
                  <span>حركة الإنتاج اليومي ومتابعة القطعان الميدانية</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  بيانات الإنتاج الفعلي للبيض وحالات النفوق المسجلة — مصدر البيانات جدول DAILY_PRODUCTION
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('daily-production')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
              >
                <span>سجل الإنتاج اليومي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Production Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/60">
                <span className="text-xs text-slate-500 block">إجمالي إنتاج الفترة:</span>
                <span className="text-lg font-black text-emerald-800">
                  {kpis.totalProdQty?.toLocaleString('ar-EG') || 0} طبق
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">متوسط الإنتاج اليومي:</span>
                <span className="text-lg font-black text-slate-800">
                  {kpis.avgDailyProd || 0} طبق/يوم
                </span>
              </div>
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/60">
                <span className="text-xs text-slate-500 block">إجمالي النفوق المسجل:</span>
                <span className="text-lg font-black text-rose-700">
                  {kpis.totalMortality?.toLocaleString('ar-EG') || 0} طائر
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">عدد سجلات الإنتاج:</span>
                <span className="text-lg font-black text-slate-800">
                  {kpis.prodEntryCount || 0} سجل
                </span>
              </div>
            </div>

            {/* Distinct Visual Charts: Egg Production & Mortality Separated */}
            {(!data.dailyProdTrend || data.dailyProdTrend.length === 0) ? (
              <div className="p-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl">
                لا توجد سجلات إنتاج يومي مسجلة في هذه الفترة الزمنية ({selectedPeriod === 'today' ? 'اليوم' : selectedPeriod === '7days' ? 'آخر 7 أيام' : 'الفترة المحددة'})
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Chart 1: Egg Production Quantity (Unit: طبق) */}
                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">مسار إنتاج البيض اليومي</span>
                    <Badge variant="emerald">الوحدة: طبق</Badge>
                  </div>
                  <div className="w-full">
                    <TrendLineAreaChart
                      data={(data.dailyProdTrend || []).map((p: any) => ({
                        date: p.date,
                        value: p.prodQty,
                        label: `${p.prodQty} طبق`
                      }))}
                      height={200}
                      strokeColor="#059669"
                      unitLabel="طبق"
                      emptyMessage="لا توجد سجلات إنتاج مسجلة للفترة المحددة"
                    />
                  </div>
                </div>

                {/* Chart 2: Recorded Bird Mortality (Unit: طائر) */}
                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">حالات النفوق الميداني المسجلة</span>
                    <Badge variant="rose">الوحدة: طائر</Badge>
                  </div>
                  <div className="w-full">
                    <VerticalBarChart
                      data={(data.dailyProdTrend || []).map((p: any) => ({
                        label: p.date,
                        value: p.mortality,
                        color: '#ef4444',
                        formattedValue: `${p.mortality} طائر`
                      }))}
                      height={200}
                      barColor="#ef4444"
                      unitLabel="طائر"
                      emptyMessage="لا توجد وفيات مسجلة للفترة المحددة"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Sales Section (YER) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-700" />
                  <span>قسم المبيعات وإيرادات الفواتير المعتمدة (بالريال اليمني YER)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  حركة فواتير البيع للعملاء — العملة الرسمية YER حصراً، ويمكن تحديد نسبة الضريبة اختياريًا وفق إعدادات النظام
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
              >
                <span>فتح قسم المبيعات</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sales Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/60">
                <span className="text-xs text-slate-500 block">عدد فواتير الفترة:</span>
                <span className="text-lg font-black text-slate-900">{kpis.salesInvoicesCount} فاتورة</span>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/60">
                <span className="text-xs text-slate-500 block">إجمالي إيرادات المبيعات:</span>
                <span className="text-lg font-black text-emerald-800">{formatCurrency(kpis.totalSalesRevenue)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">متوسط قيمة الفاتورة:</span>
                <span className="text-lg font-black text-slate-800">{formatCurrency(kpis.avgInvoiceValue)}</span>
              </div>
            </div>

            {/* Sales Revenue Trend Chart */}
            {data.dailySalesTrend && data.dailySalesTrend.length > 0 && (
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800">مسار إيرادات المبيعات اليومية</span>
                  <Badge variant="blue">العملة: الريال اليمني (YER)</Badge>
                </div>
                <div className="w-full">
                  <VerticalBarChart
                    data={data.dailySalesTrend.map((s: any) => ({
                      label: s.date,
                      value: s.totalAmount,
                      color: '#2563eb',
                      formattedValue: formatCurrency(s.totalAmount)
                    }))}
                    height={180}
                    barColor="#2563eb"
                    unitLabel="ريال يمني"
                    yAxisFormatter={(val) => `${(val / 1000).toLocaleString('ar-EG')} ألف`}
                    emptyMessage="لا توجد فواتير مبيعات مسجلة للفترة المحددة"
                  />
                </div>
              </div>
            )}

            {/* Sales Invoices List */}
            <div className="overflow-x-auto">
              {(!data.recentSales || data.recentSales.length === 0) ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  لا توجد فواتير مبيعات مسجلة للفترة المحددة
                </div>
              ) : (
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium">
                      <th className="py-2 px-3">رقم الفاتورة</th>
                      <th className="py-2 px-3">اسم العميل</th>
                      <th className="py-2 px-3">تاريخ الفاتورة</th>
                      <th className="py-2 px-3">المبلغ الإجمالي</th>
                      <th className="py-2 px-3">حالة السداد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentSales?.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoice_no}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{inv.customer_name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{inv.invoice_date}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-800">{formatCurrency(inv.total_amount)}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={inv.payment_status === 'PAID' ? 'emerald' : 'amber'}>
                            {inv.payment_status === 'PAID' ? 'مسددة بالكامل' : 'قيد السداد'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Section 7: Warehouse & Supply Movement */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-purple-700" />
                  <span>قسم المستودعات المركزية وحركة التوريد والمخزون</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  متابعة سندات التوريد المعتمدة ورصيد الأصناف والمنتجات والتقييم التقديري للتخزين
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('warehouse')}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
              >
                <span>فتح سجل المستودع</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Warehouse Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100/60">
                <span className="text-xs text-slate-500 block">سندات التوريد:</span>
                <span className="text-lg font-black text-purple-900">{kpis.warehouseReceiptsCount} سند</span>
              </div>
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100/60">
                <span className="text-xs text-slate-500 block">إجمالي الكميات الموردة:</span>
                <span className="text-lg font-black text-slate-900">{kpis.totalSuppliedQty?.toLocaleString('ar-EG') || 0} وحدة</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">التقييم التقديري للمخزون:</span>
                <span className="text-lg font-black text-emerald-800">{formatCurrency(kpis.totalStockValuation)}</span>
              </div>
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/60">
                <span className="text-xs text-slate-500 block">أصناف تحت حد الإنذار:</span>
                <span className="text-lg font-black text-rose-700">{kpis.lowStockCount} أصناف</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Latest Warehouse Receipts */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>أحدث عمليات التوريد المخزني</span>
                  <span className="text-[11px] text-purple-700 font-medium">سندات معتمدة</span>
                </h3>
                {(!data.recentReceipts || data.recentReceipts.length === 0) ? (
                  <p className="text-xs text-slate-400 py-6 text-center">لا توجد سندات توريد مسجلة بالفترة</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {data.recentReceipts?.map((rc: any) => (
                      <div key={rc.id} className="p-2.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{rc.product_name}</p>
                          <p className="text-[11px] text-slate-500">المورد: {rc.supplier_name} • سند #{rc.receipt_no}</p>
                        </div>
                        <div className="text-left">
                          <span className="font-mono font-bold text-purple-800">{rc.quantity} {rc.unit}</span>
                          <span className="block text-[10px] text-slate-400">{rc.receipt_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stock Status & Alert Levels */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>مستوى المخزون والأصناف الحرجة</span>
                  <span className="text-[11px] text-slate-500 font-normal">الأصناف الأكثر أهمية</span>
                </h3>
                {(!data.stockItems || data.stockItems.length === 0) ? (
                  <p className="text-xs text-slate-400 py-6 text-center">لا توجد أصناف مسجلة</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {data.stockItems?.map((p: any) => {
                      const isLow = p.current_stock <= p.min_stock_alert;
                      return (
                        <div key={p.id} className="p-2.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{p.product_name}</span>
                              {isLow && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 font-bold">
                                  منخفض
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500">كود: {p.product_code} • {p.category}</p>
                          </div>
                          <div className="text-left">
                            <span className={`font-mono font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                              {p.current_stock} {p.unit}
                            </span>
                            <span className="block text-[10px] text-slate-400">الحد الأدنى: {p.min_stock_alert}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 8 & Section 9: Recent Activities & Users Directory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 8: Administrative Activity & Audit Trail */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                      <span>النشاط الإداري وسجلات العمليات الأخيرة</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      توثيق آمن للحركات المنفذة مع بيان المسؤول (بدون إظهار أي بيانات حساسة)
                    </p>
                  </div>
                  <Badge variant="emerald">توثيق كامل</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  {(!data.recentAdminActions || data.recentAdminActions.length === 0) ? (
                    <p className="text-xs text-slate-400 py-6 text-center">لا توجد حركات إدارية موثقة بالفترة</p>
                  ) : (
                    data.recentAdminActions?.map((act: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-900 block">{act.action}</span>
                          <span className="text-[11px] text-slate-500">
                            مرجع: <span className="font-mono">{act.ref_no}</span>
                            {act.user_name && <span> • المنفذ: {act.user_name}</span>}
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 block">{act.act_date || act.created_at?.slice(0, 10)}</span>
                          <Badge variant="slate">{act.status}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notifications Pulse */}
              <div className="pt-3 border-t border-slate-100 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">أحدث التنبيهات النظامية:</span>
                  <span className="text-[11px] text-emerald-700 font-medium">{kpis.unreadNotifs || 0} غير مقروء</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {data.recentSystemNotifications?.slice(0, 2).map((n: any) => (
                    <div key={n.id} className="p-2 bg-emerald-50/40 rounded border border-emerald-100/50 flex items-center justify-between">
                      <span className="font-medium text-slate-800 truncate">{n.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{n.created_at?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 9: Canonical 6 Users Directory */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-800" />
                    <span>المستخدمون المعتمدون في النظام (6 مستخدمين)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    الهيكل الإداري الرسمي المعتمد لكافة الأدوار في المنظومة
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('users-management')}
                  className="text-xs font-bold text-slate-800 hover:text-slate-900 flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <span>إدارة المستخدمين</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {data.approvedUsers?.map((u: any) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{u.full_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">@{u.username} • {u.role_name_ar || u.role_code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.role_code === 'ADMIN' ? 'slate' : u.role_code === 'PROD_MANAGER' ? 'emerald' : u.role_code === 'SALES_OFFICER' ? 'blue' : u.role_code === 'WAREHOUSE_KEEPER' ? 'purple' : 'amber'}>
                        {u.role_code}
                      </Badge>
                      <Badge variant={u.is_active ? 'emerald' : 'rose'}>
                        {u.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 10: Real Technical System Status Indicators */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span>المؤشرات الفنية والتشغيلية للخدمات المركزية</span>
              </h2>
              <Badge variant="emerald">الخدمات متصلة وتعمل (Online)</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block mb-1">حالة الخادم:</span>
                <span className="font-bold text-slate-900">{data.systemHealth?.serverStatus || 'متصل ونشط (Online)'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block mb-1">حالة قاعدة البيانات:</span>
                <span className="font-bold text-emerald-800">{data.systemHealth?.databaseStatus || 'متصلة وجاهزة'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block mb-1">حالة واجهة البرمجة (API):</span>
                <span className="font-bold text-emerald-700">{data.systemHealth?.apiStatus || 'نشط ومستقر'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block mb-1">آخر تحديث للبيانات:</span>
                <span className="font-mono text-slate-800">{data.systemHealth?.lastUpdated ? new Date(data.systemHealth.lastUpdated).toLocaleTimeString('ar-YE') : 'محدث الآن'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. PRODUCTION MANAGER DASHBOARD (أحمد صبر) */}
      {/* ------------------------------------------------------------- */}
      {roleCode === 'PROD_MANAGER' && (
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

              <div className="w-full">
                <ComparisonBarChart
                  data={data.productionTrends || []}
                  height={240}
                  emptyMessage="لا توجد سجلات إنتاج كافية للرسم البياني"
                />
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
              title="القيمة التقديرية للمخزون"
              value={formatCurrency(kpis.totalStockValuation)}
              subtitle="إجمالي القيمة التقديرية للأصناف المخزنية بالريال اليمني"
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
              subtitle="طبق مسجل اليوم"
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
