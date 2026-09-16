import React, { useState, useEffect } from 'react';
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
import { Badge } from '../components/ui/Badge.js';

export const ReportsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [activeReport, setActiveReport] = useState<'R-01' | 'R-02' | 'R-03' | 'R-04' | 'R-05'>('R-01');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

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

  const reportsConfig = [
    { code: 'R-01' as const, title: 'تقرير الإنتاج اليومي', icon: Egg, desc: 'تفاصيل إنتاج البيض واللحوم لكل هنجر وقطيع' },
    { code: 'R-02' as const, title: 'معدل الوفيات والفقد', icon: TrendingDown, desc: 'نسبة النفوق وتحليل المخاطر الحيوية للقطعان' },
    { code: 'R-03' as const, title: 'استهلاك الأعلاف ومعدل التحويل', icon: Wheat, desc: 'كميات الاستهلاك ومؤشر التحويل الغذائي' },
    { code: 'R-04' as const, title: 'المبيعات والإيرادات', icon: DollarSign, desc: 'حجم المبيعات والضريبة المصدرة حسب العملاء' },
    { code: 'R-05' as const, title: 'حركة المخزون والتقييم', icon: Warehouse, desc: 'الأرصدة الحالية، قيمة المخزون والحدود الحرجة' },
  ];

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
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors ml-1"
                title="رجوع"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-xl font-black text-slate-900">
              التقارير الرقابية والتحليلية
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            التقارير التحليلية لمؤشرات الإنتاج، الاستهلاك، حركة المبيعات والمخزون
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Reports Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {reportsConfig.map((r) => {
          const Icon = r.icon;
          const isSel = activeReport === r.code;
          return (
            <button
              key={r.code}
              type="button"
              onClick={() => setActiveReport(r.code)}
              className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                isSel
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-black ${isSel ? 'text-emerald-950' : 'text-slate-800'}`}>
                  {r.code}
                </span>
                <Icon className={`w-4 h-4 ${isSel ? 'text-emerald-700' : 'text-slate-400'}`} />
              </div>
              <p className="text-xs font-bold text-slate-900">{r.title.split('(')[0]}</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight truncate">{r.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Filter Parameters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">الفترة الزمنية للتقرير:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
            placeholder="من تاريخ"
          />
          <span className="text-xs text-slate-400">إلى</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
            placeholder="إلى تاريخ"
          />
          <button
            type="button"
            onClick={() => fetchReport(activeReport)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
          >
            تطبيق التصفية
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          المصدر: قاعدة بيانات الإنتاج المركزية الموحدة (SQLite)
        </div>
      </div>

      {/* REPORT CONTENT BODY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            جاري استعلام ومعالجة بيانات التقرير...
          </div>
        ) : !reportData ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            لا توجد بيانات متاحة لهذا التقرير
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header of the loaded report */}
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {reportData.reportTitle || reportsConfig.find(r => r.code === activeReport)?.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تاريخ وتوقيت الاستخراج: {new Date().toLocaleString('ar-SA')}
                </p>
              </div>
              <Badge variant="emerald">{activeReport}</Badge>
            </div>

            {/* R-01: Daily Production */}
            {activeReport === 'R-01' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-y border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">التاريخ</th>
                      <th className="p-3 font-bold">المزرعة والعنبر</th>
                      <th className="p-3 font-bold">كود القطيع</th>
                      <th className="p-3 font-bold">الإنتاج اليومي</th>
                      <th className="p-3 font-bold">الوفيات</th>
                      <th className="p-3 font-bold">العلف (كجم)</th>
                      <th className="p-3 font-bold">متوسط الوزن (جم)</th>
                      <th className="p-3 font-bold">المشرف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono font-bold text-slate-900">{row.record_date}</td>
                        <td className="p-3 text-slate-700">{row.farm_name} - {row.house_name}</td>
                        <td className="p-3 font-mono font-bold text-emerald-800">{row.flock_code}</td>
                        <td className="p-3 font-mono font-black text-slate-900">{row.production_quantity} {row.unit}</td>
                        <td className="p-3 font-mono font-bold text-rose-600">{row.mortality_count}</td>
                        <td className="p-3 font-mono">{row.feed_consumed_kg}</td>
                        <td className="p-3 font-mono">{row.avg_weight_g}</td>
                        <td className="p-3 text-slate-600">{row.supervisor_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-02: Mortality & Risks */}
            {activeReport === 'R-02' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-y border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">كود القطيع</th>
                      <th className="p-3 font-bold">السلالة</th>
                      <th className="p-3 font-bold">الهنجر والمزرعة</th>
                      <th className="p-3 font-bold">العدد الابتدائي</th>
                      <th className="p-3 font-bold">الحالي الفعلي</th>
                      <th className="p-3 font-bold">إجمالي الوفيات</th>
                      <th className="p-3 font-bold">نسبة النفوق التراكمية (%)</th>
                      <th className="p-3 font-bold">مستوى الخطورة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((row: any, i: number) => {
                      const rate = row.mortality_rate_pct || 0;
                      const isHigh = rate > 5.0;

                      return (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono font-bold text-slate-900">{row.flock_code}</td>
                          <td className="p-3 font-semibold text-slate-700">{row.breed}</td>
                          <td className="p-3 text-slate-600">{row.house_name} ({row.farm_name})</td>
                          <td className="p-3 font-mono">{row.initial_count}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{row.current_count}</td>
                          <td className="p-3 font-mono font-bold text-rose-600">{row.total_mortality}</td>
                          <td className="p-3 font-mono font-black text-slate-900">{rate.toFixed(2)}%</td>
                          <td className="p-3">
                            <Badge variant={isHigh ? 'rose' : 'emerald'}>
                              {isHigh ? 'تجاوز حد الخطر ⚠️' : 'طبيعي ومقبول'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-03: Feed & FCR */}
            {activeReport === 'R-03' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-y border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">كود القطيع</th>
                      <th className="p-3 font-bold">الهنجر</th>
                      <th className="p-3 font-bold">إجمالي العلف المستهلك (كجم)</th>
                      <th className="p-3 font-bold">إجمالي الإنتاج</th>
                      <th className="p-3 font-bold">متوسط الاستهلاك اليومي</th>
                      <th className="p-3 font-bold">معدل التحويل التقديري (FCR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono font-bold text-slate-900">{row.flock_code}</td>
                        <td className="p-3 text-slate-700">{row.house_name}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{row.total_feed_kg?.toLocaleString()}</td>
                        <td className="p-3 font-mono font-bold text-emerald-800">{row.total_production?.toLocaleString()}</td>
                        <td className="p-3 font-mono">{row.avg_daily_feed_kg?.toFixed(1)} كجم/يوم</td>
                        <td className="p-3 font-mono font-black text-slate-900">{row.fcr || '1.65'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-04: Sales & Revenue */}
            {activeReport === 'R-04' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-y border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">اسم العميل</th>
                      <th className="p-3 font-bold">نوع العميل</th>
                      <th className="p-3 font-bold">عدد الفواتير</th>
                      <th className="p-3 font-bold">إجمالي المبيعات</th>
                      <th className="p-3 font-bold">ضريبة القيمة المضافة 15%</th>
                      <th className="p-3 font-bold">الصافي المسدد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-3 font-bold text-slate-900">{row.customer_name}</td>
                        <td className="p-3 text-slate-600">{row.customer_type}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{row.invoices_count}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {row.total_sales?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {row.total_tax?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س
                        </td>
                        <td className="p-3 font-mono font-black text-emerald-800">
                          {(row.total_sales + row.total_tax)?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س
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
                  <thead className="bg-slate-50 text-slate-700 border-y border-slate-100">
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
                          <td className="p-3 font-mono">{row.unit_price?.toFixed(2)} ر.س</td>
                          <td className="p-3 font-mono font-black text-slate-900">{row.current_stock} {row.unit}</td>
                          <td className="p-3 font-mono text-slate-500">{row.min_stock_alert} {row.unit}</td>
                          <td className="p-3 font-mono font-bold text-emerald-800">
                            {val.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س
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
