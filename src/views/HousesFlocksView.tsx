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
  ArrowRight
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { House, Flock, Farm } from '../types.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';

export const HousesFlocksView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { hasRole } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFarm, setFilterFarm] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  const [isFlockModalOpen, setIsFlockModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    entryDate: new Date().toISOString().slice(0, 10),
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
        const uniqueHouses = Array.from(new Map((housesRes.houses || []).map((h: any) => [h.id, h])).values());
        setHouses(uniqueHouses);
      }
      if (flocksRes.success) setFlocks(flocksRes.flocks);
      if (farmsRes.success) {
        setFarms(farmsRes.farms);
        if (farmsRes.farms.length > 0 && !newHouse.farmId) {
          setNewHouse(prev => ({ ...prev, farmId: String(farmsRes.farms[0].id) }));
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
        entryDate: new Date().toISOString().slice(0, 10),
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

  const filteredHouses = houses.filter(h => {
    if (filterFarm !== 'all' && String(h.farm_id) !== filterFarm) return false;
    if (filterStatus !== 'all' && h.current_status !== filterStatus) return false;
    return true;
  });

  const houseStatusMap: Record<string, { label: string; variant: 'emerald' | 'amber' | 'slate' | 'rose' }> = {
    ACTIVE: { label: 'نشط وتشغيلي', variant: 'emerald' },
    CLEANING: { label: 'تطهير وتعقيم', variant: 'amber' },
    EMPTY: { label: 'فارغ متاح للتسكين', variant: 'slate' },
    MAINTENANCE: { label: 'صيانة وتجهيز', variant: 'rose' }
  };

  return (
    <div id="houses-flocks-view" className="space-y-6 pb-12" dir="rtl">
      {/* Page Header */}
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
              إدارة الهناجر والقطعان
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            توثيق عنابر الإنتاج، الطاقات الاستيعابية، وتسكين ومتابعة القطعان الحية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {hasRole('SUPERVISOR', 'PROD_MGR', 'ADMIN') && (
            <>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsHouseModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة هنجر جديد</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsFlockModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Egg className="w-4 h-4" />
                <span>تسكين قطيع جديد</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>تصفية الهناجر:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">المزرعة:</label>
          <select
            value={filterFarm}
            onChange={(e) => setFilterFarm(e.target.value)}
            className="text-xs py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">جميع المزارع ({farms.length})</option>
            {farms.map((f) => (
              <option key={`farm-filter-${f.id}`} value={f.id}>{f.farm_name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">الحالة التشغيلية:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="CLEANING">تطهير</option>
            <option value="EMPTY">فارغ</option>
            <option value="MAINTENANCE">صيانة</option>
          </select>
        </div>
      </div>

      {/* Houses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredHouses.map((house) => {
          const statusInfo = houseStatusMap[house.current_status] || { label: house.current_status, variant: 'slate' };
          const hasFlock = Boolean(house.active_flock_id);

          return (
            <div
              key={`house-card-${house.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {house.house_code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">({house.house_type})</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{house.house_name}</h3>
                    <p className="text-xs text-slate-500">{house.farm_name}</p>
                  </div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-100 text-xs my-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">الطاقة الاستيعابية</span>
                    <span className="font-bold text-slate-800">{house.capacity.toLocaleString('ar-EG')} طائر</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">المشرف المسؤول</span>
                    <span className="font-semibold text-slate-800">{house.supervisor_name || 'غير محدد'}</span>
                  </div>
                </div>

                {/* Active Flock Section */}
                {hasFlock ? (
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-900">
                        <Egg className="w-3.5 h-3.5 text-emerald-700" />
                        <span>القطيع النشط: {house.active_flock_code}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700">{house.active_flock_breed}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-600">العدد الحي الحالي:</span>
                      <span className="font-black text-emerald-800 text-sm">
                        {house.active_flock_count?.toLocaleString('ar-EG')} طائر
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    لا يوجد قطيع نشط حالياً في هذا الهنجر
                  </div>
                )}
              </div>

              {house.notes && (
                <p className="text-[11px] text-slate-500 mt-3 italic border-t border-slate-100 pt-2">
                  ملاحظات: {house.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Add New House */}
      <Modal
        id="modal-add-house"
        isOpen={isHouseModalOpen}
        onClose={() => setIsHouseModalOpen(false)}
        title="إضافة هنجر جديد للنظام (FR-01)"
        subtitle="توثيق بيانات الهنجر وسعته التشغيلية وربطه بالمزرعة"
        maxWidth="lg"
      >
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
            {modalError}
          </div>
        )}

        <form onSubmit={handleCreateHouse} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">المزرعة التابع لها *</label>
            <select
              required
              value={newHouse.farmId}
              onChange={(e) => setNewHouse({ ...newHouse, farmId: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
            >
              <option value="">اختر المزرعة...</option>
              {farms.map((f) => (
                <option key={`farm-select-${f.id}`} value={f.id}>{f.farm_name} ({f.farm_code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">كود الهنجر *</label>
              <input
                type="text"
                required
                value={newHouse.houseCode}
                onChange={(e) => setNewHouse({ ...newHouse, houseCode: e.target.value })}
                placeholder="مثال: H-04"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم الهنجر *</label>
              <input
                type="text"
                required
                value={newHouse.houseName}
                onChange={(e) => setNewHouse({ ...newHouse, houseName: e.target.value })}
                placeholder="مثال: عنبر إنتاج بيض 4"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">نوع الإنتاج *</label>
              <select
                value={newHouse.houseType}
                onChange={(e) => setNewHouse({ ...newHouse, houseType: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="بياض">دجاج بياض (إنتاج بيض مائدة)</option>
                <option value="تسمين">دجاج لاحم / تسمين (إنتاج لحوم)</option>
                <option value="أمهات">أمهات وإنتاج كتاكيت</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">الطاقة الاستيعابية (طائر) *</label>
              <input
                type="number"
                required
                min="100"
                value={newHouse.capacity}
                onChange={(e) => setNewHouse({ ...newHouse, capacity: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">المشرف المسؤول</label>
            <select
              value={newHouse.supervisorId}
              onChange={(e) => setNewHouse({ ...newHouse, supervisorId: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
            >
              <option value="">اختر مشرف الإنتاج...</option>
              {supervisors.map((s) => (
                <option key={`sup-select-${s.id}`} value={s.id}>{s.full_name} ({s.specialization})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات ومواصفات</label>
            <textarea
              rows={2}
              value={newHouse.notes}
              onChange={(e) => setNewHouse({ ...newHouse, notes: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
              placeholder="أنظمة التهوية، العزل، خطوط الشرب..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsHouseModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الهنجر'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: House New Flock */}
      <Modal
        id="modal-add-flock"
        isOpen={isFlockModalOpen}
        onClose={() => setIsFlockModalOpen(false)}
        title="تسكين قطيع جديد (FR-01)"
        subtitle="تسجيل دفعة كتاكيت جديدة وربطها بهنجر غير مشغول"
        maxWidth="lg"
      >
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
            {modalError}
          </div>
        )}

        <form onSubmit={handleCreateFlock} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">اختر الهنجر المستهدف *</label>
            <select
              required
              value={newFlock.houseId}
              onChange={(e) => setNewFlock({ ...newFlock, houseId: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
            >
              <option value="">اختر الهنجر...</option>
              {houses.filter(h => !h.active_flock_id).map((h) => (
                <option key={`flock-house-${h.id}`} value={h.id}>
                  {h.house_name} ({h.house_code}) - {h.farm_name} [سعة: {h.capacity}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">كود القطيع *</label>
              <input
                type="text"
                required
                value={newFlock.flockCode}
                onChange={(e) => setNewFlock({ ...newFlock, flockCode: e.target.value })}
                placeholder="مثال: FLK-2026-005"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">السلالة *</label>
              <input
                type="text"
                required
                value={newFlock.breed}
                onChange={(e) => setNewFlock({ ...newFlock, breed: e.target.value })}
                placeholder="مثال: روس 308، كب 500، لوهمان..."
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">العدد الابتدائي *</label>
              <input
                type="number"
                required
                min="100"
                value={newFlock.initialCount}
                onChange={(e) => setNewFlock({ ...newFlock, initialCount: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ التسكين *</label>
              <input
                type="date"
                required
                value={newFlock.entryDate}
                onChange={(e) => setNewFlock({ ...newFlock, entryDate: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">الوزن المستهدف (جرام)</label>
              <input
                type="number"
                value={newFlock.targetWeightG}
                onChange={(e) => setNewFlock({ ...newFlock, targetWeightG: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات ومصدر الكتاكيت</label>
            <textarea
              rows={2}
              value={newFlock.notes}
              onChange={(e) => setNewFlock({ ...newFlock, notes: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
              placeholder="معمل التفريخ المورد، الحالة الصحية الأولية..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFlockModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'تسكين القطيع'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
