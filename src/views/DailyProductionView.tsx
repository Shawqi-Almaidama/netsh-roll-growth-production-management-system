import React, { useState, useEffect } from 'react';
import {
  Egg,
  Plus,
  Filter,
  AlertTriangle,
  Droplets,
  Wheat,
  CheckCircle2,
  Trash2,
  Search,
  X
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { DailyProductionRecord, House, Flock } from '../types.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import { DateInput } from '../components/ui/DateInput.js';
import { getLocalTodayDateString } from '../utils/date.js';

export const DailyProductionView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [records, setRecords] = useState<DailyProductionRecord[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedHouseFilter, setSelectedHouseFilter] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [houseId, setHouseId] = useState<string>('');
  const [flockId, setFlockId] = useState<string>('');
  const [recordDate, setRecordDate] = useState<string>(getLocalTodayDateString());
  const [recordDateValid, setRecordDateValid] = useState<boolean>(true);
  const [recordDateError, setRecordDateError] = useState<string | null>(null);
  const [eggTrays, setEggTrays] = useState<string>('320');
  const [damagedEggs, setDamagedEggs] = useState<string>('10');
  const [cullEggs, setCullEggs] = useState<string>('5');
  const [mortalityCount, setMortalityCount] = useState<string>('2');
  const [mortalityCause, setMortalityCause] = useState<string>('طبيعي');
  const [feedConsumedKg, setFeedConsumedKg] = useState<string>('1500');
  const [waterConsumedLiters, setWaterConsumedLiters] = useState<string>('3000');
  const [avgBirdWeightG, setAvgBirdWeightG] = useState<string>('1910');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, housesRes, flocksRes] = await Promise.all([
        api.getDailyProduction(
          selectedHouseFilter ? { houseId: Number(selectedHouseFilter) } : undefined
        ),
        api.getHouses(),
        api.getFlocks()
      ]);
      setRecords(prodRes.records || []);
      setHouses(housesRes.houses || []);
      setFlocks(flocksRes.flocks || []);

      if (housesRes.houses?.length > 0 && !houseId) {
        const firstHouse = housesRes.houses[0];
        setHouseId(String(firstHouse.id));
        const matchingFlock = (flocksRes.flocks || []).find(
          (f: Flock) => f.house_id === firstHouse.id && f.status === 'ACTIVE'
        );
        if (matchingFlock) setFlockId(String(matchingFlock.id));
      }
    } catch (err) {
      console.error('Failed to load daily production:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedHouseFilter]);

  const handleHouseChange = (newHouseId: string) => {
    setHouseId(newHouseId);
    const activeFlock = flocks.find(
      (f) => f.house_id === Number(newHouseId) && f.status === 'ACTIVE'
    );
    setFlockId(activeFlock ? String(activeFlock.id) : '');
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!recordDateValid || !recordDate) {
      setFormError(recordDateError || 'يرجى إدخال تاريخ التسجيل بشكل صحيح ومكتمل.');
      return;
    }
    if (!houseId || !flockId) {
      setFormError('يرجى اختيار الهنجر والقطيع النشط.');
      return;
    }

    try {
      setSubmitting(true);
      await api.createDailyProduction({
        houseId: Number(houseId),
        flockId: Number(flockId),
        recordDate,
        eggTrays: Number(eggTrays),
        damagedEggs: Number(damagedEggs),
        cullEggs: Number(cullEggs),
        mortalityCount: Number(mortalityCount),
        mortalityCause,
        feedConsumedKg: Number(feedConsumedKg),
        waterConsumedLiters: Number(waterConsumedLiters),
        avgBirdWeightG: Number(avgBirdWeightG),
        notes
      });
      setIsModalOpen(false);
      setNotes('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء حفظ سجل الإنتاج اليومي.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteDailyProduction(id);
      await loadData();
    } catch (err: any) {
      console.error(err.message || 'تعذر حذف السجل');
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchKeyword.trim()) return true;
    const q = searchKeyword.trim().toLowerCase();
    return (
      r.house_name?.toLowerCase().includes(q) ||
      r.house_code?.toLowerCase().includes(q) ||
      r.flock_code?.toLowerCase().includes(q) ||
      r.record_date?.toLowerCase().includes(q) ||
      r.recorded_by_name?.toLowerCase().includes(q) ||
      r.mortality_cause?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q)
    );
  });

  const totalTrays = filteredRecords.reduce((acc, r) => acc + (r.prod_Egg_Trays || 0), 0);
  const totalNetTrays = filteredRecords.reduce((acc, r) => acc + (r.net_trays || 0), 0);
  const totalMortality = filteredRecords.reduce((acc, r) => acc + (r.mortality_count || 0), 0);
  const totalFeed = filteredRecords.reduce((acc, r) => acc + (r.feed_consumed_kg || 0), 0);

  return (
    <div id="daily-production-view" className="space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900">
            سجل الإنتاج اليومي والنفوق والفرز
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            توثيق إنتاج البيض اليومي بالأطباق، حالات النفوق، البيض المكسور والفرز، واستهلاك العلف والماء
          </p>
        </div>

        {hasRole('SUPERVISOR', 'PROD_MANAGER', 'ADMIN') && (
          <button
            id="btn-new-production"
            type="button"
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm min-h-[42px]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>تسجيل إنتاج يومي جديد</span>
          </button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">إجمالي الأطباق المسجلة</p>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {totalTrays.toLocaleString('ar-EG')} طبق
            </h3>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
            <Egg className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">الأطباق السليمة الصافية</p>
            <h3 className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">
              {totalNetTrays.toLocaleString('ar-EG')} طبق
            </h3>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 text-blue-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">إجمالي حالات النفوق</p>
            <h3 className="text-lg sm:text-xl font-bold text-rose-700 mt-1">
              {totalMortality.toLocaleString('ar-EG')} طير
            </h3>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 text-rose-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">إجمالي استهلاك العلف</p>
            <h3 className="text-lg sm:text-xl font-bold text-amber-800 mt-1">
              {totalFeed.toLocaleString('ar-EG')} كجم
            </h3>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 text-amber-700 shrink-0">
            <Wheat className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-production"
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="بحث فوري بالتاريخ، الهنجر، كود القطيع، المشرف، الملاحظات..."
            className="w-full pr-9 pl-8 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600 bg-slate-50/50 focus:bg-white transition-colors"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="filter-production-house"
              value={selectedHouseFilter}
              onChange={(e) => setSelectedHouseFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600 bg-slate-50 min-h-[40px]"
            >
              <option value="">جميع الهناجر المصرح بها</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.house_name} ({h.house_code})
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-400 shrink-0">
            إجمالي السجلات: <strong className="text-slate-700">{filteredRecords.length}</strong>
          </span>
        </div>
      </div>

      {/* Data Section: Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            جاري تحميل سجلات الإنتاج اليومي...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            لا توجد سجلات إنتاج مطابقة للبحث أو الفلترة الحالية
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredRecords.map((rec) => (
                <div key={rec.id} className="p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{rec.house_name}</span>
                      <span className="mr-2 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        {rec.flock_code}
                      </span>
                    </div>
                    <span
                      className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                      dir="ltr"
                    >
                      {rec.record_date}
                    </span>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] text-slate-500 block">إجمالي البيض</span>
                      <span className="font-mono font-bold text-slate-900">
                        {rec.prod_Egg_Trays} طبق
                      </span>
                    </div>
                    <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-200/70">
                      <span className="text-[10px] text-emerald-700 block">الصافي السليم</span>
                      <span className="font-mono font-black text-emerald-800">
                        {rec.net_trays} طبق
                      </span>
                    </div>
                    <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-200/70">
                      <span className="text-[10px] text-rose-700 block">النفوق</span>
                      <span className="font-mono font-bold text-rose-700">
                        {rec.mortality_count} ({rec.mortality_cause})
                      </span>
                    </div>
                  </div>

                  {/* Secondary Details */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400">الكسر / الفرز: </span>
                      <span className="font-mono font-bold text-rose-600">{rec.damaged_eggs}</span>
                      {' / '}
                      <span className="font-mono font-bold text-amber-700">{rec.cull_eggs}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">العلف / الماء: </span>
                      <span className="font-mono font-semibold text-slate-700">
                        {rec.feed_consumed_kg} كجم
                      </span>
                      {' • '}
                      <span className="font-mono text-blue-700">{rec.water_consumed_liters} لتر</span>
                    </div>
                  </div>

                  {/* Footer: Supervisor + Delete Action */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-600">
                      <span>المشرف: </span>
                      <strong className="text-slate-800">{rec.recorded_by_name}</strong>
                      {rec.notes && <p className="text-slate-400 mt-0.5">{rec.notes}</p>}
                    </div>

                    {hasRole('ADMIN', 'PROD_MANAGER') && (
                      <button
                        type="button"
                        onClick={() => handleDelete(rec.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="حذف السجل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">التاريخ</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">الهنجر</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">القطيع</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">إنتاج البيض (طبق)</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">البيض السليم</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">الكسر</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">الفرز</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">النفوق</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">العلف (كجم)</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">الماء (لتر)</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">المشرف والملاحظات</th>
                    {hasRole('ADMIN', 'PROD_MANAGER') && (
                      <th className="p-3.5 font-semibold text-center whitespace-nowrap">إجراء</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td
                        className="p-3.5 font-mono font-semibold text-slate-800 whitespace-nowrap"
                        dir="ltr"
                      >
                        {rec.record_date}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {rec.house_name}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {rec.flock_code}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {rec.prod_Egg_Trays} طبق
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge variant="emerald">{rec.net_trays} طبق صافي</Badge>
                      </td>
                      <td className="p-3.5 font-mono text-rose-600 whitespace-nowrap">
                        {rec.damaged_eggs}
                      </td>
                      <td className="p-3.5 font-mono text-amber-700 whitespace-nowrap">
                        {rec.cull_eggs}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold ${
                            rec.mortality_count > 5 ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          {rec.mortality_count} طير
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {rec.mortality_cause}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">
                        {rec.feed_consumed_kg}
                      </td>
                      <td className="p-3.5 font-mono text-blue-700 whitespace-nowrap">
                        {rec.water_consumed_liters}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 block whitespace-nowrap">
                          {rec.recorded_by_name}
                        </span>
                        {rec.notes && (
                          <span className="text-[11px] text-slate-400 line-clamp-1">
                            {rec.notes}
                          </span>
                        )}
                      </td>
                      {hasRole('ADMIN', 'PROD_MANAGER') && (
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDelete(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="حذف السجل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Daily Production Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل إنتاج يومي جديد (بيانات الهنجر الميدانية)"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">الهنجر *</label>
              <select
                id="select-prod-house"
                value={houseId}
                onChange={(e) => handleHouseChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 min-h-[42px]"
                required
              >
                <option value="">-- اختر الهنجر --</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.house_name} ({h.house_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">القطيع النشط *</label>
              <select
                id="select-prod-flock"
                value={flockId}
                onChange={(e) => setFlockId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 min-h-[42px]"
                required
              >
                <option value="">-- اختر القطيع --</option>
                {flocks
                  .filter((f) => !houseId || f.house_id === Number(houseId))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.flock_code} ({f.current_bird_count} طير)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <DateInput
              id="input-prod-date"
              label="تاريخ التسجيل"
              required
              value={recordDate}
              onChange={(iso) => setRecordDate(iso)}
              onValidityChange={(valid, err) => {
                setRecordDateValid(valid);
                setRecordDateError(err);
              }}
            />
          </div>

          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
            <h4 className="font-bold text-emerald-950">بيانات إنتاج البيض والفرز (بالطبق):</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  إجمالي البيض المنتج (طبق) *
                </label>
                <input
                  id="input-prod-trays"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={eggTrays}
                  onChange={(e) => setEggTrays(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-mono min-h-[42px]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">البيض المكسور (طبق)</label>
                <input
                  id="input-prod-damaged"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={damagedEggs}
                  onChange={(e) => setDamagedEggs(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-mono min-h-[42px]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">بيض الفرز الصغير (طبق)</label>
                <input
                  id="input-prod-culls"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={cullEggs}
                  onChange={(e) => setCullEggs(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-mono min-h-[42px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">عدد النفوق اليومي (طير)</label>
              <input
                id="input-prod-mortality"
                type="number"
                inputMode="numeric"
                min={0}
                value={mortalityCount}
                onChange={(e) => setMortalityCount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono min-h-[42px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">سبب النفوق الملاحظ</label>
              <input
                type="text"
                value={mortalityCause}
                onChange={(e) => setMortalityCause(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 min-h-[42px]"
                placeholder="مثال: طبيعي / إجهاد حراري"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">العلف المستهلك (كجم)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={feedConsumedKg}
                onChange={(e) => setFeedConsumedKg(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono min-h-[42px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">الماء المستهلك (لتر)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={waterConsumedLiters}
                onChange={(e) => setWaterConsumedLiters(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono min-h-[42px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">متوسط وزن الطير (جرام)</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={avgBirdWeightG}
                onChange={(e) => setAvgBirdWeightG(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ملاحظات المشرف ({user?.fullName})
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
              placeholder="أي ملاحظات ميدانية حول صحة القطيع أو جودة القشرة..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 min-h-[42px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold disabled:opacity-50 min-h-[42px]"
            >
              {submitting ? 'جاري التسجيل...' : 'حفظ واعتماد السجل'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
