import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Eye,
  CheckCircle,
  Trash2,
  Package,
  Pill,
  Wheat,
  Layers,
  FileCheck2,
  AlertCircle,
  ArrowRight,
  Download,
  X
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Requisition,
  RequisitionType,
  RequisitionItem,
  House,
  Farm,
  Flock
} from '../types.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { DateInput } from '../components/ui/DateInput.js';
import { exportRequisitionPDF } from '../utils/pdfExport.js';
import { getLocalTodayDateString } from '../utils/date.js';

interface RequisitionsViewProps {
  initialTab?: 'list' | 'create' | 'review';
  onBack?: () => void;
}

export const RequisitionsView: React.FC<RequisitionsViewProps> = ({
  initialTab = 'list',
  onBack
}) => {
  const { user, hasRole } = useAuth();
  const canCreate = hasRole('SUPERVISOR', 'ADMIN');
  const [activeTab, setActiveTab] = useState<'list' | 'create'>(
    initialTab === 'create' && canCreate ? 'create' : 'list'
  );
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [pdfExportingId, setPdfExportingId] = useState<number | null>(null);

  useEffect(() => {
    if (initialTab === 'create' && canCreate) {
      setActiveTab('create');
    } else {
      setActiveTab('list');
    }
  }, [initialTab, canCreate]);

  // Selected Requisition Details Modal
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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
  const [requestDate, setRequestDate] = useState<string>(getLocalTodayDateString());
  const [requestDateValid, setRequestDateValid] = useState<boolean>(true);
  const [requestDateError, setRequestDateError] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH' | 'EMERGENCY'>('NORMAL');
  const [notes, setNotes] = useState<string>('');

  // Multi-items list for the request (Header -> Items 1:N)
  const [items, setItems] = useState<RequisitionItem[]>([
    { itemName: '', quantity: 1, unit: 'كجم', specifications: '' }
  ]);

  const [createFeedback, setCreateFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, farmsRes, housesRes, flocksRes, feedRes, treatRes, suppRes] =
        await Promise.all([
          api.getRequisitions(),
          api.getFarms(),
          api.getHouses(),
          api.getFlocks(),
          api.getFeedCatalog(),
          api.getTreatmentCatalog(),
          api.getSupplyCatalog()
        ]);

      if (reqRes.success) {
        const uniqueReqs = Array.from(
          new Map((reqRes.requisitions || []).map((r: any) => [r.id, r])).values()
        );
        setRequisitions(uniqueReqs);
      }
      if (farmsRes.success) setFarms(farmsRes.farms);
      if (housesRes.success) {
        const uniqueHouses = Array.from(
          new Map((housesRes.houses || []).map((h: any) => [h.id, h])).values()
        );
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

  const handleTypeChange = (newType: RequisitionType) => {
    setCreateType(newType);
    if (newType === 'CHICKS') {
      setItems([
        {
          itemName: 'كتاكيت بياض سلالة لوهمان براون',
          quantity: 10000,
          unit: 'طائر',
          specifications: 'عمر يوم واحد، ملقحة ماريك وجمبورو'
        }
      ]);
    } else if (newType === 'FEED') {
      setItems([
        {
          itemName: feedCatalog[0]?.item_name || 'علف نامي دواجن 21%',
          quantity: 5000,
          unit: 'كجم',
          specifications: 'معبأ بأكياس 50 كجم'
        }
      ]);
    } else if (newType === 'TREATMENT') {
      setItems([
        {
          itemName: treatmentCatalog[0]?.item_name || 'إنروفلوكساسين 20%',
          quantity: 10,
          unit: 'لتر',
          specifications: 'للإعطاء عبر مياه الشرب'
        }
      ]);
    } else {
      setItems([
        {
          itemName: supplyCatalog[0]?.item_name || 'فرشة نشارة خشب معقمة',
          quantity: 100,
          unit: 'بالة',
          specifications: 'معقمة خالية من الرطوبة والشوائب'
        }
      ]);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemName: '',
        quantity: 1,
        unit: createType === 'CHICKS' ? 'طائر' : createType === 'FEED' ? 'كجم' : 'عبوة',
        specifications: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemFieldChange = (index: number, field: keyof RequisitionItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);

    if (!requestDateValid || !requestDate) {
      setCreateFeedback({
        type: 'error',
        message: requestDateError || 'يرجى إدخال تاريخ الطلب بشكل صحيح ومكتمل.'
      });
      return;
    }

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
      setReviewError(null);
      const res = await api.getRequisitionDetails(id);
      if (res.success) {
        setSelectedReq(res.requisition);
        setReviewNotes(res.requisition.review_notes || '');
        setIsDetailsOpen(true);
      }
    } catch (err: any) {
      setCreateFeedback({
        type: 'error',
        message: err.message || 'تعذر تحميل تفاصيل الطلب'
      });
    }
  };

  const handleSubmitDraft = async () => {
    if (!selectedReq) return;
    setReviewing(true);
    setReviewError(null);
    try {
      const res = await api.submitRequisition(selectedReq.id);
      if (res.success) {
        setCreateFeedback({
          type: 'success',
          message: res.message || `تم إرسال الطلب (${selectedReq.request_no}) للمراجعة بنجاح.`
        });
        setIsDetailsOpen(false);
        await loadData();
      }
    } catch (err: any) {
      setReviewError(err.message || 'فشل إرسال المسودة للمراجعة');
    } finally {
      setReviewing(false);
    }
  };

  const handleReviewDecision = async (
    decision: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  ) => {
    if (!selectedReq) return;
    setReviewError(null);

    if (decision === 'REJECTED' && !reviewNotes.trim()) {
      setReviewError('يرجى كتابة سبب رفض الطلب في حقل ملاحظات المراجعة قبل تأكيد الرفض');
      return;
    }

    setReviewing(true);
    try {
      const res = await api.reviewRequisition(selectedReq.id, {
        decision,
        reviewNotes
      });
      if (res.success) {
        setCreateFeedback({
          type: 'success',
          message: res.message || `تم تحديث حالة الطلب (${selectedReq.request_no}) بنجاح.`
        });
        setIsDetailsOpen(false);
        await loadData();
      }
    } catch (err: any) {
      setReviewError(err.message || 'فشلت عملية المراجعة');
    } finally {
      setReviewing(false);
    }
  };

  const statusArabic: Record<
    string,
    { label: string; variant: 'slate' | 'amber' | 'blue' | 'emerald' | 'rose' }
  > = {
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

  const statusCounts = {
    all: requisitions.length,
    DRAFT: requisitions.filter((r) => r.status === 'DRAFT').length,
    SUBMITTED: requisitions.filter((r) => r.status === 'SUBMITTED').length,
    UNDER_REVIEW: requisitions.filter((r) => r.status === 'UNDER_REVIEW').length,
    APPROVED: requisitions.filter((r) => r.status === 'APPROVED').length,
    REJECTED: requisitions.filter((r) => r.status === 'REJECTED').length,
    COMPLETED: requisitions.filter((r) => r.status === 'COMPLETED').length
  };

  const handleExportReqPDF = async (id: number) => {
    try {
      setPdfExportingId(id);
      if (selectedReq && selectedReq.id === id && selectedReq.items) {
        await exportRequisitionPDF(selectedReq, user?.fullName);
      } else {
        const res = await api.getRequisitionDetails(id);
        if (res.success && res.requisition) {
          await exportRequisitionPDF(res.requisition, user?.fullName);
        }
      }
    } catch (err) {
      console.error('Failed to export requisition PDF:', err);
    } finally {
      setPdfExportingId(null);
    }
  };

  const filteredRequisitions = requisitions.filter((r) => {
    if (typeFilter !== 'all' && r.req_type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (urgencyFilter !== 'all' && r.urgency !== urgencyFilter) return false;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const matchNo = r.request_no?.toLowerCase().includes(kw);
      const matchReq = r.requester_name?.toLowerCase().includes(kw);
      const matchHouse = r.house_name?.toLowerCase().includes(kw);
      const matchFarm = r.farm_name?.toLowerCase().includes(kw);
      const matchFlock = r.flock_code?.toLowerCase().includes(kw);
      const matchDate = r.request_date?.toLowerCase().includes(kw);
      const matchNotes = r.notes?.toLowerCase().includes(kw);
      const matchRevNotes = r.review_notes?.toLowerCase().includes(kw);
      if (
        !matchNo &&
        !matchReq &&
        !matchHouse &&
        !matchFarm &&
        !matchFlock &&
        !matchDate &&
        !matchNotes &&
        !matchRevNotes
      )
        return false;
    }
    return true;
  });

  return (
    <div id="requisitions-view" className="space-y-6 pb-12" dir="rtl">
      {/* Header & Tabs Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
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
              دورة طلبات الاحتياج التشغيلية
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة طلبات الكتاكيت، الأعلاف، العلاجات، والمستلزمات مع منظومة الاعتماد ومراجعة مدير الإنتاج
          </p>
        </div>

        {/* View Tabs Buttons */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3 sm:px-4 py-2.5 rounded-lg text-xs font-bold transition-all min-h-[40px] ${
              activeTab === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل الطلبات ({requisitions.length})
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-xs font-bold transition-all min-h-[40px] ${
                activeTab === 'create'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>تقديم طلب جديد</span>
            </button>
          )}
        </div>
      </div>

      {createFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
            createFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {createFeedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{createFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setCreateFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* TAB 1: LIST & REVIEW */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Quick Status Filter Tabs with Counters */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            {[
              { id: 'all', label: 'الكل', count: statusCounts.all },
              { id: 'DRAFT', label: 'مسودة', count: statusCounts.DRAFT },
              { id: 'SUBMITTED', label: 'مقدمة', count: statusCounts.SUBMITTED },
              { id: 'UNDER_REVIEW', label: 'قيد المراجعة', count: statusCounts.UNDER_REVIEW },
              { id: 'APPROVED', label: 'معتمدة', count: statusCounts.APPROVED },
              { id: 'REJECTED', label: 'مرفوضة', count: statusCounts.REJECTED },
              { id: 'COMPLETED', label: 'مكتملة', count: statusCounts.COMPLETED }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 min-h-[36px] ${
                  statusFilter === st.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{st.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    statusFilter === st.id
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {st.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="بحث فوري برقم الطلب، المشرف، الهنجر، القطيع، الملاحظات..."
                  className="w-full text-xs pr-9 pl-8 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-xs py-2.5 px-3 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:border-emerald-600 min-h-[40px]"
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="CHICKS">طلب كتاكيت</option>
                  <option value="FEED">طلب أعلاف</option>
                  <option value="TREATMENT">طلب علاجات</option>
                  <option value="SUPPLY">طلب مستلزمات</option>
                </select>

                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="text-xs py-2.5 px-3 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:border-emerald-600 min-h-[40px]"
                >
                  <option value="all">جميع درجات الأهمية</option>
                  <option value="HIGH">عاجل (HIGH)</option>
                  <option value="NORMAL">عادي (NORMAL)</option>
                  <option value="LOW">منخفض (LOW)</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-bold shrink-0">
              النتائج المعروضة:{' '}
              <span className="text-slate-900 font-mono">{filteredRequisitions.length}</span> من{' '}
              <span className="font-mono">{requisitions.length}</span>
            </div>
          </div>

          {/* Requisitions Data: Mobile Cards + Desktop Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredRequisitions.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs font-medium">
                  لا توجد طلبات مطابقة للفلتر الحالي.
                </div>
              ) : (
                filteredRequisitions.map((req) => {
                  const typeObj = typeArabic[req.req_type] || {
                    label: req.req_type,
                    icon: ClipboardList
                  };
                  const TypeIcon = typeObj.icon;
                  const statusObj = statusArabic[req.status] || {
                    label: req.status,
                    variant: 'slate'
                  };

                  return (
                    <div key={`req-card-${req.id}`} className="p-4 space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {req.request_no}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                req.urgency === 'EMERGENCY'
                                  ? 'bg-rose-100 text-rose-800'
                                  : req.urgency === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {req.urgency === 'EMERGENCY'
                                ? 'طوارئ'
                                : req.urgency === 'HIGH'
                                ? 'عاجل'
                                : 'عادي'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold mt-1">
                            <TypeIcon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{typeObj.label}</span>
                          </div>
                        </div>
                        <Badge variant={statusObj.variant}>{statusObj.label}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">مقدم الطلب:</span>
                          <span className="font-bold text-slate-800">{req.requester_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">الموقع / الهنجر:</span>
                          <span className="font-semibold text-slate-700">
                            {req.house_name
                              ? `${req.house_name} (${req.farm_name})`
                              : req.farm_name || 'عام للمزرعة'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">عدد البنود:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {req.items_count || 1} بنود
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">تاريخ الطلب:</span>
                          <span className="font-mono font-semibold text-slate-700" dir="ltr">
                            {req.request_date}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(req.id)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors min-h-[40px]"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                          <span>تفاصيل ومراجعة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportReqPDF(req.id)}
                          disabled={pdfExportingId === req.id}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 min-h-[40px]"
                        >
                          <Download className="w-4 h-4" />
                          <span>{pdfExportingId === req.id ? 'جاري التصدير...' : 'تصدير PDF'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">رقم الطلب</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">نوع الطلب</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">المشرف / مقدم الطلب</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">الموقع (الهنجر والمزرعة)</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">عدد البنود</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">التاريخ</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">الأهمية</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">الحالة الحالية</th>
                    <th className="py-3 px-4 font-bold text-center whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequisitions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                        لا توجد طلبات مطابقة للفلتر الحالي.
                      </td>
                    </tr>
                  ) : (
                    filteredRequisitions.map((req) => {
                      const typeObj = typeArabic[req.req_type] || {
                        label: req.req_type,
                        icon: ClipboardList
                      };
                      const TypeIcon = typeObj.icon;
                      const statusObj = statusArabic[req.status] || {
                        label: req.status,
                        variant: 'slate'
                      };

                      return (
                        <tr
                          key={`req-row-${req.id}`}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {req.request_no}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="font-semibold text-slate-800">
                                {typeObj.label.split(' ')[1]}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                            {req.requester_name}
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {req.house_name
                              ? `${req.house_name} (${req.farm_name})`
                              : req.farm_name || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {req.items_count || 1} بنود
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap" dir="ltr">
                            {req.request_date}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                req.urgency === 'EMERGENCY'
                                  ? 'bg-rose-100 text-rose-800'
                                  : req.urgency === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {req.urgency === 'EMERGENCY'
                                ? 'طوارئ'
                                : req.urgency === 'HIGH'
                                ? 'عاجل'
                                : 'عادي'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant={statusObj.variant}>{statusObj.label}</Badge>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(req.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>تفاصيل</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportReqPDF(req.id)}
                                disabled={pdfExportingId === req.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                title="تصدير الطلب إلى ملف PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>
                                  {pdfExportingId === req.id ? 'جاري التصدير...' : 'PDF'}
                                </span>
                              </button>
                            </div>
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

      {/* TAB 2: CREATE REQUISITION FORM */}
      {activeTab === 'create' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                تقديم طلب احتياج تشغيلي جديد
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد نوع الطلب، الموقع المستهدف، وقائمة البنود والكميات المطلوبة
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="flex items-center justify-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-xl min-h-[40px] self-start sm:self-auto"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>الرجوع لقائمة الطلبات</span>
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-6 text-xs">
            {/* Step 1: Type Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-2">نوع الطلب التشغيلي *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {[
                  {
                    type: 'CHICKS' as RequisitionType,
                    title: 'طلب كتاكيت',
                    icon: Layers,
                    desc: 'سلالات التسمين والبياض'
                  },
                  {
                    type: 'FEED' as RequisitionType,
                    title: 'طلب أعلاف',
                    icon: Wheat,
                    desc: 'أعلاف بادي ونامي وناهي'
                  },
                  {
                    type: 'TREATMENT' as RequisitionType,
                    title: 'طلب علاجات',
                    icon: Pill,
                    desc: 'تحصينات وفيتامينات ومضادات'
                  },
                  {
                    type: 'SUPPLY' as RequisitionType,
                    title: 'مستلزمات تشغيل',
                    icon: Package,
                    desc: 'فرشات نشارة ومطهرات وأدوات'
                  }
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
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`font-bold text-xs ${
                            isSel ? 'text-emerald-900' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </span>
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isSel ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Location & Header Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المزرعة *</label>
                <select
                  value={farmId}
                  onChange={(e) => setFarmId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white min-h-[42px]"
                >
                  <option value="">اختر المزرعة...</option>
                  {farms.map((f) => (
                    <option key={`req-farm-${f.id}`} value={f.id}>
                      {f.farm_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الهنجر المستهدف</label>
                <select
                  value={houseId}
                  onChange={(e) => setHouseId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white min-h-[42px]"
                >
                  <option value="">جميع الهناجر أو عام...</option>
                  {houses.map((h) => (
                    <option key={`req-house-${h.id}`} value={h.id}>
                      {h.house_name} ({h.house_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <DateInput
                  id="req-request-date"
                  label="تاريخ الطلب"
                  required
                  value={requestDate}
                  onChange={(iso) => setRequestDate(iso)}
                  onValidityChange={(valid, err) => {
                    setRequestDateValid(valid);
                    setRequestDateError(err);
                  }}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  درجة الأهمية والاستعجال
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold min-h-[46px]"
                >
                  <option value="NORMAL">عادي (اعتيادي)</option>
                  <option value="HIGH">عاجل (خلال 24 ساعة)</option>
                  <option value="EMERGENCY">طوارئ فورية (أزمة تشغيلية)</option>
                </select>
              </div>
            </div>

            {/* Step 3: Multi-line Items Builder */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
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
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-colors shrink-0 min-h-[38px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند آخر</span>
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:hidden">
                      <span className="font-mono font-bold text-slate-600">البند #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="flex items-center gap-1 px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-[11px] font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف البند</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-center">
                      <div className="hidden sm:block sm:col-span-1 text-center font-bold text-slate-400">
                        #{idx + 1}
                      </div>

                      <div className="col-span-2 sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          اسم المادة / الصنف المطلوب *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.itemName}
                          onChange={(e) => handleItemFieldChange(idx, 'itemName', e.target.value)}
                          placeholder="مثال: علف نامي، فيتامين هـ سلينيوم، نشارة خشب..."
                          className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-semibold min-h-[42px]"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          الكمية المطلوبة *
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'quantity', Number(e.target.value))
                          }
                          className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono font-bold min-h-[42px]"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          الوحدة *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.unit}
                          onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 min-h-[42px]"
                        />
                      </div>

                      <div className="hidden sm:flex sm:col-span-2 items-center justify-end">
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

                      <div className="col-span-2 sm:col-span-12">
                        <input
                          type="text"
                          value={item.specifications || ''}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'specifications', e.target.value)
                          }
                          placeholder="مواصفات إضافية (التركيز، الشركة المصنعة، طريقة التعبئة...)"
                          className="w-full p-2 text-[11px] border border-slate-200 rounded-xl bg-white min-h-[38px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                مبررات الطلب وملاحظات المشرف
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أسباب الاحتياج الحالي، خطة الاستهلاك، أي اشتراطات بيطرية..."
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 font-bold min-h-[42px]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 min-h-[42px]"
              >
                {creating ? 'جاري الإرسال والتوثيق...' : 'إرسال الطلب للاعتماد'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: REQUISITION REVIEW & DETAILS */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`تفاصيل ومراجعة طلب الاحتياج: ${selectedReq?.request_no || ''}`}
        maxWidth="max-w-2xl"
      >
        {selectedReq && (
          <div className="space-y-5 text-xs">
            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Header Details Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px]">رقم الطلب:</span>
                <span className="font-mono font-bold text-slate-900">{selectedReq.request_no}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">نوع الطلب:</span>
                <span className="font-bold text-emerald-800">
                  {typeArabic[selectedReq.req_type]?.label || selectedReq.req_type}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">مقدم الطلب:</span>
                <span className="font-bold text-slate-800">{selectedReq.requester_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ الطلب:</span>
                <span className="font-mono text-slate-800" dir="ltr">
                  {selectedReq.request_date}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">درجة الاستعجال:</span>
                <span className="font-bold text-slate-800">
                  {selectedReq.urgency === 'EMERGENCY'
                    ? 'طوارئ فورية'
                    : selectedReq.urgency === 'HIGH'
                    ? 'عاجل'
                    : 'عادي'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">المزرعة / الفرع:</span>
                <span className="font-bold text-slate-800">
                  {selectedReq.farm_name || 'عام / غير محدد'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الهنجر / القطيع:</span>
                <span className="font-bold text-slate-800">
                  {selectedReq.house_name
                    ? `${selectedReq.house_name}${
                        selectedReq.flock_code ? ` (${selectedReq.flock_code})` : ''
                      }`
                    : selectedReq.flock_code || 'عام / غير محدد'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الحالة الحالية:</span>
                <Badge variant={statusArabic[selectedReq.status]?.variant || 'slate'}>
                  {statusArabic[selectedReq.status]?.label || selectedReq.status}
                </Badge>
              </div>
            </div>

            {/* Items List */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">
                جدول بنود الطلب (REQUISITION_ITEMS):
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full min-w-[480px] text-right">
                  <thead className="bg-slate-100 text-slate-700 text-[11px]">
                    <tr>
                      <th className="p-2.5 font-bold whitespace-nowrap">#</th>
                      <th className="p-2.5 font-bold whitespace-nowrap">اسم الصنف / المادة</th>
                      <th className="p-2.5 font-bold whitespace-nowrap">النوع</th>
                      <th className="p-2.5 font-bold whitespace-nowrap">الكمية</th>
                      <th className="p-2.5 font-bold whitespace-nowrap">الوحدة</th>
                      <th className="p-2.5 font-bold whitespace-nowrap">المواصفات الفنية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReq.items?.map((itm, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-slate-400 whitespace-nowrap">
                          {i + 1}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                          {itm.itemName || itm.item_name}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {itm.itemType || itm.item_type || selectedReq.req_type}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {itm.quantity}
                        </td>
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">{itm.unit}</td>
                        <td className="p-2.5 text-slate-500">{itm.specifications || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedReq.notes && (
              <div className="p-3 bg-slate-50 rounded-lg text-slate-600 border border-slate-200">
                <span className="font-bold block text-slate-700 mb-0.5">ملاحظات مقدم الطلب:</span>
                {selectedReq.notes}
              </div>
            )}

            {/* Reviewer Summary Card */}
            {(selectedReq.status === 'APPROVED' ||
              selectedReq.status === 'REJECTED' ||
              selectedReq.status === 'COMPLETED' ||
              selectedReq.reviewer_name ||
              selectedReq.review_date ||
              selectedReq.review_notes) && (
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                  <span className="text-[11px] font-bold text-blue-950">حالة قرار المراجعة:</span>
                  <span className="font-bold text-emerald-800">
                    {selectedReq.status === 'APPROVED'
                      ? 'تم اعتماد الطلب'
                      : selectedReq.status === 'COMPLETED'
                      ? 'تم اعتماد الطلب وإكماله'
                      : selectedReq.status === 'REJECTED'
                      ? 'تم رفض الطلب'
                      : 'قيد المراجعة الفنية'}
                  </span>
                </div>
                {(selectedReq.reviewer_name || selectedReq.review_date) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedReq.reviewer_name && (
                      <div>
                        <span className="text-[11px] text-slate-500 block">اسم المراجع:</span>
                        <span className="font-bold text-slate-900">
                          {selectedReq.reviewer_name}
                        </span>
                      </div>
                    )}
                    {selectedReq.review_date && (
                      <div>
                        <span className="text-[11px] text-slate-500 block">تاريخ المراجعة:</span>
                        <span className="font-mono font-bold text-slate-900" dir="ltr">
                          {selectedReq.review_date}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {selectedReq.review_notes && (
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      ملاحظات المراجعة المعتمدة:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedReq.review_notes}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Draft Submission Action for Supervisor / Creator */}
            {selectedReq.status === 'DRAFT' && hasRole('SUPERVISOR', 'ADMIN') && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-amber-900 font-semibold">
                  هذا الطلب في حالة مسودة. يمكنك إرساله الآن للمراجعة والاعتماد.
                </span>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={handleSubmitDraft}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors min-h-[40px]"
                >
                  {reviewing ? 'جاري الإرسال...' : 'إرسال المسودة للمراجعة'}
                </button>
              </div>
            )}

            {/* Review Decision Panel (Only for PROD_MANAGER & ADMIN) */}
            {hasRole('PROD_MANAGER', 'ADMIN') && (
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-700" />
                  <h4 className="font-bold text-emerald-950">لوحة قرار مدير إدارة الإنتاج</h4>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ملاحظات المراجعة الفنية والتوجيهات (مطلوبة عند الرفض)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="سبب القبول أو الرفض، التوجيه بالصرف، الكمية المعتمدة..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
                  <span className="text-[11px] text-slate-500">
                    سيتم إشعار مقدم الطلب فورياً بنتيجة القرار عبر نظام الإشعارات الداخلي
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedReq.status === 'SUBMITTED' && (
                      <button
                        type="button"
                        disabled={reviewing}
                        onClick={() => handleReviewDecision('UNDER_REVIEW')}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-xs min-h-[40px]"
                      >
                        بدء المراجعة الفنية (UNDER_REVIEW)
                      </button>
                    )}

                    {selectedReq.status === 'UNDER_REVIEW' && (
                      <>
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() => handleReviewDecision('APPROVED')}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors min-h-[40px]"
                        >
                          اعتماد الطلب (APPROVED)
                        </button>
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() => handleReviewDecision('REJECTED')}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors min-h-[40px]"
                        >
                          رفض الطلب (REJECTED)
                        </button>
                      </>
                    )}

                    {selectedReq.status === 'APPROVED' && (
                      <button
                        type="button"
                        disabled={reviewing}
                        onClick={() => handleReviewDecision('COMPLETED')}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs transition-colors min-h-[40px]"
                      >
                        اكتمال الطلب والتوريد (COMPLETED)
                      </button>
                    )}

                    {(selectedReq.status === 'REJECTED' ||
                      selectedReq.status === 'COMPLETED') && (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        {selectedReq.status === 'REJECTED'
                          ? 'الطلب في حالة نهائية (مرفوض)'
                          : 'الطلب في حالة نهائية (مكتمل ومورّد)'}
                      </span>
                    )}

                    {selectedReq.status === 'DRAFT' && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                        الطلب لا يزال في حالة مسودة
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer with PDF Export and Close */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleExportReqPDF(selectedReq.id)}
                disabled={pdfExportingId === selectedReq.id}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 min-h-[42px]"
              >
                <Download className="w-4 h-4" />
                <span>
                  {pdfExportingId === selectedReq.id ? 'جاري التصدير...' : 'تصدير الطلب PDF'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold min-h-[42px]"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
