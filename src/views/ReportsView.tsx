import React, { useState, useEffect, useMemo } from 'react';
import {
  FileBarChart2,
  Calendar,
  Filter,
  Download,
  Printer,
  Egg,
  TrendingDown,
  Wheat,
  DollarSign,
  Warehouse,
  FileText,
  ArrowRight
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from '../components/ui/Badge.js';
import { formatCurrency } from '../utils/currency.js';

export const ReportsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const roleCode = user?.roleCode;

  // Available reports based on role
  const allowedReports = useMemo(() => {
    const allReports = [
      {
        code: 'R-01' as const,
        title: 'تقرير الإنتاج اليومي',
        icon: Egg,
        desc: 'تفاصيل إنتاج البيض واللحوم لكل هنجر وقطيع',
        roles: ['ADMIN', 'PROD_MGR', 'SUPERVISOR', 'ACCOUNTANT']
      },
      {
        code: 'R-02' as const,
        title: 'معدل الوفيات والفقد الطبيعي',
        icon: TrendingDown,
        desc: 'نسبة النفوق والتقييم الصحي للقطعان',
        roles: ['ADMIN', 'PROD_MGR', 'SUPERVISOR']
      },
      {
        code: 'R-03' as const,
        title: 'استهلاك الأعلاف ومعدل التحويل',
        icon: Wheat,
        desc: 'كميات استهلاك الأعلاف ومؤشر التحويل الغذائي',
        roles: ['ADMIN', 'PROD_MGR', 'SUPERVISOR']
      },
      {
        code: 'R-04' as const,
        title: 'المبيعات وإيرادات العملاء',
        icon: DollarSign,
        desc: 'حجم مبيعات المنتجات بالريال اليمني وتوزيعها على العملاء',
        roles: ['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT']
      },
      {
        code: 'R-05' as const,
        title: 'حركة المخزون وتقييم الأصناف',
        icon: Warehouse,
        desc: 'الأرصدة الحالية، قيمة المخزون والحدود الحرجة',
        roles: ['ADMIN', 'WAREHOUSE_KEEPER', 'ACCOUNTANT', 'SALES_OFFICER', 'PROD_MGR']
      },
    ];

    if (!roleCode || roleCode === 'ADMIN') return allReports;
    return allReports.filter(r => r.roles.includes(roleCode));
  }, [roleCode]);

  const [activeReport, setActiveReport] = useState<'R-01' | 'R-02' | 'R-03' | 'R-04' | 'R-05'>('R-01');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Sync active report if role changes or default is not allowed
  useEffect(() => {
    if (allowedReports.length > 0 && !allowedReports.some(r => r.code === activeReport)) {
      setActiveReport(allowedReports[0].code);
    }
  }, [allowedReports, activeReport]);

  const fetchReport = async (code: string) => {
    setLoading(true);
    try {
      let res;
      if (code === 'R-01') res = await api.getReportR01(startDate, endDate);
      else if (code === 'R-02') res = await api.getReportR02(startDate, endDate);
      else if (code === 'R-03') res = await api.getReportR03(startDate, endDate);
      else if (code === 'R-04') res = await api.getReportR04(startDate, endDate);
      else if (code === 'R-05') res = await api.getReportR05();

      if (res && res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport]);

  const currentReportConfig = allowedReports.find(r => r.code === activeReport);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="reports-view" className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                title="رجوع للوحة التحكم"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FileBarChart2 className="w-6 h-6 text-emerald-700" />
              <span>التقارير التشغيلية والمالية المعتمدة</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            استخراج وعرض البيانات الحية الموثقة من واقع العمليات الميدانية والمخزنية والمالية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Reports Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {allowedReports.map(rep => {
          const Icon = rep.icon;
          const isActive = activeReport === rep.code;

          return (
            <button
              key={rep.code}
              type="button"
              onClick={() => setActiveReport(rep.code)}
              className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-emerald-900 border-emerald-900 text-white shadow-sm ring-2 ring-emerald-700/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-300' : 'text-emerald-700'}`} />
                </div>
                <h3 className="font-bold text-xs leading-relaxed">{rep.title}</h3>
                <p className={`text-[11px] mt-1 line-clamp-2 ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                  {rep.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Filter className="w-4 h-4 text-slate-400" />
            تصفية التاريخ:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchReport(activeReport)}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold transition-colors"
          >
            تطبيق الفلترة
          </button>
        </div>

        {currentReportConfig && (
          <div className="text-xs font-bold text-slate-600">
            التقرير النشط: <span className="text-emerald-800">{currentReportConfig.title}</span>
          </div>
        )}
      </div>

      {/* Report Data Presentation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            جاري استخراج وتحليل بيانات التقرير...
          </div>
        ) : !reportData ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد بيانات متاحة لهذا التقرير
          </div>
        ) : (
          <div>
            {/* R-01: Daily Production */}
            {activeReport === 'R-01' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">التاريخ</th>
                      <th className="p-3 font-bold">الهنجر / المزرعة</th>
                      <th className="p-3 font-bold">كود القطيع</th>
                      <th className="p-3 font-bold">الإنتاج اليومي</th>
                      <th className="p-3 font-bold">الوفيات</th>
                      <th className="p-3 font-bold">العلف (كجم)</th>
                      <th className="p-3 font-bold">الماء (لتر)</th>
                      <th className="p-3 font-bold">متوسط الوزن (جم)</th>
                      <th className="p-3 font-bold">المشرف المسؤول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono font-bold text-slate-800">{row.record_date}</td>
                        <td className="p-3 font-semibold text-slate-900">{row.house_name} ({row.farm_name})</td>
                        <td className="p-3 font-mono text-slate-600">{row.flock_code}</td>
                        <td className="p-3 font-mono font-bold text-emerald-800">{row.production_quantity} {row.unit}</td>
                        <td className="p-3 font-mono text-rose-600">{row.mortality_count} طائر</td>
                        <td className="p-3 font-mono text-slate-700">{row.feed_consumed_kg}</td>
                        <td className="p-3 font-mono text-slate-700">{row.water_consumed_liters}</td>
                        <td className="p-3 font-mono text-slate-700">{row.avg_weight_g}</td>
                        <td className="p-3 text-slate-600">{row.supervisor_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-02: Mortality & Bio-loss */}
            {activeReport === 'R-02' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">كود القطيع</th>
                      <th className="p-3 font-bold">السلالة</th>
                      <th className="p-3 font-bold">الهنجر</th>
                      <th className="p-3 font-bold">العدد الأولي</th>
                      <th className="p-3 font-bold">الرصيد الحي الحالي</th>
                      <th className="p-3 font-bold">إجمالي الوفيات</th>
                      <th className="p-3 font-bold">نسبة النفوق الإجمالية</th>
                      <th className="p-3 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((row: any, i: number) => {
                      const rate = Number(row.mortality_rate_pct || 0);
                      return (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono font-bold text-slate-900">{row.flock_code}</td>
                          <td className="p-3 text-slate-800">{row.breed}</td>
                          <td className="p-3 text-slate-600">{row.house_name}</td>
                          <td className="p-3 font-mono font-bold text-slate-700">{row.initial_count}</td>
                          <td className="p-3 font-mono font-bold text-emerald-800">{row.current_count}</td>
                          <td className="p-3 font-mono font-bold text-rose-600">{row.total_mortality}</td>
                          <td className="p-3 font-mono font-black text-slate-900">
                            {rate.toFixed(2)}%
                          </td>
                          <td className="p-3">
                            <Badge variant={rate > 5 ? 'rose' : rate > 3 ? 'amber' : 'emerald'}>
                              {rate > 5 ? 'معدل حرج ⚠️' : rate > 3 ? 'متابعة وقائية' : 'طبيعي وممتاز'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-03: Feed & Conversion */}
            {activeReport === 'R-03' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">التاريخ</th>
                      <th className="p-3 font-bold">الهنجر</th>
                      <th className="p-3 font-bold">كود القطيع</th>
                      <th className="p-3 font-bold">كمية العلف (كجم)</th>
                      <th className="p-3 font-bold">متوسط الوزن (جم)</th>
                      <th className="p-3 font-bold">مؤشر التحويل التقديري</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((row: any, i: number) => {
                      const fcr = row.avg_weight_g > 0 ? (row.feed_consumed_kg / (row.avg_weight_g / 1000)).toFixed(2) : '-';
                      return (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono font-bold text-slate-800">{row.record_date}</td>
                          <td className="p-3 text-slate-900 font-semibold">{row.house_name}</td>
                          <td className="p-3 font-mono text-slate-600">{row.flock_code}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">{row.feed_consumed_kg} كجم</td>
                          <td className="p-3 font-mono font-bold text-emerald-800">{row.avg_weight_g} جم</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{fcr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-04: Sales by Customer */}
            {activeReport === 'R-04' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">اسم العميل</th>
                      <th className="p-3 font-bold">نوع العميل</th>
                      <th className="p-3 font-bold">عدد الفواتير</th>
                      <th className="p-3 font-bold">إجمالي المبيعات</th>
                      <th className="p-3 font-bold">الضريبة</th>
                      <th className="p-3 font-bold">الصافي المستحق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-3 font-bold text-slate-900">{row.customer_name}</td>
                        <td className="p-3 text-slate-600">
                          {row.customer_type === 'WHOLESALE' ? 'جملة' : row.customer_type === 'RETAIL' ? 'تجزئة' : 'مطاعم وفنادق'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">{row.invoices_count || row.total_invoices || 0}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {formatCurrency(row.total_sales || 0)}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {formatCurrency(row.total_tax || 0)}
                        </td>
                        <td className="p-3 font-mono font-black text-emerald-800">
                          {formatCurrency((row.total_sales || 0) + (row.total_tax || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-05: Inventory & Valuation */}
            {activeReport === 'R-05' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">كود المنتج</th>
                      <th className="p-3 font-bold">اسم الصنف</th>
                      <th className="p-3 font-bold">الفئة</th>
                      <th className="p-3 font-bold">سعر الوحدة</th>
                      <th className="p-3 font-bold">الرصيد الفعلي</th>
                      <th className="p-3 font-bold">الحد الأدنى</th>
                      <th className="p-3 font-bold">قيمة المخزون</th>
                      <th className="p-3 font-bold">حالة الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((row: any, i: number) => {
                      const isLow = row.current_stock <= row.min_stock_alert;
                      const val = row.current_stock * row.unit_price;

                      return (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono font-bold text-slate-900">{row.product_code}</td>
                          <td className="p-3 font-bold text-slate-900">{row.product_name}</td>
                          <td className="p-3 text-slate-600">{row.category}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">{formatCurrency(row.unit_price)}</td>
                          <td className="p-3 font-mono font-black text-slate-900">{row.current_stock} {row.unit}</td>
                          <td className="p-3 font-mono text-slate-500">{row.min_stock_alert} {row.unit}</td>
                          <td className="p-3 font-mono font-bold text-emerald-800">
                            {formatCurrency(val)}
                          </td>
                          <td className="p-3">
                            <Badge variant={isLow ? 'rose' : 'emerald'}>
                              {isLow ? 'حرج تحت الحد الأدنى ⚠️' : 'كافٍ ومستقر'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
