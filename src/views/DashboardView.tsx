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
  Ban
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

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    kpis: any;
    requisitionStatusBreakdown: any;
    productionTrends: any[];
    recentRequisitions: any[];
    recentSales: any[];
    lowStockItems: any[];
  } | null>(null);

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
      <div className="p-8 text-center text-slate-400 text-sm">
        جاري تجميع وتحليل مؤشرات الإنتاج المباشرة...
      </div>
    );
  }

  const { kpis, requisitionStatusBreakdown, productionTrends, recentRequisitions, recentSales, lowStockItems } = data;

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
            لوحة المراقبة المركزية والعمليات التشغيلية المباشرة — شركة نتش رول جروث للتنمية والاستثمار الزراعي
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
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

          {hasRole('SUPERVISOR', 'PROD_MGR', 'ADMIN') && (
            <button
              type="button"
              onClick={() => onNavigate('req-create')}
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
              <span>توريد للمستودع</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-flocks"
          title="الطيور الحية بالهناجر"
          value={`${kpis.currentBirdsCount.toLocaleString('ar-EG')} طائر`}
          subtitle={`موزعة على ${kpis.activeHousesCount} هنجر نشط من إجمالي ${kpis.housesCount}`}
          icon={Home}
          colorTheme="emerald"
        />

        <StatCard
          id="stat-requisitions"
          title="الطلبات المعلقة للمراجعة"
          value={`${kpis.pendingRequisitionsCount} طلب`}
          subtitle="بانتظار اعتماد أو مراجعة إدارة الإنتاج"
          icon={ClipboardList}
          colorTheme="amber"
        />

        <StatCard
          id="stat-sales"
          title="إجمالي إيرادات المبيعات"
          value={`${kpis.totalSalesRevenue.toLocaleString('ar-EG')} ر.س`}
          subtitle={`من واقع ${kpis.totalInvoicesCount} فاتورة بيع معتمدة ومسجلة`}
          icon={TrendingUp}
          colorTheme="blue"
        />

        <StatCard
          id="stat-inventory"
          title="تقييم المخزون الحالي"
          value={`${kpis.totalStockValuation.toLocaleString('ar-EG')} ر.س`}
          subtitle={kpis.lowStockCount > 0 ? `⚠️ ${kpis.lowStockCount} مواد تحت حد الطلب الأدنى` : 'جميع الأصناف بمستوى آمن'}
          icon={Warehouse}
          colorTheme={kpis.lowStockCount > 0 ? 'rose' : 'purple'}
        />
      </div>

      {/* Charts & Requisitions Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Trends Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                حركة الإنتاج والوفيات (آخر 7 أيام)
              </h2>
              <p className="text-xs text-slate-500">
                تتبع كميات الإنتاج الفعلي مقابل معدلات الفقد الطبيعي
              </p>
            </div>
            <Activity className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="h-64 w-full" dir="ltr">
            {productionTrends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                لا توجد سجلات إنتاج كافية للرسم البياني
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="record_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="total_prod" name="الإنتاج (طبق)" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_mortality" name="الوفيات (طائر)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Requisitions Lifecycle Breakdown (1 Column) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              حالة دورة طلبات الاحتياج
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              توزيع طلبات الكتاكيت، الأعلاف، العلاجات والمستلزمات
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800">مُقدّمة جديدة (SUBMITTED)</span>
                </div>
                <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  {requisitionStatusBreakdown['SUBMITTED'] || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">قيد المراجعة الفنية (UNDER_REVIEW)</span>
                </div>
                <span className="text-xs font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                  {requisitionStatusBreakdown['UNDER_REVIEW'] || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">معتمدة من الإدارة (APPROVED)</span>
                </div>
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {requisitionStatusBreakdown['APPROVED'] || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/60 border border-rose-100">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-slate-800">مرفوضة مع التبرير (REJECTED)</span>
                </div>
                <span className="text-xs font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                  {requisitionStatusBreakdown['REJECTED'] || 0}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('requisitions')}
            className="w-full mt-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            الانتقال لمركز اعتماد ومراجعة الطلبات ←
          </button>
        </div>
      </div>

      {/* Bottom Grid: Recent Requisitions & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requisitions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">
              أحدث طلبات الاحتياج التشغيلية
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('requisitions')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              عرض الكل
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 font-bold">رقم الطلب</th>
                  <th className="py-2.5 px-3 font-bold">النوع</th>
                  <th className="py-2.5 px-3 font-bold">المقدم</th>
                  <th className="py-2.5 px-3 font-bold">التاريخ</th>
                  <th className="py-2.5 px-3 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRequisitions.map((req) => (
                  <tr key={`dash-req-${req.id}`} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{req.request_no}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-700">{req.req_type}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{req.requester_name}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{req.request_date}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={statusArabic[req.status]?.variant || 'slate'}>
                        {statusArabic[req.status]?.label || req.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts & Inventory Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                تنبيهات المخزون الحرج (الحد الأدنى)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('products-customers')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              إدارة المنتجات
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              جميع المنتجات متوفرة بكميات كافية أعلى من حد الإنذار الأدنى
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowStockItems.map((prod) => (
                <div
                  key={`dash-low-stock-${prod.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50/40"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">{prod.product_name}</div>
                    <div className="text-[11px] text-slate-500">
                      كود: <span className="font-mono">{prod.product_code}</span> | الفئة: {prod.category}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-rose-700">
                      {prod.current_stock} {prod.unit}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      الحد الأدنى: {prod.min_stock_alert} {prod.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
