import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Users,
  Package,
  AlertTriangle,
  RefreshCw,
  Phone,
  Building,
  CheckCircle,
  FileText,
  ArrowRight
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { Product, Customer } from '../types.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { formatCurrency } from '../utils/currency.js';

export const ProductsCustomersView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'customers'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New Product Form
  const [newProduct, setNewProduct] = useState({
    productCode: '',
    productName: '',
    category: 'بيض مائدة',
    unit: 'طبق',
    unitPrice: 22.0,
    initialStock: 100,
    minStockAlert: 20,
    description: ''
  });

  // New Customer Form
  const [newCustomer, setNewCustomer] = useState({
    customerCode: '',
    customerName: '',
    phone: '',
    address: '',
    commercialReg: '',
    taxNumber: '',
    customerType: 'WHOLESALE',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes] = await Promise.all([
        api.getProducts(),
        api.getCustomers()
      ]);
      if (prodRes.success) setProducts(prodRes.products);
      if (custRes.success) setCustomers(custRes.customers);
    } catch (err) {
      console.error('Failed to load products/customers data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSaving(true);
    try {
      await api.createProduct(newProduct);
      setIsProductModalOpen(false);
      setNewProduct({
        productCode: '',
        productName: '',
        category: 'بيض مائدة',
        unit: 'طبق',
        unitPrice: 22.0,
        initialStock: 100,
        minStockAlert: 20,
        description: ''
      });
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'فشل إضافة المنتج');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSaving(true);
    try {
      await api.createCustomer(newCustomer);
      setIsCustomerModalOpen(false);
      setNewCustomer({
        customerCode: '',
        customerName: '',
        phone: '',
        address: '',
        commercialReg: '',
        taxNumber: '',
        customerType: 'WHOLESALE',
        notes: ''
      });
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'فشل تسجيل العميل');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (productCategory !== 'all' && p.category !== productCategory) return false;
    if (productSearch) {
      const q = productSearch.toLowerCase();
      return p.product_name.toLowerCase().includes(q) || p.product_code.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredCustomers = customers.filter(c => {
    if (customerSearch) {
      const q = customerSearch.toLowerCase();
      return c.customer_name.toLowerCase().includes(q) || c.customer_code.toLowerCase().includes(q) || c.phone.includes(q);
    }
    return true;
  });

  return (
    <div id="products-customers-view" className="space-y-6 pb-12" dir="rtl">
      {/* Header & Tabs */}
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
              إدارة المنتجات والعملاء
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            دليل الأصناف والأسعار، مستويات المخزون وحدود الأمان، وسجل العملاء التجاريين
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>دليل المنتجات والمخزون</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'customers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>سجل العملاء</span>
          </button>
        </div>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="البحث باسم المنتج أو الكود..."
                  className="w-full text-xs pr-9 pl-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">جميع الفئات</option>
                <option value="بيض مائدة">بيض مائدة</option>
                <option value="دواجن لاحمة">دواجن لاحمة (لحوم)</option>
                <option value="كتاكيت">كتاكيت وتفريخ</option>
                <option value="مخلفات عضوية">مخلفات عضوية وأسمدة</option>
              </select>
            </div>

            {hasRole('SALES_OFFICER', 'PROD_MGR', 'ADMIN') && (
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

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-bold">كود المنتج</th>
                    <th className="py-3 px-4 font-bold">اسم المنتج</th>
                    <th className="py-3 px-4 font-bold">الفئة</th>
                    <th className="py-3 px-4 font-bold">الوحدة</th>
                    <th className="py-3 px-4 font-bold">سعر الوحدة</th>
                    <th className="py-3 px-4 font-bold">الرصيد الفعلي</th>
                    <th className="py-3 px-4 font-bold">حد الإنذار الأدنى</th>
                    <th className="py-3 px-4 font-bold">تقييم المخزون</th>
                    <th className="py-3 px-4 font-bold text-center">حالة المخزون</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const isLow = Boolean(p.is_low_stock);
                    const valuation = p.current_stock * p.unit_price;

                    return (
                      <tr key={`prod-item-${p.id}`} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.product_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{p.product_name}</td>
                        <td className="py-3 px-4 text-slate-600">{p.category}</td>
                        <td className="py-3 px-4 text-slate-500">{p.unit}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {formatCurrency(p.unit_price)}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-slate-900">
                          {p.current_stock}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.min_stock_alert}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                          {formatCurrency(valuation)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isLow ? (
                            <Badge variant="rose">تحت الحد الأدنى ⚠️</Badge>
                          ) : (
                            <Badge variant="emerald">آمن ومكتمل</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="البحث باسم العميل، الكود، أو الهاتف..."
                className="w-full text-xs pr-9 pl-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
              />
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-bold">كود العميل</th>
                    <th className="py-3 px-4 font-bold">اسم العميل / الشركة</th>
                    <th className="py-3 px-4 font-bold">الهاتف</th>
                    <th className="py-3 px-4 font-bold">العنوان</th>
                    <th className="py-3 px-4 font-bold">النوع</th>
                    <th className="py-3 px-4 font-bold">السجل التجاري</th>
                    <th className="py-3 px-4 font-bold">إجمالي الفواتير</th>
                    <th className="py-3 px-4 font-bold">حجم المشتريات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <tr key={`cust-item-${c.id}`} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.customer_code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.customer_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-500">{c.address || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge variant="slate">
                          {c.customer_type === 'WHOLESALE' ? 'جملة' : c.customer_type === 'RETAIL' ? 'تجزئة' : 'مطاعم وفنادق'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{c.commercial_reg || '-'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.total_invoices || 0}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
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
          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-3 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
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
          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم الهاتف *</label>
              <input
                type="text"
                required
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="05xxxxxxxx"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {saving ? 'جاري التسجيل...' : 'تسجيل العميل'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
