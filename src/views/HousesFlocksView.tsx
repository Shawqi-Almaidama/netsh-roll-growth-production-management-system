import React, { useState, useEffect } from 'react';
import {
  Home,
  Plus,
  Egg,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
  ArrowRight,
  Search,
  X
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { House, Flock, Farm } from '../types.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { DateInput } from '../components/ui/DateInput.js';
import { getLocalTodayDateString } from '../utils/date.js';

export const HousesFlocksView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { hasRole } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKw, setSearchKw] = useState<string>('');
  const [filterFarm, setFilterFarm] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  const [isFlockModalOpen, setIsFlockModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [entryDateValid, setEntryDateValid] = useState(true);
  const [entryDateError, setEntryDateError] = useState<string | null>(null);

  // New House Form State
  const [newHouse, setNewHouse] = useState({
    farmId: '',
    houseCode: '',
    houseName: '',
    houseType: 'بياض',
    capacity: 15000,
    supervisorId: '',
    notes: ''
  });

  // New Flock Form State
  const [newFlock, setNewFlock] = useState({
    houseId: '',
    flockCode: '',
    breed: 'لوهمان براون',
    initialCount: 10000,
    entryDate: getLocalTodayDateString(),
    targetWeightG: 1950,
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [housesRes, flocksRes, farmsRes, supsRes] = await Promise.all([
        api.getHouses(),
        api.getFlocks(),
        api.getFarms(),
        api.getSupervisors()
      ]);

      if (housesRes.success) {
        const uniqueHouses = Array.from(
          new Map((housesRes.houses || []).map((h: any) => [h.id, h])).values()
        );
        setHouses(uniqueHouses);
      }
      if (flocksRes.success) setFlocks(flocksRes.flocks);
      if (farmsRes.success) {
        setFarms(farmsRes.farms);
        if (farmsRes.farms.length > 0 && !newHouse.farmId) {
          setNewHouse((prev) => ({ ...prev, farmId: String(farmsRes.farms[0].id) }));
        }
      }
      if (supsRes.success) setSupervisors(supsRes.supervisors);
    } catch (err) {
      console.error('Error loading houses & flocks data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSaving(true);
    try {
      await api.createHouse({
        farmId: Number(newHouse.farmId),
        houseCode: newHouse.houseCode.trim(),
        houseName: newHouse.houseName.trim(),
        houseType: newHouse.houseType,
        capacity: Number(newHouse.capacity),
        supervisorId: newHouse.supervisorId ? Number(newHouse.supervisorId) : null,
        notes: newHouse.notes
      });
      setIsHouseModalOpen(false);
      setNewHouse({
        farmId: farms[0]?.id ? String(farms[0].id) : '',
        houseCode: '',
        houseName: '',
        houseType: 'بياض',
        capacity: 15000,
        supervisorId: '',
        notes: ''
      });
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'فشل إضافة الهنجر');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDateValid || !newFlock.entryDate) {
      setModalError(entryDateError || 'يرجى إدخال تاريخ التسكين بشكل صحيح ومكتمل.');
      return;
    }
    setModalError(null);
    setSaving(true);
    try {
      await api.createFlock({
        houseId: Number(newFlock.houseId),
        flockCode: newFlock.flockCode.trim(),
        breed: newFlock.breed.trim(),
        initialCount: Number(newFlock.initialCount),
        entryDate: newFlock.entryDate,
        targetWeightG: Number(newFlock.targetWeightG),
        notes: newFlock.notes
      });
      setIsFlockModalOpen(false);
      setNewFlock({
        houseId: '',
        flockCode: '',
        breed: 'لوهمان براون',
        initialCount: 10000,
        entryDate: getLocalTodayDateString(),
        targetWeightG: 1950,
        notes: ''
      });
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'فشل تسكين القطيع');
    } finally {
      setSaving(false);
    }
  };

  const filteredHouses = houses.filter((h) => {
    if (filterFarm !== 'all' && String(h.farm_id) !== filterFarm) return false;
    if (filterStatus !== 'all' && h.current_status !== filterStatus) return false;
    if (searchKw.trim()) {
      const q = searchKw.trim().toLowerCase();
      return (
        h.house_code?.toLowerCase().includes(q) ||
        h.house_name?.toLowerCase().includes(q) ||
        h.house_type?.toLowerCase().includes(q) ||
        h.farm_name?.toLowerCase().includes(q) ||
        h.supervisor_name?.toLowerCase().includes(q) ||
        h.active_flock_code?.toLowerCase().includes(q) ||
        h.active_flock_breed?.toLowerCase().includes(q) ||
        (h as any).notes?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const houseStatusMap: Record<
    string,
    { label: string; variant: 'emerald' | 'amber' | 'slate' | 'rose' }
  > = {
    ACTIVE: { label: 'نشط وتشغيلي', variant: 'emerald' },
    CLEANING: { label: 'تطهير وتعقيم', variant: 'amber' },
    EMPTY: { label: 'فارغ متاح للتسكين', variant: 'slate' },
    MAINTENANCE: { label: 'صيانة وتجهيز', variant: 'rose' }
  };

  return (
    <div id="houses-flocks-view" className="space-y-6 pb-12" dir="rtl">
      {/* Page Header */}
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
            <Home className="w-6 h-6 text-emerald-700 shrink-0" />
            <h1 className="text-base sm:text-xl font-black text-slate-900">
              إدارة الهناجر والقطعان الداجنة
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة الطاقة الاستيعابية للهناجر، تسكين الدفعات، ومراقبة أعداد الطيور الحية وحالة الإشراف الميداني
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={loadData}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors min-h-[42px]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>

          {hasRole('ADMIN', 'PROD_MANAGER') && (
            <>
              <button
                id="btn-add-house"
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsHouseModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shadow-xs min-h-[42px]"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>إضافة هنجر جديد</span>
              </button>

              <button
                id="btn-add-flock"
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsFlockModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs min-h-[42px]"
              >
                <Egg className="w-4 h-4 shrink-0" />
                <span>تسكين قطيع جديد</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">إجمالي الهناجر المسجلة</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
            {houses.length} هنجر
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {houses.filter((h) => h.current_status === 'ACTIVE').length} هنجر نشط حالياً
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">إجمالي السعة الاستيعابية</span>
          <span className="text-xl sm:text-2xl font-black text-blue-800 mt-1 block">
            {houses.reduce((acc, h) => acc + (h.capacity || 0), 0).toLocaleString('ar-EG')} طائر
          </span>
          <span className="text-[11px] text-slate-400">السعة التصميمية القصوى</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">إجمالي الطيور الحية الفعلية</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
            {houses
              .reduce((acc, h) => acc + (h.active_bird_count || 0), 0)
              .toLocaleString('ar-EG')}{' '}
            طائر
          </span>
          <span className="text-[11px] text-slate-400">موزعة على القطعان النشطة</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">القطعان والدفعات النشطة</span>
          <span className="text-xl sm:text-2xl font-black text-amber-700 mt-1 block">
            {flocks.filter((f) => f.status === 'ACTIVE').length} دفعات
          </span>
          <span className="text-[11px] text-slate-400">تحت الرعاية والإنتاج اليومي</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-houses"
            type="text"
            value={searchKw}
            onChange={(e) => setSearchKw(e.target.value)}
            placeholder="بحث فوري عن هنجر، كود الهنجر، المشرف، القطيع، السلالة..."
            className="w-full pr-9 pl-8 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600 bg-slate-50/50 focus:bg-white transition-colors"
          />
          {searchKw && (
            <button
              type="button"
              onClick={() => setSearchKw('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <select
            value={filterFarm}
            onChange={(e) => setFilterFarm(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-emerald-600 min-h-[40px]"
          >
            <option value="all">جميع المزارع ({farms.length})</option>
            {farms.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.farm_name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-emerald-600 min-h-[40px]"
          >
            <option value="all">جميع الحالات التشغيلية</option>
            <option value="ACTIVE">نشط وتشغيلي</option>
            <option value="EMPTY">فارغ متاح للتسكين</option>
            <option value="CLEANING">تطهير وتعقيم</option>
          </select>
        </div>
      </div>

      {/* Houses Grid Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل بيانات الهناجر والقطعان...</div>
      ) : filteredHouses.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          لا توجد هناجر مطابقة لمعايير الفلترة المحددة
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHouses.map((house) => {
            const st = houseStatusMap[house.current_status] || {
              label: house.current_status,
              variant: 'slate'
            };
            const occupancyRate =
              house.capacity > 0
                ? Math.min(100, Math.round(((house.active_bird_count || 0) / house.capacity) * 100))
                : 0;

            return (
              <div
                key={house.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Card Top */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {house.house_code}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1.5">
                        {house.house_name}
                      </h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{house.farm_name || 'مزرعة نتش رول جروث'}</span>
                      </p>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>

                  {/* Active Flock Info Box */}
                  {house.active_flock_code ? (
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">القطيع المسكن:</span>
                        <span className="font-mono font-bold text-emerald-900">
                          {house.active_flock_code}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">السلالة:</span>
                        <span className="font-bold text-slate-800">{house.active_flock_breed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">العدد الحي الحالي:</span>
                        <span className="font-mono font-black text-emerald-700">
                          {(house.active_bird_count || 0).toLocaleString('ar-EG')} طائر
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      لا يوجد قطيع مسكن حالياً في هذا الهنجر
                    </div>
                  )}

                  {/* Capacity Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">نسبة الإشغال الفعلي:</span>
                      <span className="font-mono font-bold text-slate-700">
                        {occupancyRate}% ({(house.active_bird_count || 0).toLocaleString('ar-EG')} /{' '}
                        {house.capacity.toLocaleString('ar-EG')})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer: Supervisor */}
                <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>المشرف المسؤول:</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {house.supervisor_name || 'غير معين'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flocks Registry Section (Mobile Cards + Desktop Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Egg className="w-4 h-4 text-amber-600 shrink-0" />
              <span>سجل القطعان والدفعات الداجنة (FLOCKS)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              بيانات الدفعات المسكنة وتاريخ الدخول ومقارنة العدد الأولي بالعدد الحي الحالي
            </p>
          </div>
          <Badge variant="amber">{flocks.length} دفعة</Badge>
        </div>

        {/* Mobile Cards for Flocks Registry */}
        <div className="md:hidden divide-y divide-slate-100">
          {flocks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">لا توجد قطعان مسجلة</div>
          ) : (
            flocks.map((fl) => (
              <div key={fl.id} className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-900 text-sm">{fl.flock_code}</span>
                    <span className="mr-2 text-slate-600 font-semibold">{fl.breed}</span>
                  </div>
                  <Badge variant={fl.status === 'ACTIVE' ? 'emerald' : 'slate'}>
                    {fl.status === 'ACTIVE' ? 'قطيع نشط' : fl.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="text-[10px] text-slate-400 block">الهنجر المخصص</span>
                    <span className="font-bold text-slate-800">{fl.house_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">تاريخ التسكين</span>
                    <span className="font-mono font-semibold text-slate-700" dir="ltr">
                      {fl.entry_date}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">العدد الأولي</span>
                    <span className="font-mono font-bold text-slate-800">
                      {fl.initial_count.toLocaleString('ar-EG')} طائر
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block">العدد الحي الحالي</span>
                    <span className="font-mono font-black text-emerald-800">
                      {fl.current_bird_count.toLocaleString('ar-EG')} طائر
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table for Flocks Registry */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">كود القطيع</th>
                <th className="py-3 px-4 whitespace-nowrap">الهنجر</th>
                <th className="py-3 px-4 whitespace-nowrap">السلالة</th>
                <th className="py-3 px-4 whitespace-nowrap">تاريخ التسكين</th>
                <th className="py-3 px-4 whitespace-nowrap">العدد الأولي</th>
                <th className="py-3 px-4 whitespace-nowrap">العدد الحي الحالي</th>
                <th className="py-3 px-4 whitespace-nowrap">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flocks.map((fl) => (
                <tr key={fl.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {fl.flock_code}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                    {fl.house_name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{fl.breed}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap" dir="ltr">
                    {fl.entry_date}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                    {fl.initial_count.toLocaleString('ar-EG')} طائر
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {fl.current_bird_count.toLocaleString('ar-EG')} طائر
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Badge variant={fl.status === 'ACTIVE' ? 'emerald' : 'slate'}>
                      {fl.status === 'ACTIVE' ? 'قطيع نشط' : fl.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add House */}
      <Modal
        isOpen={isHouseModalOpen}
        onClose={() => setIsHouseModalOpen(false)}
        title="إضافة هنجر تشغيلي جديد"
      >
        <form onSubmit={handleCreateHouse} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">المزرعة التابع لها *</label>
              <select
                required
                value={newHouse.farmId}
                onChange={(e) => setNewHouse({ ...newHouse, farmId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 min-h-[42px]"
              >
                {farms.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.farm_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">كود الهنجر *</label>
              <input
                type="text"
                required
                placeholder="مثال: H-04"
                value={newHouse.houseCode}
                onChange={(e) => setNewHouse({ ...newHouse, houseCode: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-mono min-h-[42px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم الهنجر *</label>
              <input
                type="text"
                required
                placeholder="مثال: هنجر 4 - إنتاج البيض"
                value={newHouse.houseName}
                onChange={(e) => setNewHouse({ ...newHouse, houseName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 min-h-[42px]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">السعة الاستيعابية (طائر) *</label>
              <input
                type="number"
                inputMode="numeric"
                required
                min={100}
                value={newHouse.capacity}
                onChange={(e) => setNewHouse({ ...newHouse, capacity: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-mono min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">المشرف الميداني المسؤول</label>
            <select
              value={newHouse.supervisorId}
              onChange={(e) => setNewHouse({ ...newHouse, supervisorId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 min-h-[42px]"
            >
              <option value="">— اختيار المشرف —</option>
              {supervisors.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.full_name} (@{s.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات فنية</label>
            <textarea
              rows={2}
              value={newHouse.notes}
              onChange={(e) => setNewHouse({ ...newHouse, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsHouseModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold min-h-[42px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold disabled:opacity-50 min-h-[42px]"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الهنجر'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Flock */}
      <Modal
        isOpen={isFlockModalOpen}
        onClose={() => setIsFlockModalOpen(false)}
        title="تسكين قطيع جديد في هنجر"
      >
        <form onSubmit={handleCreateFlock} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">الهنجر المستهدف *</label>
              <select
                required
                value={newFlock.houseId}
                onChange={(e) => setNewFlock({ ...newFlock, houseId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 min-h-[42px]"
              >
                <option value="">— اختر الهنجر —</option>
                {houses.map((h) => (
                  <option key={h.id} value={String(h.id)}>
                    {h.house_name} ({h.house_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">كود القطيع / الدفعة *</label>
              <input
                type="text"
                required
                placeholder="مثال: FLK-2026-D4"
                value={newFlock.flockCode}
                onChange={(e) => setNewFlock({ ...newFlock, flockCode: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-mono min-h-[42px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">السلالة *</label>
              <input
                type="text"
                required
                value={newFlock.breed}
                onChange={(e) => setNewFlock({ ...newFlock, breed: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 min-h-[42px]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">العدد الأولي للطيور *</label>
              <input
                type="number"
                inputMode="numeric"
                required
                min={100}
                value={newFlock.initialCount}
                onChange={(e) => setNewFlock({ ...newFlock, initialCount: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-mono min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <DateInput
              id="flock-entry-date"
              label="تاريخ التسكين"
              required
              value={newFlock.entryDate}
              onChange={(iso) => setNewFlock({ ...newFlock, entryDate: iso })}
              onValidityChange={(valid, err) => {
                setEntryDateValid(valid);
                setEntryDateError(err);
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFlockModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold min-h-[42px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold disabled:opacity-50 min-h-[42px]"
            >
              {saving ? 'جاري التسكين...' : 'اعتماد تسكين القطيع'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
