import React, { useState, useEffect } from 'react';
import {
  Package,
  Users,
  Plus,
  Search,
  AlertTriangle,
  ArrowRight,
  X,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { formatCurrency } from '../utils/format.js';

interface ProductsCustomersViewProps {
  onBack?: () => void;
}

export const ProductsCustomersView: React.FC<ProductsCustomersViewProps> = ({ onBack }) => {
  const { hasRole } = useAuth();
  const canManageProducts = hasRole('PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER', 'ADMIN');
  const canViewCustomers = hasRole('PRODUCTION_MANAGER', 'SALES_OFFICER', 'ADMIN');

  const [activeTab, setActiveTab] = useState<'products' | 'customers'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'low' | 'out'>('all');

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    productCode: '',
    productName: '',
    category: 'بيض مائدة',
    unit: 'طبق (30 بيضة)',
    unitPrice: 16.5,
    initialStock: 0,
    minStockAlert: 100,
    description: ''
  });

  const [newCustomer, setNewCustomer] = useState({
    customerCode: '',
    customerName: '',
    phone: '',
    customerType: 'WHOLESALE',
    commercialReg: '',
    taxNumber: '',
    address: ''
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, custRes] = await Promise.all([
        api.getProducts(),
        canViewCustomers ? api.getCustomers() : Promise.resolve({ success: true, customers: [] })
      ]);
      setProducts(Array.isArray(prodRes) ? prodRes : (prodRes.products || []));
      setCustomers(Array.isArray(custRes) ? custRes : (custRes.customers || []));
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل بيانات المنتجات والعملاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canViewCustomers]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSaving(true);
    try {
      await api.createProduct({
        productCode: newProduct.productCode.trim(),
        productName: newProduct.productName.trim(),
        category: newProduct.category,
        unit: newProduct.unit.trim(),
        unitPrice: Number(newProduct.unitPrice),
        currentStock: Number(newProduct.initialStock),
        minStockAlert: Number(newProduct.minStockAlert),
        description: newProduct.description.trim()
      });
      setIsProductModalOpen(false);
      setNewProduct({
        productCode: '',
        productName: '',
        category: 'بيض مائدة',
        unit: 'طبق (30 بيضة)',
        unitPrice: 16.5,
        initialStock: 0,
        minStockAlert: 100,
        description: ''
      });
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'فشل حفظ المنتج الجديد');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSaving(true);
    try {
      await api.createCustomer({
        customerCode: newCustomer.customerCode.trim(),
        customerName: newCustomer.customerName.trim(),
        phone: newCustomer.phone.trim(),
        customerType: newCustomer.customerType,
        commercialReg: newCustomer.commercialReg.trim(),
        taxNumber: newCustomer.taxNumber.trim(),
        address: newCustomer.address.trim()
      });
      setIsCustomerModalOpen(false);
      setNewCustomer({
        customerCode: '',
        customerName: '',
        phone: '',
        customerType: 'WHOLESALE',
        commercialReg: '',
        taxNumber: '',
        address: ''
      });
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'فشل تسجيل العميل الجديد');
    } finally {
      setSaving(false);
    }
  };

  const uniqueCategories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const lowStockProducts = products.filter(
    (p) => Number(p.current_stock) <= Number(p.min_stock_alert)
  );
  const outOfStockCount = products.filter((p) => Number(p.current_stock) <= 0).length;
  const availableCount = products.filter(
    (p) => Number(p.current_stock) > Number(p.min_stock_alert)
  ).length;

  const filteredProducts = products.filter((p) => {
    if (productCategory !== 'all' && p.category !== productCategory) return false;

    const currentStock = Number(p.current_stock);
    const minAlert = Number(p.min_stock_alert);
    if (stockFilter === 'available' && currentStock <= minAlert) return false;
    if (stockFilter === 'low' && currentStock > minAlert) return false;
    if (stockFilter === 'out' && currentStock > 0) return false;

    if (productSearch.trim() !== '') {
      const kw = productSearch.trim().toLowerCase();
      const hay = [
        p.product_code,
        p.product_name,
        p.category,
        p.unit,
        p.description,
        String(p.current_stock),
        String(p.unit_price)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }

    return true;
  });

  const filteredCustomers = customers.filter((c) => {
    if (customerTypeFilter !== 'all' && c.customer_type !== customerTypeFilter) return false;

    if (customerSearch.trim() !== '') {
      const kw = customerSearch.trim().toLowerCase();
      const hay = [
        c.customer_code,
        c.customer_name,
        c.phone,
        c.address,
        c.commercial_reg,
        c.tax_number,
        c.customer_type
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }

    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-500">جاري تحميل بيانات الأصناف والعملاء...</div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="رجوع"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-xl font-black text-slate-900">
              إدارة المنتجات والعملاء
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            دليل الأصناف والأسعار، مستويات المخزون وحدود الأمان، وسجل العملاء التجاريين
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>دليل المنتجات والمخزون</span>
          </button>
          {canViewCustomers && (
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'customers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>سجل العملاء</span>
            </button>
          )}
        </div>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Low Stock Alert Banner */}
          {lowStockProducts.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-black text-rose-950">
                      تنبيهات المخزون المنخفض ({lowStockProducts.length} أصناف وصلت للحد الحرج أو دونه)
                    </h3>
                    <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                      يتم مراقبة الحد الأدنى للمخزون تلقائياً وإرسال إشعارات فورية لمدير الإنتاج وأمين المخازن ومسؤول المبيعات عند انخفاض الرصيد.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
                  className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl sm:rounded-lg text-xs font-bold shrink-0 transition-colors text-center"
                >
                  {stockFilter === 'low' ? 'عرض جميع الأصناف' : `حصر الأصناف الحرجة (${lowStockProducts.length})`}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {lowStockProducts.map((lp) => {
                  const shortage = Math.max(0, Number(lp.min_stock_alert) - Number(lp.current_stock));
                  const isZero = Number(lp.current_stock) <= 0;
                  return (
                    <div
                      key={`low-banner-${lp.id}`}
                      className="bg-white border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 break-words">{lp.product_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{lp.product_code}</div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          الرصيد الفعلي:{' '}
                          <span className="font-mono font-black text-rose-700">
                            {lp.current_stock} {lp.unit}
                          </span>{' '}
                          | الحد الأدنى:{' '}
                          <span className="font-mono font-bold text-slate-800">
                            {lp.min_stock_alert} {lp.unit}
                          </span>
                        </div>
                      </div>
                      <Badge variant="rose">
                        {isZero ? 'نافد (0)' : `نقص ${shortage} ${lp.unit}`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Status Filter Pills */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            {[
              { id: 'all', label: 'جميع الأصناف', count: products.length },
              { id: 'available', label: 'آمن ومستقر', count: availableCount },
              { id: 'low', label: 'منخفض / حرج', count: lowStockProducts.length },
              { id: 'out', label: 'نافد (0)', count: outOfStockCount }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStockFilter(tab.id as any)}
                className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between sm:justify-start gap-1.5 ${
                  stockFilter === tab.id
                    ? tab.id === 'low' || tab.id === 'out'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono shrink-0 ${
                    stockFilter === tab.id
                      ? 'bg-black/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="بحث فوري باسم المنتج، الكود، الفئة، الوحدة..."
                  className="w-full text-xs pr-9 pl-8 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">جميع الفئات</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="text-xs text-slate-500 font-bold">
                النتائج: <span className="text-slate-900 font-mono">{filteredProducts.length}</span> من <span className="font-mono">{products.length}</span>
              </div>
              {canManageProducts && (
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsProductModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة منتج جديد</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Cards for Products (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400 font-medium">
                لا توجد أصناف مطابقة لمدخلات البحث أو التصفية الحالية.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isLow = Number(p.current_stock) <= Number(p.min_stock_alert);
                const isOut = Number(p.current_stock) <= 0;
                const shortage = Math.max(0, Number(p.min_stock_alert) - Number(p.current_stock));
                const valuation = Number(p.current_stock) * Number(p.unit_price);

                return (
                  <div
                    key={`prod-card-${p.id}`}
                    className={`rounded-2xl border p-4 shadow-xs space-y-3 ${
                      isLow ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-slate-900">{p.product_name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-600">{p.product_code}</span>
                          <span>•</span>
                          <span>{p.category}</span>
                        </div>
                      </div>
                      {isOut ? (
                        <Badge variant="rose">نافد (0) ⚠️</Badge>
                      ) : isLow ? (
                        <Badge variant="rose">حرج (نقص {shortage}) ⚠️</Badge>
                      ) : (
                        <Badge variant="emerald">آمن ومكتمل</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 p-3 bg-white/90 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">الرصيد الفعلي</span>
                        <span className={`font-mono font-black ${isLow ? 'text-rose-700' : 'text-slate-900'}`}>
                          {p.current_stock} {p.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">حد الإنذار الأدنى</span>
                        <span className="font-mono font-bold text-slate-700">
                          {p.min_stock_alert} {p.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">سعر الوحدة</span>
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(p.unit_price)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">تقييم المخزون</span>
                        <span className="font-mono font-black text-emerald-700">{formatCurrency(valuation)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Products Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">كود المنتج</th>
                    <th className="py-3 px-4 font-bold">اسم المنتج</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">الفئة</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">الوحدة</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">سعر الوحدة</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">الرصيد الفعلي</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">حد الإنذار الأدنى</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">تقييم المخزون</th>
                    <th className="py-3 px-4 font-bold text-center whitespace-nowrap">حالة المخزون</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        لا توجد أصناف مطابقة لمدخلات البحث أو التصفية الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = Number(p.current_stock) <= Number(p.min_stock_alert);
                      const isOut = Number(p.current_stock) <= 0;
                      const shortage = Math.max(0, Number(p.min_stock_alert) - Number(p.current_stock));
                      const valuation = p.current_stock * p.unit_price;

                      return (
                        <tr
                          key={`prod-item-${p.id}`}
                          className={`transition-colors ${
                            isLow ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{p.product_code}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{p.product_name}</td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{p.category}</td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{p.unit}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {formatCurrency(p.unit_price)}
                          </td>
                          <td className={`py-3 px-4 font-mono font-black whitespace-nowrap ${isLow ? 'text-rose-700' : 'text-slate-900'}`}>
                            {p.current_stock}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{p.min_stock_alert}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {formatCurrency(valuation)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isOut ? (
                              <Badge variant="rose">نافد من المخزون (0) ⚠️</Badge>
                            ) : isLow ? (
                              <Badge variant="rose">
                                حرج (نقص {shortage} {p.unit}) ⚠️
                              </Badge>
                            ) : (
                              <Badge variant="emerald">آمن ومكتمل</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="بحث فوري باسم العميل، الكود، الهاتف، العنوان..."
                  className="w-full text-xs pr-9 pl-8 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <select
                value={customerTypeFilter}
                onChange={(e) => setCustomerTypeFilter(e.target.value)}
                className="text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">جميع فئات العملاء</option>
                <option value="WHOLESALE">تجار جملة وتوزيع (WHOLESALE)</option>
                <option value="RETAIL">تجزئة ومطاعم (RETAIL)</option>
              </select>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="text-xs text-slate-500 font-bold">
                النتائج: <span className="text-slate-900 font-mono">{filteredCustomers.length}</span> من <span className="font-mono">{customers.length}</span>
              </div>
              {hasRole('SALES_OFFICER', 'ADMIN') && (
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsCustomerModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل عميل جديد</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Cards for Customers (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400 font-medium">
                لا يوجد عملاء مطابقون لمدخلات البحث أو التصفية.
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={`cust-card-${c.id}`}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-slate-900">{c.customer_name}</div>
                      <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                        {c.customer_code}
                      </div>
                    </div>
                    <Badge variant="slate">
                      {c.customer_type === 'WHOLESALE' ? 'جملة' : c.customer_type === 'RETAIL' ? 'تجزئة' : 'مطاعم وفنادق'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> الهاتف:
                      </span>
                      <span className="font-mono font-bold text-slate-800" dir="ltr">{c.phone}</span>
                    </div>
                    {c.address && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 flex items-center gap-1 shrink-0">
                          <MapPin className="w-3.5 h-3.5" /> العنوان:
                        </span>
                        <span className="font-medium text-slate-700 truncate">{c.address}</span>
                      </div>
                    )}
                    {c.commercial_reg && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> السجل التجاري:
                        </span>
                        <span className="font-mono text-slate-700">{c.commercial_reg}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div>
                      <span className="text-slate-400">إجمالي الفواتير: </span>
                      <span className="font-mono font-bold text-slate-800">{c.total_invoices || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">حجم المشتريات: </span>
                      <span className="font-mono font-black text-emerald-700">{formatCurrency(c.total_sales || 0)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Customers Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">كود العميل</th>
                    <th className="py-3 px-4 font-bold">اسم العميل / الشركة</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">الهاتف</th>
                    <th className="py-3 px-4 font-bold">العنوان</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">النوع</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">السجل التجاري</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">إجمالي الفواتير</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">حجم المشتريات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <tr key={`cust-item-${c.id}`} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{c.customer_code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.customer_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap" dir="ltr">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-500">{c.address || '-'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="slate">
                          {c.customer_type === 'WHOLESALE' ? 'جملة' : c.customer_type === 'RETAIL' ? 'تجزئة' : 'مطاعم وفنادق'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{c.commercial_reg || '-'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">{c.total_invoices || 0}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {formatCurrency(c.total_sales || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Product */}
      <Modal
        id="modal-add-product"
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="إضافة منتج تجاري جديد"
        subtitle="توثيق بيانات الصنف، فئته، وسعر الوحدة، ورصيد البداية"
        maxWidth="lg"
      >
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
            {modalError}
          </div>
        )}

        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">كود المنتج *</label>
              <input
                type="text"
                required
                value={newProduct.productCode}
                onChange={(e) => setNewProduct({ ...newProduct, productCode: e.target.value })}
                placeholder="مثال: PRD-EGG-02"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم المنتج *</label>
              <input
                type="text"
                required
                value={newProduct.productName}
                onChange={(e) => setNewProduct({ ...newProduct, productName: e.target.value })}
                placeholder="مثال: بيض مائدة أبيض وسط"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">الفئة *</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="بيض مائدة">بيض مائدة</option>
                <option value="دواجن لاحمة">دواجن لاحمة</option>
                <option value="كتاكيت">كتاكيت</option>
                <option value="مخلفات عضوية">مخلفات عضوية</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">وحدة القياس *</label>
              <input
                type="text"
                required
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                placeholder="طبق / طائر / كجم"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">سعر الوحدة (ر.ي) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newProduct.unitPrice}
                onChange={(e) => setNewProduct({ ...newProduct, unitPrice: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رصيد المخزون الافتتاحي</label>
              <input
                type="number"
                min="0"
                value={newProduct.initialStock}
                onChange={(e) => setNewProduct({ ...newProduct, initialStock: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">حد الإنذار الأدنى (Low Stock Alert)</label>
              <input
                type="number"
                min="1"
                value={newProduct.minStockAlert}
                onChange={(e) => setNewProduct({ ...newProduct, minStockAlert: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">الوصف والمواصفات</label>
            <textarea
              rows={2}
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 sm:py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ المنتج'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Customer */}
      <Modal
        id="modal-add-customer"
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="تسجيل عميل جديد"
        subtitle="توثيق بيانات العميل، السجل التجاري والرقم الضريبي للتكامل مع الفواتير"
        maxWidth="lg"
      >
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
            {modalError}
          </div>
        )}

        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">كود العميل *</label>
              <input
                type="text"
                required
                value={newCustomer.customerCode}
                onChange={(e) => setNewCustomer({ ...newCustomer, customerCode: e.target.value })}
                placeholder="مثال: CUST-005"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم العميل / المنشأة *</label>
              <input
                type="text"
                required
                value={newCustomer.customerName}
                onChange={(e) => setNewCustomer({ ...newCustomer, customerName: e.target.value })}
                placeholder="مثال: شركة تموين الرياض الغذائية"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم الهاتف *</label>
              <input
                type="text"
                required
                dir="ltr"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="05xxxxxxxx"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono text-left"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">نوع العميل</label>
              <select
                value={newCustomer.customerType}
                onChange={(e) => setNewCustomer({ ...newCustomer, customerType: e.target.value as any })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="WHOLESALE">تاجر جملة وموزع</option>
                <option value="RETAIL">سوبرماركت وتجزئة</option>
                <option value="HORECA">مطاعم وفنادق وإعاشة</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم السجل التجاري</label>
              <input
                type="text"
                value={newCustomer.commercialReg}
                onChange={(e) => setNewCustomer({ ...newCustomer, commercialReg: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">الرقم الضريبي (VAT)</label>
              <input
                type="text"
                value={newCustomer.taxNumber}
                onChange={(e) => setNewCustomer({ ...newCustomer, taxNumber: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">العنوان الوطني وموقع التسليم</label>
            <input
              type="text"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="px-4 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 sm:py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {saving ? 'جاري التسجيل...' : 'تسجيل العميل'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
