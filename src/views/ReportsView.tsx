import React, { useState, useEffect, useMemo } from 'react';
import {
  FileBarChart2,
  Calendar,
  Filter,
  Download,
  Printer,
  Egg,
  ClipboardList,
  DollarSign,
  Warehouse,
  Boxes,
  ArrowRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from '../components/ui/Badge.js';
import { formatCurrency } from '../utils/currency.js';

export const ReportsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const roleCode = user?.roleCode;

  // Exact Academic Report Definitions R-01 to R-05
  const allowedReports = useMemo(() => {
    const allReports = [
      {
        code: 'R-01' as const,
        title: 'تقرير الإنتاج اليومي',
        subtitle: 'Daily Production Report',
        icon: Egg,
        desc: 'متابعة الإنتاج اليومي للبيض واللحوم، ومعدلات النفوق واستهلاك الأعلاف والمياه',
        roles: ['ADMIN', 'PROD_MANAGER', 'ACCOUNTANT']
      },
      {
        code: 'R-02' as const,
        title: 'تقرير الطلبات',
        subtitle: 'Requisitions Report',
        icon: ClipboardList,
        desc: 'حصر وتتبع كافة طلبات الاحتياج (كتاكيت، أعلاف، علاجات، مستلزمات) وحالات اعتمادها',
        roles: ['ADMIN', 'PROD_MANAGER', 'ACCOUNTANT']
      },
      {
        code: 'R-03' as const,
        title: 'تقرير فواتير المبيعات',
        subtitle: 'Sales Invoices Report',
        icon: DollarSign,
        desc: 'فواتير المبيعات الصادرة، والضرائب والخصومات والإيرادات الإجمالية بالريال اليمني',
        roles: ['ADMIN', 'PROD_MANAGER', 'ACCOUNTANT']
      },
      {
        code: 'R-04' as const,
        title: 'تقرير توريد المنتجات للمخازن',
        subtitle: 'Warehouse Supply Receipts Report',
        icon: Warehouse,
        desc: 'حركات التوريد المستودعي، وأسماء الموردين، والكميات المضافة للأرصدة المخزنية',
        roles: ['ADMIN', 'PROD_MANAGER', 'ACCOUNTANT']
      },
      {
        code: 'R-05' as const,
        title: 'تقرير المنتجات',
        subtitle: 'Products & Inventory Valuation Report',
        icon: Boxes,
        desc: 'بيانات المنتجات، أسعار الوحدات، الأرصدة المتوفرة، وتقييم المخزون والحدود الحرجة',
        roles: ['ADMIN', 'PROD_MANAGER', 'ACCOUNTANT']
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
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Sync active report if role changes
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
    setIsPrintPreviewOpen(true);
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) return;
    const rows = reportData.rows;
    const headers = Object.keys(rows[0]).join(',');
    const values = rows.map((r: any) => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + headers + '\n' + values;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeReport}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getReqTypeLabel = (t: string) => {
    switch (t) {
      case 'CHICKS': return 'كتاكيت';
      case 'FEED': return 'أعلاف';
      case 'TREATMENT': return 'علاجات وتحصينات';
      case 'SUPPLY': return 'مستلزمات تشغيلية';
      default: return t;
    }
  };

  const getReqStatusBadge = (s: string) => {
    switch (s) {
      case 'APPROVED':
        return <Badge variant="emerald">معتمد</Badge>;
      case 'REJECTED':
        return <Badge variant="rose">مرفوض</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="amber">قيد المراجعة</Badge>;
      case 'COMPLETED':
        return <Badge variant="slate">مكتمل</Badge>;
      default:
        return <Badge variant="amber">مقدم</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileBarChart2 className="w-6 h-6 text-emerald-700" />
              التقارير التشغيلية المعتمدة (R-01 إلى R-05)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            منظومة التقارير التشغيلية والمالية الخمسة المعتمدة لمتابعة أداء شركة نتش رول جروث
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            تصدير CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            طباعة التقرير
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
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                    isActive ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {rep.code}
                  </span>
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
            التقرير النشط: <span className="text-emerald-800 font-bold">{currentReportConfig.code} - {currentReportConfig.title}</span>
          </div>
        )}
      </div>

      {/* Report Data Presentation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            جاري استخراج وتحليل بيانات التقرير المعتمد...
          </div>
        ) : !reportData || !reportData.rows || reportData.rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد سجلات مطابقة لهذا التقرير
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
                    {reportData.rows.map((row: any, i: number) => (
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

            {/* R-02: Requisitions Report */}
            {activeReport === 'R-02' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">رقم الطلب</th>
                      <th className="p-3 font-bold">نوع الطلب</th>
                      <th className="p-3 font-bold">تاريخ الطلب</th>
                      <th className="p-3 font-bold">مقدم الطلب</th>
                      <th className="p-3 font-bold">الهنجر / المزرعة</th>
                      <th className="p-3 font-bold">الأهمية</th>
                      <th className="p-3 font-bold">الحالة</th>
                      <th className="p-3 font-bold">المراجع</th>
                      <th className="p-3 font-bold">ملاحظات المراجعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono font-bold text-slate-900">{row.request_no}</td>
                        <td className="p-3 font-bold text-slate-800">{getReqTypeLabel(row.req_type)}</td>
                        <td className="p-3 font-mono text-slate-600">{row.request_date}</td>
                        <td className="p-3 text-slate-700">{row.requester_name}</td>
                        <td className="p-3 text-slate-600">{row.house_name || 'عام للمزرعة'}</td>
                        <td className="p-3">
                          <Badge variant={row.urgency === 'HIGH' ? 'rose' : row.urgency === 'MEDIUM' ? 'amber' : 'slate'}>
                            {row.urgency === 'HIGH' ? 'عاجل' : row.urgency === 'MEDIUM' ? 'متوسط' : 'عادي'}
                          </Badge>
                        </td>
                        <td className="p-3">{getReqStatusBadge(row.status)}</td>
                        <td className="p-3 text-slate-700">{row.reviewer_name || '-'}</td>
                        <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">{row.review_notes || row.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-03: Sales Invoices Report */}
            {activeReport === 'R-03' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">رقم الفاتورة</th>
                      <th className="p-3 font-bold">تاريخ الفاتورة</th>
                      <th className="p-3 font-bold">اسم العميل</th>
                      <th className="p-3 font-bold">المجموع الفرعي</th>
                      <th className="p-3 font-bold">الخصم</th>
                      <th className="p-3 font-bold">الضريبة</th>
                      <th className="p-3 font-bold">الإجمالي الصافي</th>
                      <th className="p-3 font-bold">حالة السداد</th>
                      <th className="p-3 font-bold">محرر الفاتورة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono font-bold text-slate-900">{row.invoice_no}</td>
                        <td className="p-3 font-mono text-slate-600">{row.invoice_date}</td>
                        <td className="p-3 font-bold text-slate-900">{row.customer_name}</td>
                        <td className="p-3 font-mono text-slate-700">{formatCurrency(row.subtotal || 0)}</td>
                        <td className="p-3 font-mono text-rose-600">{formatCurrency(row.discount || 0)}</td>
                        <td className="p-3 font-mono text-slate-500">{formatCurrency(row.tax_amount || 0)}</td>
                        <td className="p-3 font-mono font-black text-emerald-800">{formatCurrency(row.total_amount || 0)}</td>
                        <td className="p-3">
                          <Badge variant={row.payment_status === 'PAID' ? 'emerald' : row.payment_status === 'PARTIAL' ? 'amber' : 'rose'}>
                            {row.payment_status === 'PAID' ? 'مدفوع بالكامل' : row.payment_status === 'PARTIAL' ? 'مدفوع جزئياً' : 'آجل / غير مدفوع'}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-600">{row.created_by_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-04: Warehouse Supply Receipts */}
            {activeReport === 'R-04' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                    <tr>
                      <th className="p-3 font-bold">رقم سند التوريد</th>
                      <th className="p-3 font-bold">تاريخ التوريد</th>
                      <th className="p-3 font-bold">المستودع المستلم</th>
                      <th className="p-3 font-bold">اسم المنتج / الصنف</th>
                      <th className="p-3 font-bold">الكمية الموردة</th>
                      <th className="p-3 font-bold">اسم المورد</th>
                      <th className="p-3 font-bold">رقم التشغيلة</th>
                      <th className="p-3 font-bold">المستلم المسؤول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono font-bold text-slate-900">{row.receipt_no}</td>
                        <td className="p-3 font-mono text-slate-600">{row.receipt_date}</td>
                        <td className="p-3 font-semibold text-slate-800">{row.warehouse_name}</td>
                        <td className="p-3 font-bold text-emerald-800">{row.product_name}</td>
                        <td className="p-3 font-mono font-black text-slate-900">{row.quantity} {row.unit}</td>
                        <td className="p-3 text-slate-800 font-semibold">{row.supplier_name}</td>
                        <td className="p-3 font-mono text-slate-500">{row.batch_number || '-'}</td>
                        <td className="p-3 text-slate-600">{row.receiver_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* R-05: Products & Inventory Valuation */}
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
                    {reportData.rows.map((row: any, i: number) => {
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

      {/* ========================================================================= */}
      {/* STANDALONE PRINT VIEW & EXCLUSIVE PRINTABLE DOCUMENT (Point 6 Compliance) */}
      {/* ========================================================================= */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6" dir="rtl">
          {/* Top Floating Control Bar (Hidden on print) */}
          <div className="no-print w-full max-w-4xl bg-white rounded-xl shadow-lg border border-slate-200 p-3 mb-4 flex items-center justify-between sticky top-2 z-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">
                معاينة التقرير المستقل للطباعة — {currentReportConfig?.code}: {currentReportConfig?.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>تنفيذ أمر الطباعة (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(false)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>

          {/* Standalone Printable Document (Printed exclusively, contains NO navbar, NO sidebar, NO app controls) */}
          <div
            id="printable-report-document"
            className="printable-report-wrapper w-full max-w-4xl bg-white text-black p-8 sm:p-12 shadow-2xl rounded-sm border border-slate-300 font-sans"
          >
            {/* Document Official Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-lg font-black text-slate-900">شركة نتش رول جروث للإنتاج والتشغيل الداجني</h1>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">الجمهورية اليمنية — الإدارة العامة وقسم الإنتاج</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">NATURAL GROWTH POULTRY & EGG PRODUCTION CO.</p>
                </div>
                <div className="text-left font-mono text-xs">
                  <div className="font-bold text-slate-900">كود الوثيقة: {activeReport}</div>
                  <div className="text-slate-600">تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}</div>
                  <div className="text-slate-500 text-[10px]">الوقت: {new Date().toLocaleTimeString('ar-YE')}</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-center">
                <h2 className="text-base font-black tracking-wide text-slate-900">
                  {currentReportConfig?.title} ({currentReportConfig?.code})
                </h2>
                <div className="mt-1 flex justify-center items-center gap-4 text-xs text-slate-700">
                  <span>
                    <strong>الفترة الزمنية:</strong> {startDate || 'كافة السجلات السابقة'} إلى {endDate || 'تاريخ اليوم'}
                  </span>
                  <span>|</span>
                  <span>
                    <strong>المستخدم المستخرج:</strong> {user?.fullName} ({user?.roleNameAr})
                  </span>
                </div>
              </div>
            </div>

            {/* Executive Summary Box (الإجماليات) */}
            {reportData?.summary && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-300 rounded text-xs">
                <h3 className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">ملخص الإجماليات والمؤشرات الرئيسية</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {activeReport === 'R-01' && (
                    <>
                      <div>إجمالي الإنتاج: <strong className="text-emerald-900 font-bold">{reportData.summary.totalProduction}</strong></div>
                      <div>إجمالي النفوق: <strong className="text-rose-900 font-bold">{reportData.summary.totalMortality} طائر</strong></div>
                      <div>استهلاك الأعلاف: <strong>{reportData.summary.totalFeedConsumedKg} كجم</strong></div>
                      <div>استهلاك المياه: <strong>{reportData.summary.totalWaterLiters} لتر</strong></div>
                    </>
                  )}
                  {activeReport === 'R-02' && (
                    <>
                      <div>إجمالي الطلبات: <strong>{reportData.summary.totalRequisitions}</strong></div>
                      <div>الطلبات المعتمدة: <strong className="text-emerald-900">{reportData.summary.approvedCount}</strong></div>
                      <div>قيد المراجعة: <strong className="text-amber-900">{reportData.summary.underReviewCount}</strong></div>
                      <div>المرفوضة: <strong className="text-rose-900">{reportData.summary.rejectedCount}</strong></div>
                    </>
                  )}
                  {activeReport === 'R-03' && (
                    <>
                      <div>إجمالي الفواتير: <strong>{reportData.summary.totalInvoices}</strong></div>
                      <div>المجموع الفرعي: <strong>{formatCurrency(reportData.summary.totalGrossAmount || 0)}</strong></div>
                      <div>إجمالي الخصومات: <strong>{formatCurrency(reportData.summary.totalDiscounts || 0)}</strong></div>
                      <div>صافي الإيرادات: <strong className="text-emerald-900 font-bold">{formatCurrency(reportData.summary.totalNetAmount || 0)}</strong></div>
                    </>
                  )}
                  {activeReport === 'R-04' && (
                    <>
                      <div>إجمالي سندات التوريد: <strong>{reportData.summary.totalReceipts} سند</strong></div>
                      <div>إجمالي الكميات الموردة: <strong className="text-emerald-900 font-bold">{reportData.summary.totalQuantitySupplied}</strong></div>
                    </>
                  )}
                  {activeReport === 'R-05' && (
                    <>
                      <div>إجمالي المنتجات: <strong>{reportData.summary.totalProductsCount} صنف</strong></div>
                      <div>تقييم المخزون الإجمالي: <strong className="text-emerald-900 font-bold">{formatCurrency(reportData.summary.totalValuation || 0)}</strong></div>
                      <div>أصناف تحت الحد الحرج: <strong className="text-rose-900">{reportData.summary.lowStockItemsCount} صنف</strong></div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Standalone Data Table */}
            <div className="mb-8">
              <table className="w-full text-right text-xs border border-slate-400">
                <thead>
                  {activeReport === 'R-01' && (
                    <tr className="bg-slate-100 border-b border-slate-400">
                      <th className="p-2 border border-slate-300">التاريخ</th>
                      <th className="p-2 border border-slate-300">الهنجر / المزرعة</th>
                      <th className="p-2 border border-slate-300">القطيع</th>
                      <th className="p-2 border border-slate-300">الإنتاج اليومي</th>
                      <th className="p-2 border border-slate-300">النفوق</th>
                      <th className="p-2 border border-slate-300">العلف (كجم)</th>
                      <th className="p-2 border border-slate-300">المشرف المسؤول</th>
                    </tr>
                  )}
                  {activeReport === 'R-02' && (
                    <tr className="bg-slate-100 border-b border-slate-400">
                      <th className="p-2 border border-slate-300">رقم الطلب</th>
                      <th className="p-2 border border-slate-300">نوع الطلب</th>
                      <th className="p-2 border border-slate-300">تاريخ الطلب</th>
                      <th className="p-2 border border-slate-300">مقدم الطلب</th>
                      <th className="p-2 border border-slate-300">الهنجر</th>
                      <th className="p-2 border border-slate-300">الحالة</th>
                      <th className="p-2 border border-slate-300">المراجع</th>
                    </tr>
                  )}
                  {activeReport === 'R-03' && (
                    <tr className="bg-slate-100 border-b border-slate-400">
                      <th className="p-2 border border-slate-300">رقم الفاتورة</th>
                      <th className="p-2 border border-slate-300">التاريخ</th>
                      <th className="p-2 border border-slate-300">العميل</th>
                      <th className="p-2 border border-slate-300">المجموع</th>
                      <th className="p-2 border border-slate-300">الخصم</th>
                      <th className="p-2 border border-slate-300">الصافي</th>
                      <th className="p-2 border border-slate-300">حالة السداد</th>
                    </tr>
                  )}
                  {activeReport === 'R-04' && (
                    <tr className="bg-slate-100 border-b border-slate-400">
                      <th className="p-2 border border-slate-300">رقم السند</th>
                      <th className="p-2 border border-slate-300">تاريخ التوريد</th>
                      <th className="p-2 border border-slate-300">المستودع</th>
                      <th className="p-2 border border-slate-300">اسم المنتج / الصنف</th>
                      <th className="p-2 border border-slate-300">الكمية</th>
                      <th className="p-2 border border-slate-300">المورد</th>
                      <th className="p-2 border border-slate-300">المستلم المسؤول</th>
                    </tr>
                  )}
                  {activeReport === 'R-05' && (
                    <tr className="bg-slate-100 border-b border-slate-400">
                      <th className="p-2 border border-slate-300">كود الصنف</th>
                      <th className="p-2 border border-slate-300">اسم المنتج</th>
                      <th className="p-2 border border-slate-300">الفئة</th>
                      <th className="p-2 border border-slate-300">سعر الوحدة</th>
                      <th className="p-2 border border-slate-300">الرصيد الفعلي</th>
                      <th className="p-2 border border-slate-300">قيمة المخزون</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {reportData?.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-slate-200">
                      {activeReport === 'R-01' && (
                        <>
                          <td className="p-2 border border-slate-300 font-mono">{row.record_date}</td>
                          <td className="p-2 border border-slate-300">{row.house_name}</td>
                          <td className="p-2 border border-slate-300 font-mono">{row.flock_code}</td>
                          <td className="p-2 border border-slate-300 font-bold">{row.production_quantity} {row.unit}</td>
                          <td className="p-2 border border-slate-300">{row.mortality_count}</td>
                          <td className="p-2 border border-slate-300">{row.feed_consumed_kg}</td>
                          <td className="p-2 border border-slate-300">{row.supervisor_name}</td>
                        </>
                      )}
                      {activeReport === 'R-02' && (
                        <>
                          <td className="p-2 border border-slate-300 font-mono">{row.request_no}</td>
                          <td className="p-2 border border-slate-300">{getReqTypeLabel(row.req_type)}</td>
                          <td className="p-2 border border-slate-300 font-mono">{row.request_date}</td>
                          <td className="p-2 border border-slate-300">{row.requester_name}</td>
                          <td className="p-2 border border-slate-300">{row.house_name || '-'}</td>
                          <td className="p-2 border border-slate-300">{row.status}</td>
                          <td className="p-2 border border-slate-300">{row.reviewer_name || '-'}</td>
                        </>
                      )}
                      {activeReport === 'R-03' && (
                        <>
                          <td className="p-2 border border-slate-300 font-mono">{row.invoice_no}</td>
                          <td className="p-2 border border-slate-300 font-mono">{row.invoice_date}</td>
                          <td className="p-2 border border-slate-300 font-bold">{row.customer_name}</td>
                          <td className="p-2 border border-slate-300 font-mono">{formatCurrency(row.subtotal || 0)}</td>
                          <td className="p-2 border border-slate-300 font-mono">{formatCurrency(row.discount || 0)}</td>
                          <td className="p-2 border border-slate-300 font-mono font-bold">{formatCurrency(row.total_amount || 0)}</td>
                          <td className="p-2 border border-slate-300">{row.payment_status}</td>
                        </>
                      )}
                      {activeReport === 'R-04' && (
                        <>
                          <td className="p-2 border border-slate-300 font-mono">{row.receipt_no}</td>
                          <td className="p-2 border border-slate-300 font-mono">{row.receipt_date}</td>
                          <td className="p-2 border border-slate-300">{row.warehouse_name}</td>
                          <td className="p-2 border border-slate-300 font-bold">{row.product_name}</td>
                          <td className="p-2 border border-slate-300 font-mono font-bold">{row.quantity} {row.unit}</td>
                          <td className="p-2 border border-slate-300">{row.supplier_name}</td>
                          <td className="p-2 border border-slate-300">{row.receiver_name}</td>
                        </>
                      )}
                      {activeReport === 'R-05' && (
                        <>
                          <td className="p-2 border border-slate-300 font-mono">{row.product_code}</td>
                          <td className="p-2 border border-slate-300 font-bold">{row.product_name}</td>
                          <td className="p-2 border border-slate-300">{row.category}</td>
                          <td className="p-2 border border-slate-300 font-mono">{formatCurrency(row.unit_price)}</td>
                          <td className="p-2 border border-slate-300 font-mono font-bold">{row.current_stock} {row.unit}</td>
                          <td className="p-2 border border-slate-300 font-mono">{formatCurrency(row.current_stock * row.unit_price)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official Signatures Section (التوقيعات الرسمية المعتمدة) */}
            <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <p className="font-bold text-slate-800">إعداد التقرير</p>
                <p className="text-slate-600 mt-1">{user?.fullName}</p>
                <div className="mt-8 border-b border-dashed border-slate-400 w-32 mx-auto" />
                <p className="text-[10px] text-slate-400 mt-1">التوقيع</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">مراجعة مدير قسم الإنتاج</p>
                <p className="text-slate-600 mt-1">أحمد صبر</p>
                <div className="mt-8 border-b border-dashed border-slate-400 w-32 mx-auto" />
                <p className="text-[10px] text-slate-400 mt-1">التوقيع والاعتماد</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">الإدارة المالية والختم</p>
                <p className="text-slate-600 mt-1">ماهر نضير</p>
                <div className="mt-8 border-b border-dashed border-slate-400 w-32 mx-auto" />
                <p className="text-[10px] text-slate-400 mt-1">ختم الشركة المعتمد</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
