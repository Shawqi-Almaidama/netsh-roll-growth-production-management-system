import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Package,
  Pill,
  Wheat,
  Layers,
  FileCheck2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { Requisition, RequisitionType, RequisitionStatus, RequisitionItem, House, Farm, Flock } from '../types.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';

interface RequisitionsViewProps {
  initialTab?: 'list' | 'create' | 'review';
  onBack?: () => void;
}

export const RequisitionsView: React.FC<RequisitionsViewProps> = ({ initialTab = 'list', onBack }) => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>(initialTab === 'create' ? 'create' : 'list');
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States - if initialTab is 'review', pre-filter to SUBMITTED
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(initialTab === 'review' ? 'SUBMITTED' : 'all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Selected Requisition Details Modal
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Create Form State
  const [farms, setFarms] = useState<Farm[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [feedCatalog, setFeedCatalog] = useState<any[]>([]);
  const [treatmentCatalog, setTreatmentCatalog] = useState<any[]>([]);
  const [supplyCatalog, setSupplyCatalog] = useState<any[]>([]);

  const [createType, setCreateType] = useState<RequisitionType>('FEED');
  const [farmId, setFarmId] = useState<string>('');
  const [houseId, setHouseId] = useState<string>('');
  const [flockId, setFlockId] = useState<string>('');
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH' | 'EMERGENCY'>('NORMAL');
  const [notes, setNotes] = useState<string>('');

  // Multi-items list for the request (Header -> Items 1:N)
  const [items, setItems] = useState<RequisitionItem[]>([
    { itemName: '', quantity: 1, unit: 'كجم', specifications: '' }
  ]);

  const [createFeedback, setCreateFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, farmsRes, housesRes, flocksRes, feedRes, treatRes, suppRes] = await Promise.all([
        api.getRequisitions(),
        api.getFarms(),
        api.getHouses(),
        api.getFlocks(),
        api.getFeedCatalog(),
        api.getTreatmentCatalog(),
        api.getSupplyCatalog()
      ]);

      if (reqRes.success) {
        const uniqueReqs = Array.from(new Map((reqRes.requisitions || []).map((r: any) => [r.id, r])).values());
        setRequisitions(uniqueReqs);
      }
      if (farmsRes.success) setFarms(farmsRes.farms);
      if (housesRes.success) {
        const uniqueHouses = Array.from(new Map((housesRes.houses || []).map((h: any) => [h.id, h])).values());
        setHouses(uniqueHouses);
      }
      if (flocksRes.success) setFlocks(flocksRes.flocks);
      if (feedRes.success) setFeedCatalog(feedRes.items);
      if (treatRes.success) setTreatmentCatalog(treatRes.items);
      if (suppRes.success) setSupplyCatalog(suppRes.items);
    } catch (err) {
      console.error('Error loading requisitions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When type changes, prefill appropriate unit and sample item
  const handleTypeChange = (newType: RequisitionType) => {
    setCreateType(newType);
    if (newType === 'CHICKS') {
      setItems([{ itemName: 'كتاكيت بياض سلالة لوهمان براون', quantity: 10000, unit: 'طائر', specifications: 'عمر يوم واحد، ملقحة ماريك وجمبورو' }]);
    } else if (newType === 'FEED') {
      setItems([{ itemName: feedCatalog[0]?.item_name || 'علف نامي دواجن 21%', quantity: 5000, unit: 'كجم', specifications: 'معبأ بأكياس 50 كجم' }]);
    } else if (newType === 'TREATMENT') {
      setItems([{ itemName: treatmentCatalog[0]?.item_name || 'إنروفلوكساسين 20%', quantity: 10, unit: 'لتر', specifications: 'للإعطاء عبر مياه الشرب' }]);
    } else {
      setItems([{ itemName: supplyCatalog[0]?.item_name || 'فرشة نشارة خشب معقمة', quantity: 100, unit: 'بالة', specifications: 'معقمة خالية من الرطوبة والشوائب' }]);
    }
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { itemName: '', quantity: 1, unit: createType === 'CHICKS' ? 'طائر' : createType === 'FEED' ? 'كجم' : 'عبوة', specifications: '' }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemFieldChange = (index: number, field: keyof RequisitionItem, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);
    setCreating(true);

    try {
      const res = await api.createRequisition({
        reqType: createType,
        farmId: farmId ? Number(farmId) : null,
        houseId: houseId ? Number(houseId) : null,
        flockId: flockId ? Number(flockId) : null,
        requestDate,
        urgency,
        notes,
        items
      });

      if (res.success) {
        setCreateFeedback({
          type: 'success',
          message: `${res.message}. تم إرسال إشعار فوري لمدير الإنتاج للمراجعة والاعتماد.`
        });
        await loadData();
        setActiveTab('list');
      }
    } catch (err: any) {
      setCreateFeedback({
        type: 'error',
        message: err.message || 'فشل حفظ طلب الاحتياج'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDetails = async (id: number) => {
    try {
      const res = await api.getRequisitionDetails(id);
      if (res.success) {
        setSelectedReq(res.requisition);
        setReviewNotes(res.requisition.review_notes || '');
        setIsDetailsOpen(true);
      }
    } catch (err) {
      console.error('Failed to load requisition details:', err);
    }
  };

  const handleReviewDecision = async (decision: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED') => {
    if (!selectedReq) return;
    setReviewing(true);
    try {
      const res = await api.reviewRequisition(selectedReq.id, {
        decision,
        reviewNotes
      });
      if (res.success) {
        setIsDetailsOpen(false);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'فشلت عملية المراجعة');
    } finally {
      setReviewing(false);
    }
  };

  const statusArabic: Record<string, { label: string; variant: 'slate' | 'amber' | 'blue' | 'emerald' | 'rose' }> = {
    DRAFT: { label: 'مسودة', variant: 'slate' },
    SUBMITTED: { label: 'مُقدّم بانتظار المراجعة', variant: 'amber' },
    UNDER_REVIEW: { label: 'قيد المراجعة الفنية', variant: 'blue' },
    APPROVED: { label: 'معتمد رسمياً', variant: 'emerald' },
    REJECTED: { label: 'مرفوض', variant: 'rose' },
    COMPLETED: { label: 'تم التوريد والاكتمال', variant: 'emerald' }
  };

  const typeArabic: Record<string, { label: string; icon: any }> = {
    CHICKS: { label: 'طلب كتاكيت', icon: Layers },
    FEED: { label: 'طلب أعلاف', icon: Wheat },
    TREATMENT: { label: 'طلب علاجات وتحصينات', icon: Pill },
    SUPPLY: { label: 'طلب مستلزمات ومطهرات', icon: Package }
  };

  const filteredRequisitions = requisitions.filter(r => {
    if (typeFilter !== 'all' && r.req_type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      const matchNo = r.request_no?.toLowerCase().includes(kw);
      const matchReq = r.requester_name?.toLowerCase().includes(kw);
      const matchNotes = r.notes?.toLowerCase().includes(kw);
      if (!matchNo && !matchReq && !matchNotes) return false;
    }
    return true;
  });

  return (
    <div id="requisitions-view" className="space-y-6 pb-12" dir="rtl">
      {/* Header & Tabs Switcher */}
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
              دورة طلبات الاحتياج التشغيلية
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة طلبات الكتاكيت، الأعلاف، العلاجات، والمستلزمات مع منظومة الاعتماد ومراجعة مدير الإنتاج
          </p>
        </div>

        {/* View Tabs Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل ومتابعة الطلبات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تقديم طلب جديد</span>
          </button>
        </div>
      </div>

      {createFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
            createFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {createFeedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{createFeedback.message}</span>
        </div>
      )}

      {/* TAB 1: LIST & REVIEW (UI-08) */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="البحث برقم الطلب، اسم المشرف، الملاحظات..."
                className="w-full text-xs pr-9 pl-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">النوع:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">جميع الأنواع</option>
                <option value="CHICKS">كتاكيت (CHICKS)</option>
                <option value="FEED">أعلاف (FEED)</option>
                <option value="TREATMENT">علاجات (TREATMENT)</option>
                <option value="SUPPLY">مستلزمات (SUPPLY)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">الحالة:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">جميع الحالات</option>
                <option value="SUBMITTED">مُقدّم (SUBMITTED)</option>
                <option value="UNDER_REVIEW">قيد المراجعة (UNDER_REVIEW)</option>
                <option value="APPROVED">معتمد (APPROVED)</option>
                <option value="REJECTED">مرفوض (REJECTED)</option>
                <option value="COMPLETED">مكتمل (COMPLETED)</option>
              </select>
            </div>
          </div>

          {/* Requisitions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-bold">رقم الطلب</th>
                    <th className="py-3 px-4 font-bold">نوع الطلب</th>
                    <th className="py-3 px-4 font-bold">المشرف / مقدم الطلب</th>
                    <th className="py-3 px-4 font-bold">الموقع (الهنجر والمزرعة)</th>
                    <th className="py-3 px-4 font-bold">عدد البنود</th>
                    <th className="py-3 px-4 font-bold">التاريخ</th>
                    <th className="py-3 px-4 font-bold">الأهمية</th>
                    <th className="py-3 px-4 font-bold">الحالة الحالية</th>
                    <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequisitions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        لا توجد طلبات مطابقة لمعايير البحث
                      </td>
                    </tr>
                  ) : (
                    filteredRequisitions.map((req) => {
                      const typeObj = typeArabic[req.req_type] || { label: req.req_type, icon: ClipboardList };
                      const TypeIcon = typeObj.icon;
                      const statusObj = statusArabic[req.status] || { label: req.status, variant: 'slate' };

                      return (
                        <tr key={`req-row-${req.id}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {req.request_no}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="font-semibold text-slate-800">{typeObj.label.split(' ')[1]}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {req.requester_name}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {req.house_name ? `${req.house_name} (${req.farm_name})` : req.farm_name || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {req.items_count || 1} بنود
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {req.request_date}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              req.urgency === 'EMERGENCY'
                                ? 'bg-rose-100 text-rose-800'
                                : req.urgency === 'HIGH'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {req.urgency === 'EMERGENCY' ? 'طوارئ' : req.urgency === 'HIGH' ? 'عاجل' : 'عادي'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={statusObj.variant}>{statusObj.label}</Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(req.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span>مراجعة وتفاصيل</span>
                            </button>
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

      {/* TAB 2: CREATE REQUISITION FORM (UI-04..07) */}
      {activeTab === 'create' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                تقديم طلب احتياج تشغيلي جديد
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد نوع الطلب، الموقع المستهدف، وقائمة البنود والكميات المطلوبة
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>الرجوع لقائمة الطلبات</span>
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-6 text-xs">
            {/* Step 1: Type Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-2">نوع الطلب التشغيلي *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { type: 'CHICKS' as RequisitionType, title: 'طلب كتاكيت', icon: Layers, desc: 'سلالات التسمين والبياض' },
                  { type: 'FEED' as RequisitionType, title: 'طلب أعلاف', icon: Wheat, desc: 'أعلاف بادي ونامي وناهي' },
                  { type: 'TREATMENT' as RequisitionType, title: 'طلب علاجات', icon: Pill, desc: 'تحصينات وفيتامينات ومضادات' },
                  { type: 'SUPPLY' as RequisitionType, title: 'مستلزمات تشغيل', icon: Package, desc: 'فرشات نشارة ومطهرات وأدوات' }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = createType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleTypeChange(item.type)}
                      className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                        isSel
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold text-xs ${isSel ? 'text-emerald-900' : 'text-slate-900'}`}>
                          {item.title}
                        </span>
                        <Icon className={`w-4 h-4 ${isSel ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Location & Header Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المزرعة *</label>
                <select
                  value={farmId}
                  onChange={(e) => setFarmId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">اختر المزرعة...</option>
                  {farms.map((f) => (
                    <option key={`req-farm-${f.id}`} value={f.id}>{f.farm_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الهنجر المستهدف</label>
                <select
                  value={houseId}
                  onChange={(e) => setHouseId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">جميع الهناجر أو عام...</option>
                  {houses.map((h) => (
                    <option key={`req-house-${h.id}`} value={h.id}>{h.house_name} ({h.house_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ الطلب *</label>
                <input
                  type="date"
                  required
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">درجة الأهمية والاستعجال</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="NORMAL">عادي (اعتيادي)</option>
                  <option value="HIGH">عاجل (خلال 24 ساعة)</option>
                  <option value="EMERGENCY">طوارئ فورية (أزمة تشغيلية)</option>
                </select>
              </div>
            </div>

            {/* Step 3: Multi-line Items Builder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="font-bold text-slate-900 text-xs">
                    بنود الطلب والكميات المطلوبة *
                  </label>
                  <p className="text-[11px] text-slate-400">
                    يجب إضافة بند واحد على الأقل مع تحديد الكمية والمواصفات الفنية
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند آخر</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-1 text-center font-bold text-slate-400">
                      #{idx + 1}
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[10px] text-slate-500 mb-0.5">اسم المادة / الصنف المطلوب *</label>
                      <input
                        type="text"
                        required
                        value={item.itemName}
                        onChange={(e) => handleItemFieldChange(idx, 'itemName', e.target.value)}
                        placeholder="مثال: علف نامي، فيتامين هـ سلينيوم، نشارة خشب..."
                        className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 mb-0.5">الكمية المطلوبة *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 mb-0.5">الوحدة *</label>
                      <input
                        type="text"
                        required
                        value={item.unit}
                        onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف هذا البند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="sm:col-span-12">
                      <input
                        type="text"
                        value={item.specifications || ''}
                        onChange={(e) => handleItemFieldChange(idx, 'specifications', e.target.value)}
                        placeholder="مواصفات إضافية (التركيز، الشركة المصنعة، طريقة التعبئة...)"
                        className="w-full p-1.5 text-[11px] border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">مبررات الطلب وملاحظات المشرف</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أسباب الاحتياج الحالي، خطة الاستهلاك، أي اشتراطات بيطرية..."
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {creating ? 'جاري الإرسال والتوثيق...' : 'إرسال الطلب للاعتماد'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: REQUISITION REVIEW & DETAILS */}
      <Modal
        id="modal-req-details"
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`مراجعة طلب الاحتياج: ${selectedReq?.request_no || ''}`}
        subtitle="تدقيق بيانات الطلب، قائمة البنود، واتخاذ قرار المراجعة والاعتماد"
        maxWidth="2xl"
      >
        {selectedReq && (
          <div className="space-y-5 text-xs">
            {/* Header Details Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px]">مقدم الطلب:</span>
                <span className="font-bold text-slate-800">{selectedReq.requester_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">نوع الطلب:</span>
                <span className="font-bold text-emerald-800">{selectedReq.req_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ التقديم:</span>
                <span className="font-mono text-slate-800">{selectedReq.request_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الحالة الراهنة:</span>
                <Badge variant={statusArabic[selectedReq.status]?.variant || 'slate'}>
                  {statusArabic[selectedReq.status]?.label || selectedReq.status}
                </Badge>
              </div>
            </div>

            {/* Items List */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">قائمة البنود المطلوبة:</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 text-slate-700 text-[11px]">
                    <tr>
                      <th className="p-2.5 font-bold">#</th>
                      <th className="p-2.5 font-bold">اسم المادة</th>
                      <th className="p-2.5 font-bold">الكمية</th>
                      <th className="p-2.5 font-bold">الوحدة</th>
                      <th className="p-2.5 font-bold">المواصفات الفنية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReq.items?.map((itm, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{itm.itemName || itm.item_name}</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-800">{itm.quantity}</td>
                        <td className="p-2.5 text-slate-600">{itm.unit}</td>
                        <td className="p-2.5 text-slate-500">{itm.specifications || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedReq.notes && (
              <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
                <span className="font-bold block text-slate-700">ملاحظات مقدم الطلب:</span>
                {selectedReq.notes}
              </div>
            )}

            {/* Review Decision Panel (Only for PROD_MGR & ADMIN) */}
            {hasRole('PROD_MGR', 'ADMIN') && (
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-700" />
                  <h4 className="font-bold text-emerald-950">
                    لوحة قرار مدير إدارة الإنتاج
                  </h4>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ملاحظات المراجعة الفنية والتوجيهات *
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="سبب القبول أو الرفض، التوجيه بالصرف، الكمية المعتمدة..."
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <span className="text-[11px] text-slate-500">
                    سيتم إشعار مقدم الطلب فورياً بنتيجة القرار عبر نظام الإشعارات الداخلي
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={reviewing}
                      onClick={() => handleReviewDecision('UNDER_REVIEW')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                    >
                      بدء المراجعة
                    </button>
                    <button
                      type="button"
                      disabled={reviewing}
                      onClick={() => handleReviewDecision('APPROVED')}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-xs transition-colors"
                    >
                      اعتماد الطلب
                    </button>
                    <button
                      type="button"
                      disabled={reviewing}
                      onClick={() => handleReviewDecision('REJECTED')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors"
                    >
                      رفض الطلب
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
