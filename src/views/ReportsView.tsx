import React, { useState, useEffect, useMemo } from 'react';
import {
  FileBarChart,
  Printer,
  Filter,
  Egg,
  ClipboardList,
  ShoppingCart,
  Warehouse,
  Scale,
  Building2,
  ShieldCheck,
  Search,
  X,
  FileDown,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  CalendarRange
} from 'lucide-react';
import { api } from '../api.js';
import { Badge } from '../components/ui/Badge.js';
import { DateInput } from '../components/ui/DateInput.js';
import { formatCurrency } from '../utils/currency.js';
import { matchesInstantSearch } from '../utils/search.js';
import { exportReportToPdf } from '../utils/pdfExport.js';
import {
  getLocalTodayDateString,
  getLocalDateDaysAgo,
  getLocalFirstDayOfMonth,
  formatArabicDateDisplay
} from '../utils/date.js';
import { useAuth } from '../context/AuthContext.js';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<'R-01' | 'R-02' | 'R-03' | 'R-04' | 'R-05'>('R-01');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startDateValid, setStartDateValid] = useState(true);
  const [endDateValid, setEndDateValid] = useState(true);
  const [startDateFieldError, setStartDateFieldError] = useState<string | null>(null);
  const [endDateFieldError, setEndDateFieldError] = useState<string | null>(null);
  const [appliedDates, setAppliedDates] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [dateFilterError, setDateFilterError] = useState<string | null>(null);
  const [reportSearchKw, setReportSearchKw] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [mobileDisplayMode, setMobileDisplayMode] = useState<'cards' | 'table'>('cards');

  const fetchReport = async (customRange?: { start: string; end: string }) => {
    const effectiveStart = customRange !== undefined ? customRange.start : startDate;
    const effectiveEnd = customRange !== undefined ? customRange.end : endDate;

    if (customRange === undefined) {
      if (!startDateValid) {
        setDateFilterError(
          startDateFieldError || 'حقل «من تاريخ» غير مكتمل أو غير صالح. يرجى التحقق من اليوم والشهر والسنة.'
        );
        return;
      }
      if (!endDateValid) {
        setDateFilterError(
          endDateFieldError || 'حقل «إلى تاريخ» غير مكتمل أو غير صالح. يرجى التحقق من اليوم والشهر والسنة.'
        );
        return;
      }
    }

    if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
      setDateFilterError('تاريخ البداية «من تاريخ» لا يمكن أن يكون بعد تاريخ النهاية «إلى تاريخ».');
      return;
    }

    setDateFilterError(null);
    setAppliedDates({ start: effectiveStart, end: effectiveEnd });

    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      if (effectiveStart) filters.startDate = effectiveStart;
      if (effectiveEnd) filters.endDate = effectiveEnd;

      let res;
      if (activeReport === 'R-01') {
        res = await api.getDailyProductionReport(filters);
      } else if (activeReport === 'R-02') {
        res = await api.getRequisitionsStatusReport(filters);
      } else if (activeReport === 'R-03') {
        res = await api.getSalesSummaryReport(filters);
      } else if (activeReport === 'R-04') {
        res = await api.getWarehouseMovementReport(filters);
      } else {
        res = await api.getInventoryFinancialReport(filters);
      }
      setReportData(res);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDates = () => {
    setStartDate('');
    setEndDate('');
    setStartDateValid(true);
    setEndDateValid(true);
    setStartDateFieldError(null);
    setEndDateFieldError(null);
    setDateFilterError(null);
    fetchReport({ start: '', end: '' });
  };

  const handleApplyQuickPreset = (preset: 'today' | '7days' | 'month' | 'all') => {
    setDateFilterError(null);
    setStartDateValid(true);
    setEndDateValid(true);
    setStartDateFieldError(null);
    setEndDateFieldError(null);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      fetchReport({ start: '', end: '' });
      return;
    }

    const today = getLocalTodayDateString();
    let start = today;
    if (preset === '7days') {
      start = getLocalDateDaysAgo(6);
    } else if (preset === 'month') {
      start = getLocalFirstDayOfMonth();
    }
    setStartDate(start);
    setEndDate(today);
    fetchReport({ start, end: today });
  };

  useEffect(() => {
    fetchReport(appliedDates);
  }, [activeReport]);

  const handlePrint = () => {
    window.print();
  };

  const reportTabs = [
    {
      code: 'R-01' as const,
      title: 'تقرير الإنتاج اليومي',
      shortTitle: 'الإنتاج اليومي',
      subtitle: 'الإنتاج، النفوق، الفرز والعلف',
      icon: Egg
    },
    {
      code: 'R-02' as const,
      title: 'تقرير حالة الطلبات',
      shortTitle: 'حالة الطلبات',
      subtitle: 'مسار الطلبات والاعتماد',
      icon: ClipboardList
    },
    {
      code: 'R-03' as const,
      title: 'ملخص المبيعات والفواتير',
      shortTitle: 'ملخص المبيعات',
      subtitle: 'المبيعات، الضرائب، والتحصيل',
      icon: ShoppingCart
    },
    {
      code: 'R-04' as const,
      title: 'تقرير حركة المخازن',
      shortTitle: 'حركة المخازن',
      subtitle: 'سندات التوريد والأرصدة',
      icon: Warehouse
    },
    {
      code: 'R-05' as const,
      title: 'التقرير المالي والمخزني',
      shortTitle: 'المالي والمخزني',
      subtitle: 'الإيرادات وتقييم المخزون',
      icon: Scale
    }
  ];

  const currentTabInfo = reportTabs.find((t) => t.code === activeReport) || reportTabs[0];

  const statusLabels: Record<string, string> = {
    DRAFT: 'مسودة',
    SUBMITTED: 'مُقدّم',
    UNDER_REVIEW: 'قيد المراجعة',
    APPROVED: 'معتمد',
    REJECTED: 'مرفوض',
    COMPLETED: 'مكتمل',
    PAID: 'مسددة بالكامل',
    PENDING: 'معلقة (غير مسددة)',
    PARTIAL: 'سداد جزئي'
  };

  const reqTypeLabels: Record<string, string> = {
    FEED: 'أعلاف وتغذية',
    MEDICINE: 'أدوية ولقاحات بيطرية',
    SUPPLIES: 'مستلزمات تشغيل',
    MAINTENANCE: 'قطع غيار وصيانة'
  };

  // Filtered rows for active report based on instant search keyword
  const filteredR01Records = useMemo(() => {
    const list = reportData?.records || [];
    if (!reportSearchKw.trim()) return list;
    return list.filter((r: any) =>
      matchesInstantSearch(reportSearchKw, [
        r.record_date,
        r.house_name,
        r.flock_code,
        r.flock_name,
        r.recorded_by_name,
        r.prod_Egg_Trays,
        r.mortality_count
      ])
    );
  }, [reportData, reportSearchKw]);

  const filteredR02Requisitions = useMemo(() => {
    const list = reportData?.requisitions || [];
    if (!reportSearchKw.trim()) return list;
    return list.filter((req: any) =>
      matchesInstantSearch(reportSearchKw, [
        req.request_no,
        req.req_type,
        reqTypeLabels[req.req_type],
        req.house_name,
        req.requester_name,
        req.reviewer_name,
        req.request_date,
        req.status,
        statusLabels[req.status]
      ])
    );
  }, [reportData, reportSearchKw]);

  const filteredR03Invoices = useMemo(() => {
    const list = reportData?.invoices || [];
    if (!reportSearchKw.trim()) return list;
    return list.filter((inv: any) =>
      matchesInstantSearch(reportSearchKw, [
        inv.invoice_no,
        inv.customer_name,
        inv.customer_code,
        inv.invoice_date,
        inv.payment_status,
        statusLabels[inv.payment_status],
        inv.total_amount
      ])
    );
  }, [reportData, reportSearchKw]);

  const filteredR04Receipts = useMemo(() => {
    const list = reportData?.receipts || [];
    if (!reportSearchKw.trim()) return list;
    return list.filter((rcp: any) =>
      matchesInstantSearch(reportSearchKw, [
        rcp.receipt_no,
        rcp.warehouse_name,
        rcp.product_name,
        rcp.product_code,
        rcp.supplier_name,
        rcp.batch_no,
        rcp.receipt_date,
        rcp.received_by_name
      ])
    );
  }, [reportData, reportSearchKw]);

  const filteredR05Products = useMemo(() => {
    const list = reportData?.productsValuation || [];
    if (!reportSearchKw.trim()) return list;
    return list.filter((p: any) =>
      matchesInstantSearch(reportSearchKw, [
        p.product_code,
        p.product_name,
        p.category,
        p.unit,
        p.current_stock <= 0 ? 'نفد المخزون' : p.current_stock <= p.min_stock_alert ? 'مخزون منخفض' : 'رصيد آمن'
      ])
    );
  }, [reportData, reportSearchKw]);

  const handleExportReportPdf = async () => {
    if (!reportData) return;
    try {
      setExportingPdf(true);
      const periodText = `${appliedDates.start || 'من البداية'} إلى ${appliedDates.end || 'حتى الآن'}${
        reportSearchKw.trim() ? ` — بحث: "${reportSearchKw.trim()}"` : ''
      }`;
      const exporterName = user?.fullName || 'مستخدم النظام';

      if (activeReport === 'R-01') {
        const s = reportData.summary || {};
        await exportReportToPdf({
          reportCode: 'R-01',
          reportTitle: currentTabInfo.title,
          reportSubtitle: currentTabInfo.subtitle,
          periodLabel: periodText,
          exportedBy: exporterName,
          summaryCards: [
            { label: 'إجمالي أطباق البيض', value: `${(s.totalEggTrays || 0).toLocaleString('ar-EG')} طبق` },
            { label: 'الأطباق السليمة الصافية', value: `${(s.totalNetTrays || 0).toLocaleString('ar-EG')} طبق` },
            { label: 'إجمالي النفوق المسجل', value: `${(s.totalMortality || 0).toLocaleString('ar-EG')} طير` },
            { label: 'إجمالي استهلاك الأعلاف', value: `${(s.totalFeedKg || 0).toLocaleString('ar-EG')} كجم` }
          ],
          headers: ['التاريخ', 'الهنجر', 'القطيع', 'إجمالي البيض (طبق)', 'الكسر', 'الفرز', 'الصافي السليم', 'النفوق', 'العلف (كجم)', 'المشرف'],
          rows: filteredR01Records.map((r: any) => [
            r.record_date,
            r.house_name,
            r.flock_code,
            r.prod_Egg_Trays,
            r.damaged_eggs,
            r.cull_eggs,
            r.net_trays,
            r.mortality_count,
            r.feed_consumed_kg,
            r.recorded_by_name
          ]),
          filename: `Report-R01-Daily-Production-${getLocalTodayDateString()}.pdf`
        });
      } else if (activeReport === 'R-02') {
        const s = reportData.summary || {};
        await exportReportToPdf({
          reportCode: 'R-02',
          reportTitle: currentTabInfo.title,
          reportSubtitle: currentTabInfo.subtitle,
          periodLabel: periodText,
          exportedBy: exporterName,
          summaryCards: [
            { label: 'إجمالي الطلبات', value: `${s.totalRequests || 0} طلب` },
            { label: 'قيد المراجعة والانتظار', value: `${(s.submitted || 0) + (s.underReview || 0)} طلب` },
            { label: 'معتمدة ومكتملة', value: `${(s.approved || 0) + (s.completed || 0)} طلب` },
            { label: 'مرفوضة', value: `${s.rejected || 0} طلب` }
          ],
          headers: ['رقم الطلب', 'التصنيف', 'الهنجر', 'مقدم الطلب', 'المراجع / المعتمد', 'عدد البنود', 'تاريخ الطلب', 'الحالة'],
          rows: filteredR02Requisitions.map((req: any) => [
            req.request_no,
            reqTypeLabels[req.req_type] || req.req_type,
            req.house_name || 'عام للمزرعة',
            req.requester_name,
            req.reviewer_name || '—',
            `${req.items_count} صنف`,
            req.request_date,
            statusLabels[req.status] || req.status
          ]),
          filename: `Report-R02-Requisitions-${getLocalTodayDateString()}.pdf`
        });
      } else if (activeReport === 'R-03') {
        const s = reportData.summary || {};
        await exportReportToPdf({
          reportCode: 'R-03',
          reportTitle: currentTabInfo.title,
          reportSubtitle: currentTabInfo.subtitle,
          periodLabel: periodText,
          exportedBy: exporterName,
          summaryCards: [
            { label: 'إجمالي الفواتير', value: `${s.totalInvoices || 0} فاتورة` },
            { label: 'صافي المبيعات', value: formatCurrency(s.totalSubtotal || 0) },
            { label: 'إجمالي الضرائب', value: formatCurrency(s.totalTax || 0) },
            { label: 'الإجمالي العام (YER)', value: formatCurrency(s.grandTotalRevenue || 0) }
          ],
          headers: ['رقم الفاتورة', 'العميل', 'التاريخ', 'المجموع الفرعي', 'الضريبة', 'الإجمالي النهائي (YER)', 'حالة السداد'],
          rows: filteredR03Invoices.map((inv: any) => [
            inv.invoice_no,
            inv.customer_name,
            inv.invoice_date,
            formatCurrency(inv.subtotal),
            formatCurrency(inv.tax_amount),
            formatCurrency(inv.total_amount),
            statusLabels[inv.payment_status] || inv.payment_status
          ]),
          filename: `Report-R03-Sales-Summary-${getLocalTodayDateString()}.pdf`
        });
      } else if (activeReport === 'R-04') {
        const s = reportData.summary || {};
        await exportReportToPdf({
          reportCode: 'R-04',
          reportTitle: currentTabInfo.title,
          reportSubtitle: currentTabInfo.subtitle,
          periodLabel: periodText,
          exportedBy: exporterName,
          summaryCards: [
            { label: 'سندات التوريد', value: `${s.totalReceipts || 0} سند` },
            { label: 'إجمالي الكميات الموردة', value: `${(s.totalSuppliedQuantity || 0).toLocaleString('ar-EG')} وحدة` },
            { label: 'الأصناف النشطة', value: `${reportData.currentStockLevels?.length || 0} صنف` },
            { label: 'أصناف منخفضة الرصيد', value: `${s.lowStockItemsCount || 0} صنف` }
          ],
          headers: ['رقم السند', 'المستودع', 'الصنف المورد', 'الكمية الموردة', 'المورد / الدفعة', 'تاريخ التوريد', 'المستلم'],
          rows: filteredR04Receipts.map((rcp: any) => [
            rcp.receipt_no,
            rcp.warehouse_name,
            rcp.product_name,
            `+${rcp.quantity} ${rcp.unit}`,
            `${rcp.supplier_name} (${rcp.batch_no || '—'})`,
            rcp.receipt_date,
            rcp.received_by_name
          ]),
          filename: `Report-R04-Warehouse-Movement-${getLocalTodayDateString()}.pdf`
        });
      } else if (activeReport === 'R-05') {
        const s = reportData.summary || {};
        await exportReportToPdf({
          reportCode: 'R-05',
          reportTitle: currentTabInfo.title,
          reportSubtitle: currentTabInfo.subtitle,
          periodLabel: periodText,
          exportedBy: exporterName,
          summaryCards: [
            { label: 'القيمة التقديرية للمخزون', value: formatCurrency(s.totalInventoryValuation || 0) },
            { label: 'إجمالي المبيعات المعتمدة', value: formatCurrency(s.totalRevenue || 0) },
            { label: 'المبالغ المحصلة (PAID)', value: formatCurrency(s.paidRevenue || 0) },
            { label: 'ذمم قيد التحصيل (PENDING)', value: formatCurrency(s.pendingReceivables || 0) }
          ],
          headers: ['كود الصنف', 'اسم الصنف', 'الفئة', 'الرصيد الحالي', 'سعر الوحدة (YER)', 'القيمة الإجمالية (YER)', 'الحالة'],
          rows: filteredR05Products.map((p: any) => [
            p.product_code,
            p.product_name,
            p.category,
            `${p.current_stock} ${p.unit}`,
            formatCurrency(p.unit_price),
            formatCurrency(p.stock_valuation),
            p.current_stock <= 0 ? 'نفد المخزون' : p.current_stock <= p.min_stock_alert ? 'تحت الحد الأدنى' : 'رصيد آمن'
          ]),
          filename: `Report-R05-Financial-Inventory-${getLocalTodayDateString()}.pdf`
        });
      }
    } catch (err) {
      console.error('Failed to export report PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div id="reports-view" className="space-y-5" dir="rtl">
      {/* Screen Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>منظومة التقارير التشغيلية والمالية المعتمدة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            استخراج وطباعة التقارير الرسمية شاملة الترويسة المعتمدة لشركة نتش رول جروث والتوقيعات
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-export-report-pdf"
            type="button"
            disabled={loading || exportingPdf || !reportData}
            onClick={handleExportReportPdf}
            className="flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm min-h-[42px]"
          >
            <FileDown className="w-4 h-4 shrink-0" />
            <span>{exportingPdf ? 'جاري التصدير...' : 'تصدير PDF'}</span>
          </button>

          <button
            id="btn-print-report"
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm min-h-[42px]"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs — Compact 2-column grid on mobile, 5-column on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 no-print">
        {reportTabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isSelected = activeReport === tab.code;
          const isLastOdd = idx === reportTabs.length - 1;
          return (
            <button
              key={tab.code}
              id={`tab-report-${tab.code}`}
              type="button"
              onClick={() => setActiveReport(tab.code)}
              className={`p-3 sm:p-3.5 rounded-xl border text-right transition-all flex items-start gap-2.5 min-h-[60px] ${
                isLastOdd ? 'col-span-2 sm:col-span-1' : ''
              } ${
                isSelected
                  ? 'bg-emerald-900 text-white border-emerald-900 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className={`text-[10px] font-mono block ${
                    isSelected ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {tab.code}
                </span>
                <h3 className="text-xs font-bold leading-snug mt-0.5 truncate">
                  <span className="sm:hidden">{tab.shortTitle}</span>
                  <span className="hidden sm:inline">{tab.title}</span>
                </h3>
                <p
                  className={`text-[10px] mt-0.5 truncate hidden sm:block ${
                    isSelected ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {tab.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar (Custom RTL-Safe Date Inputs + Presets + Search) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs no-print">
        {/* Top Row: Filter Title + Quick Date Range Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <CalendarRange className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>تحديد الفترة الزمنية للتقرير:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium ml-1">فترات سريعة:</span>
            <button
              type="button"
              onClick={() => handleApplyQuickPreset('all')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                !appliedDates.start && !appliedDates.end
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              كل الفترات
            </button>
            <button
              type="button"
              onClick={() => handleApplyQuickPreset('today')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 transition-colors"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => handleApplyQuickPreset('7days')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 transition-colors"
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={() => handleApplyQuickPreset('month')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 transition-colors"
            >
              هذا الشهر
            </button>
          </div>
        </div>

        {/* Middle Row: Custom DateInput Fields («من تاريخ» and «إلى تاريخ») + Apply/Reset Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-1 lg:col-span-4">
            <DateInput
              id="report-start-date"
              label="من تاريخ"
              value={startDate}
              emptyHelperText="من البداية"
              onChange={(val) => {
                setStartDate(val);
                if (dateFilterError) setDateFilterError(null);
              }}
              onValidityChange={(isValid, err) => {
                setStartDateValid(isValid);
                setStartDateFieldError(err);
              }}
            />
          </div>

          <div className="sm:col-span-1 lg:col-span-4">
            <DateInput
              id="report-end-date"
              label="إلى تاريخ"
              value={endDate}
              emptyHelperText="حتى الآن"
              onChange={(val) => {
                setEndDate(val);
                if (dateFilterError) setDateFilterError(null);
              }}
              onValidityChange={(isValid, err) => {
                setEndDateValid(isValid);
                setEndDateFieldError(err);
              }}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
            <button
              id="btn-apply-report-filter"
              type="button"
              onClick={() => fetchReport()}
              className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-xl font-bold transition-colors shadow-2xs min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <Filter className="w-4 h-4 shrink-0" />
              <span>تطبيق الفلترة</span>
            </button>
            {(startDate || endDate || appliedDates.start || appliedDates.end) && (
              <button
                id="btn-reset-report-filter"
                type="button"
                onClick={handleResetDates}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors min-h-[44px] shrink-0"
              >
                إعادة ضبط
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Instant Search Input + Mobile View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-reports"
              type="text"
              value={reportSearchKw}
              onChange={(e) => setReportSearchKw(e.target.value)}
              placeholder="بحث فوري داخل بيانات التقرير المعروض (رقم مرجعي، اسم، حالة، تاريخ)..."
              className="w-full pr-9 pl-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 bg-slate-50/60 focus:bg-white text-xs"
            />
            {reportSearchKw && (
              <button
                type="button"
                onClick={() => setReportSearchKw('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Mobile Display Mode Toggle (Cards vs Table) */}
            <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMobileDisplayMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  mobileDisplayMode === 'cards'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>بطاقات</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileDisplayMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  mobileDisplayMode === 'table'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>جدول</span>
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-slate-400 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>تجهيز تلقائي للطباعة وتصدير PDF بمقاس A4</span>
            </div>
          </div>
        </div>

        {/* Date Validation Error Alert */}
        {dateFilterError && (
          <div
            id="report-date-filter-error"
            role="alert"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{dateFilterError}</span>
          </div>
        )}
      </div>

      {/* Printable Official Report Sheet */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200 no-print">
          جاري تجميع واستخراج بيانات التقرير المعتمد...
        </div>
      ) : (
        <div
          id="printable-report-sheet"
          className="printable-report-wrapper bg-white p-4 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6"
        >
          {/* Official Corporate Letterhead Header */}
          <div className="border-b-2 border-slate-800 pb-4 sm:pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-black text-lg shrink-0">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  شركة نتش رول جروث للإنتاج الداجني والزراعي
                </h2>
                <p className="text-[11px] sm:text-xs font-semibold text-emerald-800 mt-0.5">
                  إدارة قسم الإنتاج والعمليات الميدانية — الجمهورية اليمنية
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  العملة الرسمية المعتمدة: الريال اليمني (YER)
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 sm:min-w-[230px]">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">كود التقرير:</span>
                <span className="font-mono font-bold text-slate-900">{activeReport}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">تاريخ الإصدار:</span>
                <span className="font-mono text-slate-800" dir="ltr">
                  {getLocalTodayDateString()}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">نطاق التقرير:</span>
                <span className="font-semibold text-slate-800">
                  {appliedDates.start ? formatArabicDateDisplay(appliedDates.start) : 'من البداية'}{' '}
                  ← {appliedDates.end ? formatArabicDateDisplay(appliedDates.end) : 'حتى الآن'}
                </span>
              </div>
            </div>
          </div>

          {/* Report Title Banner */}
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold">{currentTabInfo.title}</h3>
              <p className="text-[11px] text-slate-300 mt-0.5">{currentTabInfo.subtitle}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-mono font-bold self-start sm:self-auto">
              معتمد للطباعة الرسمية
            </span>
          </div>

          {/* ============================================================== */}
          {/* R-01: Daily Production Report */}
          {/* ============================================================== */}
          {activeReport === 'R-01' && reportData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">إجمالي أطباق البيض</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">
                    {reportData.summary?.totalEggTrays?.toLocaleString('ar-EG') || 0} طبق
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block">الأطباق السليمة الصافية</span>
                  <span className="text-base sm:text-lg font-black text-emerald-900 mt-1 block">
                    {reportData.summary?.totalNetTrays?.toLocaleString('ar-EG') || 0} طبق
                  </span>
                </div>
                <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200">
                  <span className="text-rose-800 block">إجمالي النفوق المسجل</span>
                  <span className="text-base sm:text-lg font-black text-rose-900 mt-1 block">
                    {reportData.summary?.totalMortality?.toLocaleString('ar-EG') || 0} طير
                  </span>
                </div>
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200">
                  <span className="text-amber-800 block">إجمالي استهلاك الأعلاف</span>
                  <span className="text-base sm:text-lg font-black text-amber-900 mt-1 block">
                    {reportData.summary?.totalFeedKg?.toLocaleString('ar-EG') || 0} كجم
                  </span>
                </div>
              </div>

              {/* Mobile Cards for R-01 */}
              <div className={`${mobileDisplayMode === 'cards' ? 'block md:hidden' : 'hidden'} space-y-3 no-print`}>
                {filteredR01Records.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                    لا توجد سجلات إنتاج مطابقة للفترة أو البحث
                  </div>
                ) : (
                  filteredR01Records.map((r: any) => (
                    <div
                      key={r.id}
                      className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{r.house_name}</span>
                          <span className="mr-2 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-bold">
                            {r.flock_code}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" dir="ltr">
                          {r.record_date}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 block">إجمالي البيض</span>
                          <span className="font-mono font-bold text-slate-900">{r.prod_Egg_Trays} طبق</span>
                        </div>
                        <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/70">
                          <span className="text-[10px] text-emerald-700 block">الصافي السليم</span>
                          <span className="font-mono font-bold text-emerald-800">{r.net_trays} طبق</span>
                        </div>
                        <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-200/70">
                          <span className="text-[10px] text-rose-700 block">النفوق</span>
                          <span className="font-mono font-bold text-rose-700">{r.mortality_count} طير</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
                        <span>الكسر: <strong className="font-mono text-rose-600">{r.damaged_eggs}</strong> • الفرز: <strong className="font-mono text-amber-700">{r.cull_eggs}</strong></span>
                        <span>العلف: <strong className="font-mono">{r.feed_consumed_kg} كجم</strong></span>
                        <span>المشرف: <strong>{r.recorded_by_name}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop / Printable Table for R-01 */}
              <div className={`${mobileDisplayMode === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto rounded-xl border border-slate-200`}>
                <table className="w-full min-w-[780px] text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">التاريخ</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الهنجر</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">القطيع</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">إجمالي البيض (طبق)</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الكسر</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الفرز</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الصافي السليم</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">النفوق</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">العلف (كجم)</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">المشرف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredR01Records.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400">
                          لا توجد سجلات إنتاج مطابقة للفترة أو البحث
                        </td>
                      </tr>
                    ) : (
                      filteredR01Records.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="p-2.5 border border-slate-200 font-mono whitespace-nowrap" dir="ltr">{r.record_date}</td>
                          <td className="p-2.5 border border-slate-200 font-semibold whitespace-nowrap">{r.house_name}</td>
                          <td className="p-2.5 border border-slate-200 font-mono whitespace-nowrap">{r.flock_code}</td>
                          <td className="p-2.5 border border-slate-200 font-mono font-bold whitespace-nowrap">{r.prod_Egg_Trays}</td>
                          <td className="p-2.5 border border-slate-200 font-mono text-rose-600 whitespace-nowrap">{r.damaged_eggs}</td>
                          <td className="p-2.5 border border-slate-200 font-mono text-amber-700 whitespace-nowrap">{r.cull_eggs}</td>
                          <td className="p-2.5 border border-slate-200 font-mono font-bold text-emerald-800 whitespace-nowrap">{r.net_trays}</td>
                          <td className="p-2.5 border border-slate-200 font-mono font-semibold text-rose-700 whitespace-nowrap">{r.mortality_count}</td>
                          <td className="p-2.5 border border-slate-200 font-mono whitespace-nowrap">{r.feed_consumed_kg}</td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">{r.recorded_by_name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* R-02: Requisitions Status Report */}
          {/* ============================================================== */}
          {activeReport === 'R-02' && reportData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">إجمالي الطلبات</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">
                    {reportData.summary?.totalRequests || 0} طلب
                  </span>
                </div>
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200">
                  <span className="text-amber-800 block">قيد المراجعة والانتظار</span>
                  <span className="text-base sm:text-lg font-black text-amber-900 mt-1 block">
                    {(reportData.summary?.submitted || 0) + (reportData.summary?.underReview || 0)} طلب
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block">معتمدة ومكتملة</span>
                  <span className="text-base sm:text-lg font-black text-emerald-900 mt-1 block">
                    {(reportData.summary?.approved || 0) + (reportData.summary?.completed || 0)} طلب
                  </span>
                </div>
                <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200">
                  <span className="text-rose-800 block">مرفوضة</span>
                  <span className="text-base sm:text-lg font-black text-rose-900 mt-1 block">
                    {reportData.summary?.rejected || 0} طلب
                  </span>
                </div>
              </div>

              {/* Mobile Cards for R-02 */}
              <div className={`${mobileDisplayMode === 'cards' ? 'block md:hidden' : 'hidden'} space-y-3 no-print`}>
                {filteredR02Requisitions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                    لا توجد طلبات احتياج مطابقة للفترة أو البحث
                  </div>
                ) : (
                  filteredR02Requisitions.map((req: any) => (
                    <div
                      key={req.id}
                      className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{req.request_no}</span>
                        <Badge
                          variant={
                            req.status === 'APPROVED' || req.status === 'COMPLETED'
                              ? 'emerald'
                              : req.status === 'REJECTED'
                              ? 'rose'
                              : 'amber'
                          }
                        >
                          {statusLabels[req.status] || req.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">التصنيف:</span>
                          <span className="font-bold text-slate-800">{reqTypeLabels[req.req_type] || req.req_type}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">الهنجر:</span>
                          <span className="font-bold text-slate-800">{req.house_name || 'عام للمزرعة'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">مقدم الطلب:</span>
                          <span className="font-medium text-slate-700">{req.requester_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">المعتمد:</span>
                          <span className="font-medium text-slate-700">{req.reviewer_name || '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                        <span>عدد البنود: <strong className="font-mono text-slate-800">{req.items_count} صنف</strong></span>
                        <span className="font-mono" dir="ltr">{req.request_date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop / Printable Table for R-02 */}
              <div className={`${mobileDisplayMode === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto rounded-xl border border-slate-200`}>
                <table className="w-full min-w-[740px] text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">رقم الطلب</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">التصنيف</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الهنجر</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">مقدم الطلب</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">المراجع / المعتمد</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">عدد البنود</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">تاريخ الطلب</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredR02Requisitions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          لا توجد طلبات احتياج مطابقة للفترة أو البحث
                        </td>
                      </tr>
                    ) : (
                      filteredR02Requisitions.map((req: any) => (
                        <tr key={req.id} className="hover:bg-slate-50/70">
                          <td className="p-2.5 border border-slate-200 font-mono font-bold whitespace-nowrap">{req.request_no}</td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">{reqTypeLabels[req.req_type] || req.req_type}</td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">{req.house_name || 'عام للمزرعة'}</td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">{req.requester_name}</td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">{req.reviewer_name || '—'}</td>
                          <td className="p-2.5 border border-slate-200 font-mono font-bold whitespace-nowrap">{req.items_count} صنف</td>
                          <td className="p-2.5 border border-slate-200 font-mono whitespace-nowrap" dir="ltr">{req.request_date}</td>
                          <td className="p-2.5 border border-slate-200 font-semibold whitespace-nowrap">
                            {statusLabels[req.status] || req.status}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* R-03: Sales Summary Report */}
          {/* ============================================================== */}
          {activeReport === 'R-03' && reportData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">إجمالي الفواتير</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">
                    {reportData.summary?.totalInvoices || 0} فاتورة
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">صافي المبيعات (قبل الضريبة)</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">
                    {formatCurrency(reportData.summary?.totalSubtotal || 0)}
                  </span>
                </div>
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200">
                  <span className="text-amber-800 block">إجمالي الضرائب المحصلة</span>
                  <span className="text-base sm:text-lg font-black text-amber-900 mt-1 block">
                    {formatCurrency(reportData.summary?.totalTax || 0)}
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block">الإجمالي العام للمبيعات (YER)</span>
                  <span className="text-base sm:text-lg font-black text-emerald-900 mt-1 block">
                    {formatCurrency(reportData.summary?.grandTotalRevenue || 0)}
                  </span>
                </div>
              </div>

              {/* Mobile Cards for R-03 */}
              <div className={`${mobileDisplayMode === 'cards' ? 'block md:hidden' : 'hidden'} space-y-3 no-print`}>
                {filteredR03Invoices.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                    لا توجد فواتير مبيعات مطابقة للفترة أو البحث
                  </div>
                ) : (
                  filteredR03Invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-sm">{inv.invoice_no}</span>
                          <p className="font-bold text-slate-700 mt-0.5">{inv.customer_name}</p>
                        </div>
                        <Badge variant={inv.payment_status === 'PAID' ? 'emerald' : 'amber'}>
                          {statusLabels[inv.payment_status] || inv.payment_status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 block">المجموع الفرعي</span>
                          <span className="font-mono font-semibold text-slate-800">{formatCurrency(inv.subtotal)}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 block">الضريبة</span>
                          <span className="font-mono text-slate-700">{formatCurrency(inv.tax_amount)}</span>
                        </div>
                        <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/70">
                          <span className="text-[10px] text-emerald-800 block">الإجمالي</span>
                          <span className="font-mono font-bold text-emerald-900">{formatCurrency(inv.total_amount)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>تاريخ الفاتورة:</span>
                        <span className="font-mono font-semibold" dir="ltr">{inv.invoice_date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop / Printable Table for R-03 */}
              <div className={`${mobileDisplayMode === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto rounded-xl border border-slate-200`}>
                <table className="w-full min-w-[680px] text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">رقم الفاتورة</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">العميل</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">التاريخ</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">المجموع الفرعي</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الضريبة</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الإجمالي النهائي (YER)</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">حالة السداد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredR03Invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          لا توجد فواتير مبيعات مطابقة للفترة أو البحث
                        </td>
                      </tr>
                    ) : (
                      filteredR03Invoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50/70">
                          <td className="p-2.5 border border-slate-200 font-mono font-bold whitespace-nowrap">{inv.invoice_no}</td>
                          <td className="p-2.5 border border-slate-200 font-semibold whitespace-nowrap">{inv.customer_name}</td>
                          <td className="p-2.5 border border-slate-200 font-mono whitespace-nowrap" dir="ltr">{inv.invoice_date}</td>
                          <td className="p-2.5 border border-slate-200 font-mono whitespace-nowrap">{formatCurrency(inv.subtotal)}</td>
                          <td className="p-2.5 border border-slate-200 font-mono whitespace-nowrap">{formatCurrency(inv.tax_amount)}</td>
                          <td className="p-2.5 border border-slate-200 font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {formatCurrency(inv.total_amount)}
                          </td>
                          <td className="p-2.5 border border-slate-200 font-semibold whitespace-nowrap">
                            {statusLabels[inv.payment_status] || inv.payment_status}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* R-04: Warehouse Movement Report */}
          {/* ============================================================== */}
          {activeReport === 'R-04' && reportData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">سندات التوريد</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">
                    {reportData.summary?.totalReceipts || 0} سند
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block">إجمالي الكميات الموردة</span>
                  <span className="text-base sm:text-lg font-black text-emerald-900 mt-1 block">
                    {reportData.summary?.totalSuppliedQuantity?.toLocaleString('ar-EG') || 0} وحدة
                  </span>
                </div>
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200">
                  <span className="text-blue-800 block">الأصناف النشطة</span>
                  <span className="text-base sm:text-lg font-black text-blue-900 mt-1 block">
                    {reportData.currentStockLevels?.length || 0} صنف
                  </span>
                </div>
                <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200">
                  <span className="text-rose-800 block">أصناف منخفضة الرصيد</span>
                  <span className="text-base sm:text-lg font-black text-rose-900 mt-1 block">
                    {reportData.summary?.lowStockItemsCount || 0} صنف
                  </span>
                </div>
              </div>

              {/* Mobile Cards for R-04 */}
              <div className={`${mobileDisplayMode === 'cards' ? 'block md:hidden' : 'hidden'} space-y-3 no-print`}>
                {filteredR04Receipts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                    لا توجد حركات توريد مخزنية مطابقة للفترة أو البحث
                  </div>
                ) : (
                  filteredR04Receipts.map((rcp: any) => (
                    <div
                      key={rcp.id}
                      className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{rcp.receipt_no}</span>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                          +{rcp.quantity} {rcp.unit}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">الصنف المورد:</span>
                          <span className="font-bold text-slate-900">{rcp.product_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">المستودع:</span>
                          <span className="font-semibold text-slate-800">{rcp.warehouse_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">المورد / الدفعة:</span>
                          <span className="font-medium text-slate-700">{rcp.supplier_name} ({rcp.batch_no || '—'})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">المستلم:</span>
                          <span className="font-medium text-slate-700">{rcp.received_by_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                        <span>تاريخ التوريد:</span>
                        <span className="font-mono" dir="ltr">{rcp.receipt_date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop / Printable Table for R-04 */}
              <div className={`${mobileDisplayMode === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto rounded-xl border border-slate-200`}>
                <table className="w-full min-w-[700px] text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">رقم السند</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">المستودع</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الصنف المورد</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الكمية الموردة</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">المورد / الدفعة</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">تاريخ التوريد</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">المستلم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredR04Receipts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          لا توجد حركات توريد مخزنية مطابقة للفترة أو البحث
                        </td>
                      </tr>
                    ) : (
                      filteredR04Receipts.map((rcp: any) => (
                        <tr key={rcp.id} className="hover:bg-slate-50/70">
                          <td className="p-2.5 border border-slate-200 font-mono font-bold whitespace-nowrap">{rcp.receipt_no}</td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">{rcp.warehouse_name}</td>
                          <td className="p-2.5 border border-slate-200 font-semibold whitespace-nowrap">{rcp.product_name}</td>
                          <td className="p-2.5 border border-slate-200 font-mono font-bold text-emerald-800 whitespace-nowrap">
                            +{rcp.quantity} {rcp.unit}
                          </td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">
                            {rcp.supplier_name} ({rcp.batch_no || '—'})
                          </td>
                          <td className="p-2.5 border border-slate-200 font-mono whitespace-nowrap" dir="ltr">{rcp.receipt_date}</td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">{rcp.received_by_name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* R-05: Executive Inventory & Financial Report */}
          {/* ============================================================== */}
          {activeReport === 'R-05' && reportData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
                  <span className="text-purple-800 block">القيمة التقديرية للمخزون</span>
                  <span className="text-base sm:text-lg font-black text-purple-950 mt-1 block">
                    {formatCurrency(reportData.summary?.totalInventoryValuation || 0)}
                  </span>
                </div>
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200">
                  <span className="text-blue-800 block">إجمالي المبيعات المعتمدة</span>
                  <span className="text-base sm:text-lg font-black text-blue-950 mt-1 block">
                    {formatCurrency(reportData.summary?.totalRevenue || 0)}
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block">المبالغ المحصلة (PAID)</span>
                  <span className="text-base sm:text-lg font-black text-emerald-950 mt-1 block">
                    {formatCurrency(reportData.summary?.paidRevenue || 0)}
                  </span>
                </div>
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200">
                  <span className="text-amber-800 block">ذمم قيد التحصيل (PENDING)</span>
                  <span className="text-base sm:text-lg font-black text-amber-950 mt-1 block">
                    {formatCurrency(reportData.summary?.pendingReceivables || 0)}
                  </span>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-900 pt-1">
                بيان تقييم الأصناف والأرصدة المخزنية (بالريال اليمني YER):
              </h4>

              {/* Mobile Cards for R-05 */}
              <div className={`${mobileDisplayMode === 'cards' ? 'block md:hidden' : 'hidden'} space-y-3 no-print`}>
                {filteredR05Products.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                    لا توجد أصناف مطابقة للبحث
                  </div>
                ) : (
                  filteredR05Products.map((p: any) => {
                    const isLow = p.current_stock <= p.min_stock_alert;
                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                          isLow ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{p.product_name}</span>
                            <span className="font-mono text-[11px] text-slate-500">{p.product_code}</span>
                          </div>
                          <Badge variant={isLow ? 'rose' : 'emerald'}>
                            {isLow ? 'تحت الحد الأدنى' : 'رصيد آمن'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                            <span className="text-[10px] text-slate-500 block">الرصيد الحالي</span>
                            <span className="font-mono font-bold text-slate-900">{p.current_stock} {p.unit}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                            <span className="text-[10px] text-slate-500 block">سعر الوحدة</span>
                            <span className="font-mono text-slate-800">{formatCurrency(p.unit_price)}</span>
                          </div>
                          <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/70">
                            <span className="text-[10px] text-emerald-800 block">القيمة الإجمالية</span>
                            <span className="font-mono font-bold text-emerald-900">{formatCurrency(p.stock_valuation)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop / Printable Table for R-05 */}
              <div className={`${mobileDisplayMode === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto rounded-xl border border-slate-200`}>
                <table className="w-full min-w-[680px] text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">كود الصنف</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">اسم الصنف</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الفئة</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الرصيد الحالي</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">سعر الوحدة (YER)</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">القيمة الإجمالية (YER)</th>
                      <th className="p-2.5 border border-slate-200 whitespace-nowrap">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredR05Products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          لا توجد أصناف مطابقة للبحث
                        </td>
                      </tr>
                    ) : (
                      filteredR05Products.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="p-2.5 border border-slate-200 font-mono font-bold whitespace-nowrap">{p.product_code}</td>
                          <td className="p-2.5 border border-slate-200 font-semibold whitespace-nowrap">{p.product_name}</td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">{p.category}</td>
                          <td className="p-2.5 border border-slate-200 font-mono font-bold whitespace-nowrap">
                            {p.current_stock} {p.unit}
                          </td>
                          <td className="p-2.5 border border-slate-200 font-mono whitespace-nowrap">{formatCurrency(p.unit_price)}</td>
                          <td className="p-2.5 border border-slate-200 font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {formatCurrency(p.stock_valuation)}
                          </td>
                          <td className="p-2.5 border border-slate-200 whitespace-nowrap">
                            {p.current_stock <= p.min_stock_alert ? (
                              <span className="text-rose-700 font-bold">تحت الحد الأدنى</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">رصيد آمن</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Official Report Signatures Footer */}
          <div className="pt-8 mt-8 border-t-2 border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-6 sm:space-y-8">
              <p className="font-bold text-slate-800">إعداد ومراجعة القسم المختص</p>
              <p className="text-slate-400">التوقيع: ...............................</p>
            </div>
            <div className="space-y-6 sm:space-y-8">
              <p className="font-bold text-slate-800">اعتماد مدير الإنتاج (أحمد صبر)</p>
              <p className="text-slate-400">التوقيع: ...............................</p>
            </div>
            <div className="space-y-6 sm:space-y-8">
              <p className="font-bold text-slate-800">الاعتماد العام والختم الرسمي</p>
              <p className="text-slate-400">التوقيع: ...............................</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
