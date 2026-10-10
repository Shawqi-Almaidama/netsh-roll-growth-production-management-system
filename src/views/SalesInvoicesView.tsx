import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Eye,
  Printer,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Receipt,
  User,
  CreditCard,
  Building,
  ArrowRight
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { SalesInvoice, Product, Customer, SalesInvoiceItem } from '../types.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { formatCurrency } from '../utils/currency.js';

const paymentStatusLabels: Record<string, { label: string; variant: 'emerald' | 'amber' | 'rose' }> = {
  PAID: { label: 'مدفوعة ومسددة', variant: 'emerald' },
  PENDING: { label: 'معلقة للدفع (آجل)', variant: 'amber' },
  PARTIAL: { label: 'مدفوعة جزئياً', variant: 'amber' }
};

export const SalesInvoicesView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { hasRole } = useAuth();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchKw, setSearchKw] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Invoice Form Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING' | 'PARTIAL'>('PAID');
  const [taxRate, setTaxRate] = useState<number>(0); // Optional tax rate (default 0%)
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Invoice Items
  const [items, setItems] = useState<SalesInvoiceItem[]>([
    { productId: 0, quantity: 10, unitPrice: 22.0, lineTotal: 220.0 }
  ]);

  // Invoice View Modal
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, prodRes, custRes] = await Promise.all([
        api.getSalesInvoices(),
        api.getProducts(),
        api.getCustomers()
      ]);
      if (invRes.success) setInvoices(invRes.invoices);
      if (prodRes.success) {
        setProducts(prodRes.products);
        if (prodRes.products.length > 0 && items[0].productId === 0) {
          const p = prodRes.products[0];
          setItems([{ productId: p.id, quantity: 5, unitPrice: p.unit_price, lineTotal: 5 * p.unit_price }]);
        }
      }
      if (custRes.success) {
        setCustomers(custRes.customers);
        if (custRes.customers.length > 0 && !customerId) {
          setCustomerId(String(custRes.customers[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductSelect = (index: number, pId: number) => {
    const prod = products.find(p => p.id === pId);
    if (!prod) return;
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prod.id,
        unitPrice: prod.unit_price,
        lineTotal: copy[index].quantity * prod.unit_price
      };
      return copy;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setItems(prev => {
      const copy = [...prev];
      const price = Number(copy[index].unitPrice ?? copy[index].unit_price ?? 0);
      copy[index] = {
        ...copy[index],
        quantity: qty,
        lineTotal: qty * price
      };
      return copy;
    });
  };

  const handleAddItem = () => {
    const defaultProd = products[0];
    if (!defaultProd) return;
    setItems(prev => [
      ...prev,
      { productId: defaultProd.id, quantity: 1, unitPrice: defaultProd.unit_price, lineTotal: defaultProd.unit_price }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, itm) => sum + (itm.lineTotal || 0), 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number(((taxable * (Number(taxRate) || 0)) / 100).toFixed(2));
  const grandTotal = Math.max(0, taxable + taxAmount);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setSubmitting(true);

    try {
      // Validate customer
      if (!customerId) throw new Error('يرجى اختيار العميل');

      // Validate stock availability client-side before sending (BR-03)
      for (const itm of items) {
        const p = products.find(prod => prod.id === itm.productId);
        if (p && itm.quantity > p.current_stock) {
          throw new Error(`الكمية المطلوبة من الصنف "${p.product_name}" (${itm.quantity}) تتجاوز الرصيد المتاح في المستودع (${p.current_stock})`);
        }
      }

      const res = await api.createSalesInvoice({
        customerId: Number(customerId),
        invoiceDate,
        paymentStatus,
        discountAmount: Number(discountAmount),
        taxRate: Number(taxRate),
        notes,
        items
      });

      if (res.success) {
        setIsCreateOpen(false);
        await loadData();
      }
    } catch (err: any) {
      setCreateError(err.message || 'فشل إصدار فاتورة المبيعات');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (id: number, autoPrint = false) => {
    try {
      const res = await api.getSalesInvoiceDetails(id);
      if (res.success) {
        setSelectedInvoice(res.invoice);
        setIsViewOpen(true);
        if (autoPrint) {
          setTimeout(() => {
            window.print();
          }, 150);
        }
      }
    } catch (err) {
      console.error('Failed to view invoice details:', err);
    }
  };

  const handlePrintSelectedInvoice = () => {
    if (!selectedInvoice) return;
    window.print();
  };

  const filteredInvoices = invoices.filter(inv => {
    const invStatus = inv.payment_status || inv.status;
    if (statusFilter !== 'all' && invStatus !== statusFilter) return false;
    if (searchKw) {
      const q = searchKw.toLowerCase();
      return (
        inv.invoice_no?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.issuer_name?.toLowerCase().includes(q) ||
        inv.created_by_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const canPrintInvoice = hasRole('SALES_OFFICER', 'ACCOUNTANT', 'ADMIN');
  const invoiceLines = selectedInvoice?.lines || selectedInvoice?.items || [];

  return (
    <div id="sales-invoices-view" className="space-y-6 pb-12" dir="rtl">
      <div className="space-y-6 no-print">
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
                فواتير المبيعات والتوزيع
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              إصدار فواتير المبيعات، الخصم المباشر من المستودع، وحساب إجماليات البيع بالريال اليمني
            </p>
          </div>

          {hasRole('SALES_OFFICER', 'ADMIN') && (
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إصدار فاتورة بيع جديدة</span>
            </button>
          )}
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchKw}
                onChange={(e) => setSearchKw(e.target.value)}
                placeholder="البحث برقم الفاتورة، اسم العميل، مُصدر الفاتورة..."
                className="w-full text-xs pr-9 pl-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">جميع حالات الدفع</option>
              <option value="PAID">مدفوعة ومسددة (PAID)</option>
              <option value="PENDING">معلقة للدفع (PENDING)</option>
              <option value="PARTIAL">مدفوعة جزئياً (PARTIAL)</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-bold">
            إجمالي الفواتير: <span className="text-slate-900 font-mono">{filteredInvoices.length}</span>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-bold">رقم الفاتورة</th>
                  <th className="py-3 px-4 font-bold">العميل</th>
                  <th className="py-3 px-4 font-bold">التاريخ</th>
                  <th className="py-3 px-4 font-bold">المجموع الفرعي</th>
                  <th className="py-3 px-4 font-bold">الخصم التجاري</th>
                  <th className="py-3 px-4 font-bold">الضريبة</th>
                  <th className="py-3 px-4 font-bold">الإجمالي النهائي</th>
                  <th className="py-3 px-4 font-bold">مُصدر الفاتورة</th>
                  <th className="py-3 px-4 font-bold">حالة الدفع</th>
                  <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const pStatus = inv.payment_status || inv.status || 'PAID';
                  const stInfo = paymentStatusLabels[pStatus] || { label: pStatus, variant: 'amber' };
                  return (
                    <tr key={`sale-inv-${inv.id}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_no}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{inv.customer_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{inv.customer_code}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{inv.invoice_date}</td>
                      <td className="py-3 px-4 font-mono font-medium">{formatCurrency(inv.subtotal)}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatCurrency(inv.discount || 0)}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{formatCurrency(inv.tax_amount)}</td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-800 text-sm">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{inv.issuer_name || inv.created_by_name}</td>
                      <td className="py-3 px-4">
                        <Badge variant={stInfo.variant}>{stInfo.label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(inv.id, false)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>عرض وتفاصيل</span>
                          </button>
                          {canPrintInvoice && (
                            <button
                              type="button"
                              onClick={() => handleViewDetails(inv.id, true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                              title="طباعة الفاتورة"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-700" />
                              <span>طباعة</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: CREATE SALES INVOICE */}
      <Modal
        id="modal-create-invoice"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="إصدار فاتورة بيع جديدة"
        subtitle="التحقق المباشر من توفر المخزون وحساب إجماليات البيع بالريال اليمني"
        maxWidth="2xl"
      >
        {createError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
          {/* Header Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">العميل المستفيد *</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="">اختر العميل...</option>
                {customers.map((c) => (
                  <option key={`sale-cust-${c.id}`} value={c.id}>{c.customer_name} ({c.customer_code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ الفاتورة *</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">حالة الدفع *</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as 'PAID' | 'PENDING' | 'PARTIAL')}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
              >
                <option value="PAID">مدفوعة ومسددة (PAID)</option>
                <option value="PENDING">معلقة للدفع / آجل (PENDING)</option>
                <option value="PARTIAL">مدفوعة جزئياً (PARTIAL)</option>
              </select>
            </div>
          </div>

          {/* Multi-line Products Items Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-900 text-xs">
                بنود المبيعات والكميات المطلوبة *
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صنف آخر</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((itm, idx) => {
                const selProd = products.find(p => p.id === itm.productId);
                const isOverStock = selProd && itm.quantity > selProd.current_stock;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-12 gap-2 items-center ${
                      isOverStock ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] text-slate-500 mb-0.5">الصنف *</label>
                      <select
                        value={itm.productId}
                        onChange={(e) => handleProductSelect(idx, Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                      >
                        {products.map((p) => (
                          <option key={`sale-prod-opt-${p.id}`} value={p.id}>
                            {p.product_name} - الرصيد: {p.current_stock} {p.unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 mb-0.5">الكمية *</label>
                      <input
                        type="number"
                        min="1"
                        value={itm.quantity}
                        onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 mb-0.5">سعر الوحدة (ر.ي)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={itm.unitPrice}
                        readOnly
                        title="سعر الوحدة المعتمد من دليل المنتجات"
                        className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-mono font-medium cursor-not-allowed"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 mb-0.5">الإجمالي (ر.ي)</label>
                      <div className="p-2 font-mono font-bold text-slate-800 bg-slate-100 rounded-lg text-left text-xs">
                        {formatCurrency(itm.lineTotal || 0)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex items-center justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isOverStock && (
                      <div className="sm:col-span-12 text-[11px] text-rose-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>تنبيه المخزون: الرصيد المتوفر في المستودع هو {selProd.current_stock} {selProd.unit} فقط! لا يمكن طلب كمية أكبر من الرصيد الفعلي.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Totals Summary Box */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">المجموع الفرعي:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(subtotal)}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">الخصم التجاري:</span>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                className="w-full p-1 border border-slate-300 rounded bg-white font-mono text-xs"
              />
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">الضريبة (نسبة % اختيارية):</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-16 p-1 border border-slate-300 rounded bg-white font-mono text-xs"
                  placeholder="0"
                />
                <span className="font-mono font-bold text-slate-800 text-xs truncate">{formatCurrency(taxAmount)}</span>
              </div>
            </div>

            <div className="p-2 bg-emerald-700 text-white rounded-lg text-center">
              <span className="text-[10px] block opacity-80">الصافي النهائي المستحق:</span>
              <span className="font-mono font-black text-sm text-white">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات الفاتورة والتسليم</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="شروط التسليم، عنوان المستودع، رقم الشاحنة الناقلة..."
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {submitting ? 'جاري الحفظ وخصم المخزون...' : 'اعتماد وإصدار الفاتورة'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW INVOICE DETAILS */}
      <Modal
        id="modal-view-invoice"
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={`تفاصيل فاتورة المبيعات: ${selectedInvoice?.invoice_no || ''}`}
        subtitle="شركة نتش رول جروث للتنمية والاستثمار الزراعي — قسم المبيعات والتوزيع"
        maxWidth="2xl"
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            {/* Invoice & Customer Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Customer Info Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-black text-slate-800 border-b border-slate-200 pb-1.5 mb-1">
                  بيانات العميل
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">اسم العميل:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">كود العميل:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedInvoice.customer_code}</span>
                </div>
                {selectedInvoice.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">رقم الهاتف:</span>
                    <span className="font-mono text-slate-800">{selectedInvoice.customer_phone}</span>
                  </div>
                )}
                {selectedInvoice.customer_address && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">العنوان:</span>
                    <span className="text-slate-800">{selectedInvoice.customer_address}</span>
                  </div>
                )}
                {selectedInvoice.customer_tax && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">الرقم الضريبي:</span>
                    <span className="font-mono text-slate-800">{selectedInvoice.customer_tax}</span>
                  </div>
                )}
              </div>

              {/* Invoice Info Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-black text-slate-800 border-b border-slate-200 pb-1.5 mb-1">
                  بيانات الفاتورة
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم الفاتورة:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoice_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">تاريخ الإصدار:</span>
                  <span className="font-mono text-slate-800">{selectedInvoice.invoice_date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">حالة الدفع:</span>
                  <Badge variant={paymentStatusLabels[selectedInvoice.payment_status || selectedInvoice.status || 'PAID']?.variant || 'amber'}>
                    {paymentStatusLabels[selectedInvoice.payment_status || selectedInvoice.status || 'PAID']?.label || selectedInvoice.payment_status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">مُصدر الفاتورة:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.issuer_name || selectedInvoice.created_by_name}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5 font-bold">#</th>
                    <th className="p-2.5 font-bold">الصنف</th>
                    <th className="p-2.5 font-bold">الكمية</th>
                    <th className="p-2.5 font-bold">الوحدة</th>
                    <th className="p-2.5 font-bold">سعر الوحدة</th>
                    <th className="p-2.5 font-bold text-left">إجمالي السطر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceLines.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {it.product_name}
                        {it.product_code && <span className="text-[10px] font-mono text-slate-400 mr-1">({it.product_code})</span>}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-emerald-800">{it.quantity}</td>
                      <td className="p-2.5 text-slate-600">{it.unit || '-'}</td>
                      <td className="p-2.5 font-mono">{formatCurrency(Number(it.unit_price ?? it.unitPrice ?? 0))}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 text-left">
                        {formatCurrency(Number(it.line_total ?? it.lineTotal ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-medium">{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الخصم التجاري:</span>
                <span className="font-mono font-medium text-rose-700">{formatCurrency(selectedInvoice.discount || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الضريبة المضافة:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-emerald-900 pt-2 border-t border-slate-200">
                <span>الإجمالي النهائي المستحق:</span>
                <span className="font-mono font-black">{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">ملاحظات الفاتورة:</span>
                <span className="text-slate-700">{selectedInvoice.notes}</span>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {canPrintInvoice && (
                <button
                  type="button"
                  onClick={handlePrintSelectedInvoice}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الفاتورة</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* FORMAL A4 PRINTABLE INVOICE DOCUMENT (ONLY VISIBLE IN @media print) */}
      {selectedInvoice && canPrintInvoice && (
        <div className="hidden print:block printable-report-wrapper bg-white text-black p-4" dir="rtl">
          <div className="border-b-2 border-slate-800 pb-4 mb-5 flex justify-between items-start">
            <div>
              <h1 className="text-lg font-black text-slate-900">شركة نتش رول جروث للتنمية والاستثمار الزراعي</h1>
              <p className="text-xs text-slate-700 mt-0.5">نظام إدارة قسم الإنتاج والمبيعات — فاتورة مبيعات رسمية</p>
            </div>
            <div className="text-left text-xs space-y-0.5">
              <div className="font-mono font-black text-sm">رقم الفاتورة: {selectedInvoice.invoice_no}</div>
              <div>تاريخ الفاتورة: <span className="font-mono">{selectedInvoice.invoice_date}</span></div>
              <div>
                حالة الدفع: {paymentStatusLabels[selectedInvoice.payment_status || selectedInvoice.status || 'PAID']?.label || selectedInvoice.payment_status}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5 text-xs border border-slate-300 rounded-lg p-3">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1">بيانات العميل</div>
              <div>الاسم: <span className="font-bold">{selectedInvoice.customer_name}</span> ({selectedInvoice.customer_code})</div>
              {selectedInvoice.customer_phone && <div>الهاتف: <span className="font-mono">{selectedInvoice.customer_phone}</span></div>}
              {selectedInvoice.customer_address && <div>العنوان: {selectedInvoice.customer_address}</div>}
              {selectedInvoice.customer_tax && <div>الرقم الضريبي: <span className="font-mono">{selectedInvoice.customer_tax}</span></div>}
            </div>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1">بيانات الإصدار</div>
              <div>مُصدر الفاتورة: <span className="font-bold">{selectedInvoice.issuer_name || selectedInvoice.created_by_name}</span></div>
              <div>تاريخ الإنشاء: <span className="font-mono">{selectedInvoice.created_at || selectedInvoice.invoice_date}</span></div>
              <div>عدد البنود: <span className="font-mono">{invoiceLines.length}</span></div>
            </div>
          </div>

          <table className="w-full text-right text-xs mb-5">
            <thead>
              <tr>
                <th>#</th>
                <th>كود الصنف</th>
                <th>اسم المنتج</th>
                <th>الكمية</th>
                <th>الوحدة</th>
                <th>سعر الوحدة</th>
                <th>إجمالي السطر</th>
              </tr>
            </thead>
            <tbody>
              {invoiceLines.map((it, idx) => (
                <tr key={`print-inv-line-${idx}`}>
                  <td className="font-mono">{idx + 1}</td>
                  <td className="font-mono">{it.product_code || '-'}</td>
                  <td className="font-bold">{it.product_name}</td>
                  <td className="font-mono font-bold">{it.quantity}</td>
                  <td>{it.unit || '-'}</td>
                  <td className="font-mono">{formatCurrency(Number(it.unit_price ?? it.unitPrice ?? 0))}</td>
                  <td className="font-mono font-bold">{formatCurrency(Number(it.line_total ?? it.lineTotal ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-6 items-start text-xs mb-8">
            <div>
              {selectedInvoice.notes && (
                <div className="border border-slate-300 rounded p-2.5">
                  <div className="font-bold mb-1">ملاحظات الفاتورة:</div>
                  <div>{selectedInvoice.notes}</div>
                </div>
              )}
            </div>
            <div className="border border-slate-400 rounded p-3 space-y-1.5">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-bold">{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>الخصم التجاري:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.discount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>الضريبة المضافة:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-black text-sm border-t border-slate-400 pt-1.5">
                <span>الإجمالي النهائي المستحق:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-center text-xs">
            <div>
              <div className="font-bold mb-6">مُصدر الفاتورة (المبيعات)</div>
              <div>{selectedInvoice.issuer_name || selectedInvoice.created_by_name}</div>
            </div>
            <div>
              <div className="font-bold mb-6">المراجعة المالية (المحاسب)</div>
              <div>........................................</div>
            </div>
            <div>
              <div className="font-bold mb-6">توقيع المستلم (العميل)</div>
              <div>........................................</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
