import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Eye,
  Printer,
  AlertCircle,
  ArrowRight,
  Download,
  X,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { WarehouseReceipt, Product, Warehouse } from '../types.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { DateInput } from '../components/ui/DateInput.js';
import { exportWarehouseReceiptPDF } from '../utils/pdfExport.js';
import { getLocalTodayDateString } from '../utils/date.js';

export const WarehouseSupplyView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user, hasRole } = useAuth();
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchKw, setSearchKw] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [pdfExportingId, setPdfExportingId] = useState<number | null>(null);

  // New Receipt Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [supplyDate, setSupplyDate] = useState(getLocalTodayDateString());
  const [supplyDateValid, setSupplyDateValid] = useState<boolean>(true);
  const [supplyDateError, setSupplyDateError] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState('مزارع الإنتاج المركزية - قسم التحضين');
  const [notes, setNotes] = useState('');

  // Receipt Items
  const [items, setItems] = useState<any[]>([
    {
      productId: 0,
      quantityReceived: 100,
      unitCost: 15.0,
      batchNumber: 'LOT-2026-001',
      expiryDate: ''
    }
  ]);

  // View Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recRes, prodRes, whRes] = await Promise.all([
        api.getWarehouseReceipts(),
        api.getProducts(),
        api.getWarehouses()
      ]);

      if (recRes.success) setReceipts(recRes.receipts);
      if (prodRes.success) {
        setProducts(prodRes.products);
        if (prodRes.products.length > 0 && items[0].productId === 0) {
          setItems([
            {
              productId: prodRes.products[0].id,
              quantityReceived: 50,
              unitCost: 18.0,
              batchNumber: 'LOT-2026-001',
              expiryDate: ''
            }
          ]);
        }
      }
      if (whRes.success && whRes.warehouses?.length > 0) {
        setWarehouses(whRes.warehouses);
        setWarehouseId((prev) => prev || String(whRes.warehouses[0].id));
      }
    } catch (err) {
      console.error('Failed to load warehouse receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = () => {
    if (products.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        quantityReceived: 10,
        unitCost: products[0].unit_price,
        batchNumber: '',
        expiryDate: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!supplyDateValid || !supplyDate) {
      setCreateError(supplyDateError || 'يرجى إدخال تاريخ الاستلام الفعلي بشكل صحيح ومكتمل.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.createWarehouseReceipt({
        warehouseId: Number(warehouseId) || warehouses[0]?.id || 1,
        supplyDate,
        supplierName,
        notes,
        items
      });

      if (res.success) {
        setIsCreateOpen(false);
        await loadData();
      }
    } catch (err: any) {
      setCreateError(err.message || 'فشل تسجيل استلام وتوريد المخزون');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (id: number, autoPrint = false) => {
    try {
      const res = await api.getWarehouseReceiptDetails(id);
      if (res.success) {
        setSelectedReceipt(res.receipt);
        setIsViewOpen(true);
        if (autoPrint) {
          setTimeout(() => {
            window.print();
          }, 150);
        }
      }
    } catch (err) {
      console.error('Failed to load receipt details:', err);
    }
  };

  const handlePrintSelectedReceipt = () => {
    if (!selectedReceipt) return;
    window.print();
  };

  const handleExportReceiptPDF = async (id: number) => {
    try {
      setPdfExportingId(id);
      if (selectedReceipt && selectedReceipt.id === id) {
        await exportWarehouseReceiptPDF(selectedReceipt, user?.fullName);
      } else {
        const res = await api.getWarehouseReceiptDetails(id);
        if (res.success && res.receipt) {
          await exportWarehouseReceiptPDF(res.receipt, user?.fullName);
        }
      }
    } catch (err) {
      console.error('Failed to export receipt PDF:', err);
    } finally {
      setPdfExportingId(null);
    }
  };

  const handleQuickRestockProduct = (prod: Product) => {
    const suggestedQty = Math.max(
      50,
      ((prod as any).min_stock_alert || 100) * 2 - prod.current_stock
    );
    setItems([
      {
        productId: prod.id,
        quantityReceived: suggestedQty,
        unitCost: prod.unit_price,
        batchNumber: `LOT-${getLocalTodayDateString().replace(/-/g, '')}`,
        expiryDate: ''
      }
    ]);
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const lowStockProducts = products.filter(
    (p) => Number(p.current_stock) <= Number((p as any).min_stock_alert ?? 0)
  );

  const filteredReceipts = receipts.filter((r) => {
    if (warehouseFilter !== 'all' && String(r.warehouse_id) !== warehouseFilter) return false;
    if (searchKw.trim()) {
      const q = searchKw.trim().toLowerCase();
      return (
        r.receipt_no?.toLowerCase().includes(q) ||
        r.supplier_name?.toLowerCase().includes(q) ||
        r.warehouse_name?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q) ||
        (r as any).product_code?.toLowerCase().includes(q) ||
        (r as any).batch_number?.toLowerCase().includes(q) ||
        r.receiver_name?.toLowerCase().includes(q) ||
        r.received_by_name?.toLowerCase().includes(q) ||
        (r.receipt_date || r.supply_date)?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const canPrintReceipt = hasRole('WAREHOUSE_KEEPER', 'PROD_MANAGER', 'ACCOUNTANT', 'ADMIN');

  return (
    <div id="warehouse-supply-view" className="space-y-6 pb-12" dir="rtl">
      <div className="space-y-6 no-print">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
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
              <h1 className="text-base sm:text-xl font-black text-slate-900">
                التوريد للمستودعات واستلام البضائع
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              توثيق سندات استلام البضائع وتحديث رصيد المستودع تلقائياً فور الاستلام
            </p>
          </div>

          {hasRole('WAREHOUSE_KEEPER', 'ADMIN') && (
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[42px]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>تسجيل سند استلام وتوريد جديد</span>
            </button>
          )}
        </div>

        {/* Low Stock Alert Banner for Warehouse Restocking */}
        {lowStockProducts.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-black text-amber-950">
                    تنبيه مخزون منخفض ({lowStockProducts.length} أصناف بحاجة لإعادة توريد):
                  </h3>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    الأصناف التالية وصلت إلى الحد الأدنى للتنبيه أو دونه، يرجى تسجيل سند استلام لتعزيز الرصيد المخزني:
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {lowStockProducts.map((p) => (
                <div
                  key={`wh-low-${p.id}`}
                  className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{p.product_name}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      الرصيد الحالي:{' '}
                      <span className="font-mono font-black text-rose-700">
                        {p.current_stock} {p.unit}
                      </span>{' '}
                      | الحد الأدنى:{' '}
                      <span className="font-mono font-bold text-slate-800">
                        {(p as any).min_stock_alert} {p.unit}
                      </span>
                    </div>
                  </div>
                  {hasRole('WAREHOUSE_KEEPER', 'ADMIN') && (
                    <button
                      type="button"
                      onClick={() => handleQuickRestockProduct(p)}
                      className="px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-[11px] font-bold shrink-0 transition-colors min-h-[36px]"
                    >
                      + توريد سريع
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKw}
                onChange={(e) => setSearchKw(e.target.value)}
                placeholder="بحث فوري برقم السند، الصنف، الكود، المورد، رقم الدفعة، المستودع..."
                className="w-full text-xs pr-9 pl-8 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600"
              />
              {searchKw && (
                <button
                  type="button"
                  onClick={() => setSearchKw('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="text-xs py-2.5 px-3 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:border-purple-600 min-h-[40px]"
            >
              <option value="all">جميع المستودعات</option>
              {warehouses.map((w) => (
                <option key={`filter-wh-${w.id}`} value={String(w.id)}>
                  {w.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-bold shrink-0">
            النتائج المعروضة:{' '}
            <span className="text-slate-900 font-mono">{filteredReceipts.length}</span> من{' '}
            <span className="font-mono">{receipts.length}</span>
          </div>
        </div>

        {/* Receipts Data: Mobile Cards + Desktop Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredReceipts.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                لا توجد سندات استلام مطابقة لمدخلات البحث أو التصفية الحالية
              </div>
            ) : (
              filteredReceipts.map((rec) => (
                <div key={`wh-card-${rec.id}`} className="p-4 space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {rec.receipt_no}
                      </span>
                      <p className="font-bold text-purple-900 mt-0.5">{rec.product_name}</p>
                    </div>
                    <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      +{rec.quantity} {rec.unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">المستودع:</span>
                      <span className="font-bold text-slate-800">{rec.warehouse_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">تاريخ الاستلام:</span>
                      <span className="font-mono font-semibold text-slate-700" dir="ltr">
                        {rec.receipt_date || rec.supply_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">المورد / المصدر:</span>
                      <span className="font-medium text-slate-800">{rec.supplier_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">المستلم:</span>
                      <span className="font-medium text-slate-700">
                        {rec.receiver_name || rec.received_by_name}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleViewReceipt(rec.id, false)}
                      className="flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors min-h-[38px]"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>عرض</span>
                    </button>
                    {canPrintReceipt && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleExportReceiptPDF(rec.id)}
                          disabled={pdfExportingId === rec.id}
                          className="flex items-center justify-center gap-1 py-2 px-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 min-h-[38px]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{pdfExportingId === rec.id ? '...' : 'PDF'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(rec.id, true)}
                          className="flex items-center justify-center gap-1 py-2 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-colors min-h-[38px]"
                        >
                          <Printer className="w-3.5 h-3.5 text-purple-700" />
                          <span>طباعة</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">رقم السند</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">تاريخ الاستلام</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">المستودع</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">الصنف المستلم</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">الكمية المستلمة</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">المورد / المصدر</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">أمين المستودع المستلم</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">الحالة</th>
                  <th className="py-3 px-4 font-bold text-center whitespace-nowrap">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      لا توجد سندات استلام مطابقة لمدخلات البحث أو التصفية الحالية
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((rec) => (
                    <tr
                      key={`wh-rec-${rec.id}`}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {rec.receipt_no}
                      </td>
                      <td
                        className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap"
                        dir="ltr"
                      >
                        {rec.receipt_date || rec.supply_date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {rec.warehouse_name}
                      </td>
                      <td className="py-3 px-4 font-bold text-purple-900 whitespace-nowrap">
                        {rec.product_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {rec.quantity} {rec.unit}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {rec.supplier_name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {rec.receiver_name || rec.received_by_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="emerald">تم التوريد وزيادة المخزون</Badge>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(rec.id, false)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>عرض</span>
                          </button>
                          {canPrintReceipt && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleExportReceiptPDF(rec.id)}
                                disabled={pdfExportingId === rec.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                title="تصدير السند إلى ملف PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>
                                  {pdfExportingId === rec.id ? 'جاري التصدير...' : 'PDF'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewReceipt(rec.id, true)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold transition-colors"
                                title="طباعة السند"
                              >
                                <Printer className="w-3.5 h-3.5 text-purple-700" />
                                <span>طباعة</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: CREATE WAREHOUSE RECEIPT */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="تسجيل سند توريد واستلام بضائع للمستودع"
        maxWidth="max-w-2xl"
      >
        {createError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateReceipt} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">المستودع المستلم *</label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold min-h-[44px]"
              >
                {warehouses.map((w) => (
                  <option key={`wh-opt-${w.id}`} value={w.id}>
                    {w.warehouse_name} ({w.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                المورد أو جهة التوريد *
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="اسم المورد أو عنبر الإنتاج"
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold min-h-[44px]"
              />
            </div>

            <div className="sm:col-span-2">
              <DateInput
                id="wh-supply-date"
                label="تاريخ الاستلام الفعلي"
                required
                value={supplyDate}
                onChange={(iso) => setSupplyDate(iso)}
                onValidityChange={(valid, err) => {
                  setSupplyDateValid(valid);
                  setSupplyDateError(err);
                }}
              />
            </div>
          </div>

          {/* Multi-item builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-900 text-xs">
                الأصناف المستلمة والكميات الموردة *
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-xl transition-colors min-h-[38px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صنف آخر</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((itm, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5"
                >
                  <div className="flex items-center justify-between sm:hidden border-b border-slate-100 pb-1.5">
                    <span className="font-mono font-bold text-slate-500">الصنف #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="flex items-center gap-1 px-2 py-1 text-rose-600 bg-rose-50 rounded-lg text-[11px] font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="col-span-2 sm:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        الصنف المورد *
                      </label>
                      <select
                        value={itm.productId}
                        onChange={(e) => {
                          const pid = Number(e.target.value);
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], productId: pid };
                            return copy;
                          });
                        }}
                        className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold min-h-[42px]"
                      >
                        {products.map((p) => (
                          <option key={`wh-prod-opt-${p.id}`} value={p.id}>
                            {p.product_name} ({p.unit}) - الرصيد: {p.current_stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        الكمية المستلمة *
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        required
                        min="1"
                        value={itm.quantityReceived}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], quantityReceived: val };
                            return copy;
                          });
                        }}
                        className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono font-bold text-purple-900 min-h-[42px]"
                      />
                    </div>

                    <div className="col-span-1 sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        رقم التشغيلة (Batch)
                      </label>
                      <input
                        type="text"
                        value={itm.batchNumber || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], batchNumber: val };
                            return copy;
                          });
                        }}
                        placeholder="LOT-2026-B1"
                        className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono min-h-[42px]"
                      />
                    </div>

                    <div className="hidden sm:flex sm:col-span-1 items-center justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              ملاحظات الفحص والاستلام الظاهري
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سلامة التغليف، مطابقة المواصفات، درجة حرارة السيارة المبردة..."
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold min-h-[42px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 min-h-[42px]"
            >
              {submitting ? 'جاري التوريد وزيادة المخزون...' : 'إتمام سند التوريد وتحديث الرصيد'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW RECEIPT DETAILS */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={`سند استلام وتوريد: ${selectedReceipt?.receipt_no || ''}`}
        maxWidth="max-w-xl"
      >
        {selectedReceipt && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[11px]">رقم السند:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedReceipt.receipt_no}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ الاستلام / التوريد:</span>
                <span className="font-mono text-slate-800" dir="ltr">
                  {selectedReceipt.receipt_date || selectedReceipt.supply_date}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">المستودع المستلم:</span>
                <span className="font-bold text-slate-900">
                  {selectedReceipt.warehouse_name}
                  {selectedReceipt.warehouse_code && (
                    <span className="text-[10px] font-mono text-slate-500 mr-1">
                      ({selectedReceipt.warehouse_code})
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">المورد / جهة التوريد:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.supplier_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">أمين المستودع المستلم:</span>
                <span className="font-semibold text-slate-800">
                  {selectedReceipt.receiver_name || selectedReceipt.received_by_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">حالة التوريد:</span>
                <Badge variant="emerald">تم التوريد وزيادة المخزون</Badge>
              </div>
              {selectedReceipt.notes && (
                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block text-[11px]">ملاحظات الاستلام:</span>
                  <span className="text-slate-700">{selectedReceipt.notes}</span>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[400px] text-right text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5 font-bold whitespace-nowrap">#</th>
                    <th className="p-2.5 font-bold whitespace-nowrap">الصنف المستلم</th>
                    <th className="p-2.5 font-bold whitespace-nowrap">الكمية المضافة</th>
                    <th className="p-2.5 font-bold whitespace-nowrap">الوحدة</th>
                    <th className="p-2.5 font-bold whitespace-nowrap">رقم التشغيلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedReceipt.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-mono text-slate-400 whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {it.product_name}
                        {it.product_code && (
                          <span className="text-[10px] font-mono text-slate-400 mr-1">
                            ({it.product_code})
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono font-black text-purple-900 whitespace-nowrap">
                        {it.quantity_received}
                      </td>
                      <td className="p-2.5 text-slate-600 whitespace-nowrap">{it.unit}</td>
                      <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                        {it.batch_number || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {canPrintReceipt && (
                <>
                  <button
                    type="button"
                    onClick={() => handleExportReceiptPDF(selectedReceipt.id)}
                    disabled={pdfExportingId === selectedReceipt.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 min-h-[42px]"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {pdfExportingId === selectedReceipt.id ? 'جاري التصدير...' : 'تصدير PDF'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintSelectedReceipt}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors min-h-[42px]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة السند</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold min-h-[42px]"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* FORMAL A4 PRINTABLE WAREHOUSE RECEIPT DOCUMENT (ONLY VISIBLE IN @media print) */}
      {selectedReceipt && canPrintReceipt && (
        <div
          className="hidden print:block printable-report-wrapper bg-white text-black p-4"
          dir="rtl"
        >
          <div className="border-b-2 border-slate-800 pb-4 mb-5 flex justify-between items-start">
            <div>
              <h1 className="text-lg font-black text-slate-900">
                شركة نتش رول جروث للتنمية والاستثمار الزراعي
              </h1>
              <p className="text-xs text-slate-700 mt-0.5">
                إدارة المستودعات والمخزون — سند استلام وتوريد مخزني رسمي
              </p>
            </div>
            <div className="text-left text-xs space-y-0.5">
              <div className="font-mono font-black text-sm">
                رقم السند: {selectedReceipt.receipt_no}
              </div>
              <div>
                تاريخ الاستلام:{' '}
                <span className="font-mono" dir="ltr">
                  {selectedReceipt.receipt_date || selectedReceipt.supply_date}
                </span>
              </div>
              <div>حالة السند: تم التوريد وتحديث المخزون</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5 text-xs border border-slate-300 rounded-lg p-3">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1">
                بيانات المستودع والتوريد
              </div>
              <div>
                المستودع المستلم:{' '}
                <span className="font-bold">{selectedReceipt.warehouse_name}</span>
                {selectedReceipt.warehouse_code && (
                  <span className="font-mono mr-1">({selectedReceipt.warehouse_code})</span>
                )}
              </div>
              <div>
                المورد / جهة التوريد:{' '}
                <span className="font-bold">{selectedReceipt.supplier_name}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1">
                بيانات الاستلام والتوثيق
              </div>
              <div>
                أمين المستودع المستلم:{' '}
                <span className="font-bold">
                  {selectedReceipt.receiver_name || selectedReceipt.received_by_name}
                </span>
              </div>
              <div>
                تاريخ التوثيق:{' '}
                <span className="font-mono">
                  {selectedReceipt.created_at || selectedReceipt.receipt_date}
                </span>
              </div>
            </div>
          </div>

          <table className="w-full text-right text-xs mb-5">
            <thead>
              <tr>
                <th>#</th>
                <th>كود الصنف</th>
                <th>اسم المنتج المستلم</th>
                <th>الكمية المستلمة</th>
                <th>الوحدة</th>
                <th>رقم التشغيلة (Batch)</th>
              </tr>
            </thead>
            <tbody>
              {selectedReceipt.items?.map((it, idx) => (
                <tr key={`print-rec-item-${idx}`}>
                  <td className="font-mono">{idx + 1}</td>
                  <td className="font-mono">
                    {it.product_code || selectedReceipt.product_code || '-'}
                  </td>
                  <td className="font-bold">{it.product_name}</td>
                  <td className="font-mono font-bold">{it.quantity_received}</td>
                  <td>{it.unit}</td>
                  <td className="font-mono">{it.batch_number || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {selectedReceipt.notes && (
            <div className="border border-slate-300 rounded p-2.5 text-xs mb-8">
              <div className="font-bold mb-1">ملاحظات الفحص والاستلام:</div>
              <div>{selectedReceipt.notes}</div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-center text-xs">
            <div>
              <div className="font-bold mb-6">المُسلِّم (جهة التوريد)</div>
              <div>{selectedReceipt.supplier_name}</div>
            </div>
            <div>
              <div className="font-bold mb-6">أمين المستودع المستلم</div>
              <div>{selectedReceipt.receiver_name || selectedReceipt.received_by_name}</div>
            </div>
            <div>
              <div className="font-bold mb-6">اعتماد إدارة الإنتاج</div>
              <div>........................................</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
