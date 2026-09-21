import React, { useState, useEffect } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  Eye,
  CheckCircle,
  Package,
  Calendar,
  Layers,
  ArrowDownLeft,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { WarehouseReceipt, Product, Requisition, Warehouse } from '../types.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';

export const WarehouseSupplyView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { hasRole, user } = useAuth();
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchKw, setSearchKw] = useState('');

  // New Receipt Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [requisitionId, setRequisitionId] = useState<string>('');
  const [supplyDate, setSupplyDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierName, setSupplierName] = useState('مزارع الإنتاج المركزية - قسم التحضين');
  const [notes, setNotes] = useState('');

  // Receipt Items
  const [items, setItems] = useState<any[]>([
    { productId: 0, quantityReceived: 100, unitCost: 15.0, batchNumber: 'LOT-2026-001', expiryDate: '' }
  ]);

  // View Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recRes, prodRes, reqRes, whRes] = await Promise.all([
        api.getWarehouseReceipts(),
        api.getProducts(),
        api.getRequisitions(),
        api.getWarehouses()
      ]);

      if (recRes.success) setReceipts(recRes.receipts);
      if (prodRes.success) {
        setProducts(prodRes.products);
        if (prodRes.products.length > 0 && items[0].productId === 0) {
          setItems([{ productId: prodRes.products[0].id, quantityReceived: 50, unitCost: 18.0, batchNumber: 'LOT-2026-001', expiryDate: '' }]);
        }
      }
      if (reqRes.success) {
        setRequisitions(reqRes.requisitions.filter((r: Requisition) => r.status === 'APPROVED'));
      }
      if (whRes.success && whRes.warehouses?.length > 0) {
        setWarehouses(whRes.warehouses);
        setWarehouseId(prev => prev || String(whRes.warehouses[0].id));
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
    setItems(prev => [
      ...prev,
      { productId: products[0].id, quantityReceived: 10, unitCost: products[0].unit_price, batchNumber: '', expiryDate: '' }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setSubmitting(true);

    try {
      const res = await api.createWarehouseReceipt({
        warehouseId: Number(warehouseId) || (warehouses[0]?.id || 1),
        requisitionId: requisitionId ? Number(requisitionId) : null,
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

  const handleViewReceipt = async (id: number) => {
    try {
      const res = await api.getWarehouseReceiptDetails(id);
      if (res.success) {
        setSelectedReceipt(res.receipt);
        setIsViewOpen(true);
      }
    } catch (err) {
      console.error('Failed to load receipt details:', err);
    }
  };

  const filteredReceipts = receipts.filter(r => {
    if (searchKw) {
      const q = searchKw.toLowerCase();
      return (
        r.receipt_no?.toLowerCase().includes(q) ||
        r.supplier_name?.toLowerCase().includes(q) ||
        r.warehouse_name?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q) ||
        r.receiver_name?.toLowerCase().includes(q) ||
        r.received_by_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div id="warehouse-supply-view" className="space-y-6 pb-12" dir="rtl">
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
              التوريد للمستودعات واستلام البضائع
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            توثيق سندات استلام البضائع وتحديث رصيد المستودع تلقائياً فور الاستلام
          </p>
        </div>

        {hasRole('WAREHOUSE_KEEPER', 'PROD_MANAGER', 'ADMIN') && (
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل سند استلام وتوريد جديد</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchKw}
            onChange={(e) => setSearchKw(e.target.value)}
            placeholder="البحث برقم السند، الصنف، المورد، المستودع..."
            className="w-full text-xs pr-9 pl-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-bold">
          إجمالي سندات الاستلام: <span className="text-slate-900 font-mono">{filteredReceipts.length}</span>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-bold">رقم السند</th>
                <th className="py-3 px-4 font-bold">تاريخ الاستلام</th>
                <th className="py-3 px-4 font-bold">المستودع</th>
                <th className="py-3 px-4 font-bold">الصنف المستلم</th>
                <th className="py-3 px-4 font-bold">الكمية المستلمة</th>
                <th className="py-3 px-4 font-bold">المورد / المصدر</th>
                <th className="py-3 px-4 font-bold">أمين المستودع المستلم</th>
                <th className="py-3 px-4 font-bold">الحالة</th>
                <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    لا توجد سندات استلام مطابقة
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rec) => (
                  <tr key={`wh-rec-${rec.id}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{rec.receipt_no}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{rec.receipt_date || rec.supply_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{rec.warehouse_name}</td>
                    <td className="py-3 px-4 font-bold text-purple-900">{rec.product_name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">{rec.quantity} {rec.unit}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{rec.supplier_name}</td>
                    <td className="py-3 px-4 text-slate-600">{rec.receiver_name || rec.received_by_name}</td>
                    <td className="py-3 px-4">
                      <Badge variant="emerald">تم التوريد وزيادة المخزون</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleViewReceipt(rec.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>تفاصيل السند</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE WAREHOUSE RECEIPT */}
      <Modal
        id="modal-create-receipt"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="تسجيل سند توريد واستلام بضائع للمستودع"
        subtitle="توثيق استلام الأصناف وتحديث الأرصدة المخزنية تلقائياً"
        maxWidth="2xl"
      >
        {createError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateReceipt} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">المستودع المستلم *</label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
              >
                {warehouses.map((w) => (
                  <option key={`wh-opt-${w.id}`} value={w.id}>
                    {w.warehouse_name} ({w.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">طلب الاحتياج المرتبط (اختياري)</label>
              <select
                value={requisitionId}
                onChange={(e) => setRequisitionId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">بدون ربط (توريد مباشر/إنتاج داخلي)...</option>
                {requisitions.map((req) => (
                  <option key={`wh-req-opt-${req.id}`} value={req.id}>
                    {req.request_no} - {req.req_type} ({req.requester_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ الاستلام الفعلي *</label>
              <input
                type="date"
                required
                value={supplyDate}
                onChange={(e) => setSupplyDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">المورد أو جهة التوريد *</label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="اسم المورد أو عنبر الإنتاج"
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
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
                className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صنف آخر</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((itm, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                >
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] text-slate-500 mb-0.5">الصنف المورد *</label>
                    <select
                      value={itm.productId}
                      onChange={(e) => {
                        const pid = Number(e.target.value);
                        setItems(prev => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], productId: pid };
                          return copy;
                        });
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                    >
                      {products.map((p) => (
                        <option key={`wh-prod-opt-${p.id}`} value={p.id}>
                          {p.product_name} ({p.unit}) - الرصيد الحالي: {p.current_stock}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] text-slate-500 mb-0.5">الكمية المستلمة *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={itm.quantityReceived}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setItems(prev => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], quantityReceived: val };
                          return copy;
                        });
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold text-purple-900"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] text-slate-500 mb-0.5">رقم التشغيلة (Batch/Lot)</label>
                    <input
                      type="text"
                      value={itm.batchNumber || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems(prev => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], batchNumber: val };
                          return copy;
                        });
                      }}
                      placeholder="مثال: LOT-2026-B1"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-center justify-end">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات الفحص والاستلام الظاهري</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سلامة التغليف، مطابقة المواصفات، درجة حرارة السيارة المبردة..."
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
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {submitting ? 'جاري التوريد وزيادة المخزون...' : 'إتمام سند التوريد وتحديث الرصيد'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW RECEIPT DETAILS */}
      <Modal
        id="modal-view-receipt"
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={`سند استلام وتوريد: ${selectedReceipt?.receipt_no || ''}`}
        subtitle="توثيق حركة الإضافة المخزنية وتحديث رصيد المستودع"
        maxWidth="lg"
      >
        {selectedReceipt && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[11px]">المستودع المستلم:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.warehouse_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">المورد / الجهة:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.supplier_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ التوريد:</span>
                <span className="font-mono text-slate-800">{selectedReceipt.receipt_date || selectedReceipt.supply_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">أمين المستودع المستلم:</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.receiver_name || selectedReceipt.received_by_name}</span>
              </div>
              {selectedReceipt.notes && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">ملاحظات:</span>
                  <span className="text-slate-700">{selectedReceipt.notes}</span>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5 font-bold">#</th>
                    <th className="p-2.5 font-bold">الصنف</th>
                    <th className="p-2.5 font-bold">الكمية المضافة</th>
                    <th className="p-2.5 font-bold">رقم التشغيلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedReceipt.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{it.product_name}</td>
                      <td className="p-2.5 font-mono font-black text-purple-900">{it.quantity_received} {it.unit}</td>
                      <td className="p-2.5 font-mono text-slate-500">{it.batch_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
