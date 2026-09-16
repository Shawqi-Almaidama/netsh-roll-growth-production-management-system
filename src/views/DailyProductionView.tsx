import React, { useState, useEffect } from 'react';
import {
  Egg,
  Calendar,
  AlertTriangle,
  Plus,
  Save,
  CheckCircle,
  Filter,
  History,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { DailyProductionRecord, Flock } from '../types.js';
import { Badge } from '../components/ui/Badge.js';

export const DailyProductionView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user, hasRole } = useAuth();
  const [records, setRecords] = useState<DailyProductionRecord[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    flockId: '',
    recordDate: new Date().toISOString().slice(0, 10),
    productionQuantity: 450,
    unit: 'طبق',
    mortalityCount: 3,
    feedConsumedKg: 1200,
    waterConsumedLiters: 2400,
    avgWeightG: 1980,
    temperatureC: 24,
    humidityPct: 62,
    notes: ''
  });

  // Filters State
  const [filterFlock, setFilterFlock] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [flocksRes, prodRes] = await Promise.all([
        api.getFlocks(),
        api.getDailyProduction()
      ]);

      if (flocksRes.success) {
        const activeOnly = flocksRes.flocks.filter((f: Flock) => f.status === 'ACTIVE');
        setFlocks(activeOnly);
        if (activeOnly.length > 0 && !formData.flockId) {
          setFormData(prev => ({ ...prev, flockId: String(activeOnly[0].id) }));
        }
      }

      if (prodRes.success) {
        setRecords(prodRes.records);
      }
    } catch (err) {
      console.error('Error loading daily production data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedFlock = flocks.find(f => String(f.id) === formData.flockId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      const res = await api.recordDailyProduction({
        flockId: Number(formData.flockId),
        recordDate: formData.recordDate,
        productionQuantity: Number(formData.productionQuantity),
        unit: formData.unit,
        mortalityCount: Number(formData.mortalityCount),
        feedConsumedKg: Number(formData.feedConsumedKg),
        waterConsumedLiters: Number(formData.waterConsumedLiters),
        avgWeightG: Number(formData.avgWeightG),
        temperatureC: formData.temperatureC ? Number(formData.temperatureC) : null,
        humidityPct: formData.humidityPct ? Number(formData.humidityPct) : null,
        notes: formData.notes
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `${res.message}. تم تحديث رصيد الطيور الحية والوفيات تلقائياً.`
        });
        await loadData();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء تسجيل بيانات الإنتاج اليومي'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter(r => {
    if (filterFlock !== 'all' && String(r.flock_id) !== filterFlock) return false;
    if (filterStartDate && r.record_date < filterStartDate) return false;
    if (filterEndDate && r.record_date > filterEndDate) return false;
    return true;
  });

  return (
    <div id="daily-production-view" className="space-y-6 pb-12" dir="rtl">
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
              تسجيل الإنتاج اليومي
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل إنتاج البيض واللحم، استهلاك الأعلاف والمياه، والوفيات مع تحديث أعداد القطيع تلقائياً
          </p>
        </div>

        <div className="text-left text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <span className="text-slate-400 block text-[11px]">المسؤول الحالي عن الإدخال:</span>
          <span className="font-bold text-slate-800">{user?.fullName} ({user?.roleNameAr})</span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid: Entry Form (Left) & Live Flock Status (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Entry Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Egg className="w-5 h-5 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              استمارة تسجيل حركة العنبر اليومية
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Flock Selection & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">القطيع المستهدف *</label>
                <select
                  required
                  value={formData.flockId}
                  onChange={(e) => setFormData({ ...formData, flockId: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                >
                  {flocks.map((flk) => (
                    <option key={`prod-flk-${flk.id}`} value={flk.id}>
                      {flk.flock_code} ({flk.breed}) - {flk.house_name} [{flk.current_count} طائر]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ التسجيل *</label>
                <input
                  type="date"
                  required
                  value={formData.recordDate}
                  onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                />
              </div>
            </div>

            {/* Production Qty & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-emerald-50/40 rounded-xl border border-emerald-100">
              <div>
                <label className="block font-bold text-emerald-950 mb-1">كمية الإنتاج المجمّع *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.productionQuantity}
                  onChange={(e) => setFormData({ ...formData, productionQuantity: Number(e.target.value) })}
                  className="w-full p-2.5 border border-emerald-300 rounded-lg bg-white font-mono text-sm font-bold text-emerald-900"
                />
              </div>
              <div>
                <label className="block font-bold text-emerald-950 mb-1">وحدة القياس *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full p-2.5 border border-emerald-300 rounded-lg bg-white"
                >
                  <option value="طبق">طبق بيض (30 بيضة)</option>
                  <option value="طائر">طائر جاهز للتسويق</option>
                  <option value="كجم">كيلوجرام (لحم وزن قائم)</option>
                </select>
              </div>
            </div>

            {/* Mortality, Feed & Water */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  النافق / الوفيات (طائر) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.mortalityCount}
                  onChange={(e) => setFormData({ ...formData, mortalityCount: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold text-rose-700"
                />
                <span className="text-[10px] text-slate-400">يُخصم تلقائياً من رصيد القطيع</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">العلف المستهلك (كجم)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.feedConsumedKg}
                  onChange={(e) => setFormData({ ...formData, feedConsumedKg: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المياه المستهلكة (لتر)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.waterConsumedLiters}
                  onChange={(e) => setFormData({ ...formData, waterConsumedLiters: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                />
              </div>
            </div>

            {/* Avg Weight & Climate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">متوسط وزن العينة (جرام)</label>
                <input
                  type="number"
                  value={formData.avgWeightG}
                  onChange={(e) => setFormData({ ...formData, avgWeightG: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">درجة الحرارة داخل العنبر (°م)</label>
                <input
                  type="number"
                  value={formData.temperatureC}
                  onChange={(e) => setFormData({ ...formData, temperatureC: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نسبة الرطوبة (%)</label>
                <input
                  type="number"
                  value={formData.humidityPct}
                  onChange={(e) => setFormData({ ...formData, humidityPct: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ملاحظات المشرف والحالة الصحية</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"
                placeholder="نشاط الطيور، انتظام الإضاءة والتهوية، التحصينات المعطاة..."
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'جاري الحفظ والخصم...' : 'حفظ سجل الإنتاج وتحديث القطيع'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Selected Flock Card Context */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              بيانات القطيع المختار حالياً
            </h2>

            {selectedFlock ? (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-mono font-black text-slate-900 block">
                    {selectedFlock.flock_code}
                  </span>
                  <div className="text-xs text-slate-600 font-semibold mt-1">
                    {selectedFlock.breed} — {selectedFlock.house_name}
                  </div>
                  <div className="text-[11px] text-slate-500">{selectedFlock.farm_name}</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">العدد الابتدائي عند التسكين:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedFlock.initial_count.toLocaleString('ar-EG')}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">العدد الحي الفعلي الحالي:</span>
                    <span className="font-mono font-black text-emerald-800 text-sm">
                      {selectedFlock.current_count.toLocaleString('ar-EG')} طائر
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">إجمالي الوفيات التراكمية:</span>
                    <span className="font-mono font-bold text-rose-700">{selectedFlock.total_mortality.toLocaleString('ar-EG')}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">تاريخ التسكين:</span>
                    <span className="font-mono text-slate-700">{selectedFlock.entry_date}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">الوزن المستهدف:</span>
                    <span className="font-mono text-slate-700">{selectedFlock.target_weight_g} جم</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                يرجى اختيار قطيع لعرض إحصاءاته
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 mt-4 leading-relaxed">
            <span className="font-bold block">ملاحظة أمان وتكامل (BR-01, FR-02):</span>
            تسجيل الوفيات يخصم فورياً من إجمالي الطيور الحية في قاعدة البيانات لحفظ توازن الأصول الحية.
          </div>
        </div>
      </div>

      {/* Historical Records Table (UI-03, FR-16) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              سجل حركات الإنتاج التاريخية (FR-16)
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {filteredRecords.length} سجل
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={filterFlock}
              onChange={(e) => setFilterFlock(e.target.value)}
              className="py-1 px-2.5 border border-slate-300 rounded-lg bg-slate-50"
            >
              <option value="all">جميع القطعان</option>
              {flocks.map(f => (
                <option key={`filter-flk-${f.id}`} value={f.id}>{f.flock_code}</option>
              ))}
            </select>

            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-[11px]"
              placeholder="من تاريخ"
            />
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-[11px]"
              placeholder="إلى تاريخ"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3 font-bold">التاريخ</th>
                <th className="py-2.5 px-3 font-bold">القطيع والعنبر</th>
                <th className="py-2.5 px-3 font-bold">الإنتاج</th>
                <th className="py-2.5 px-3 font-bold text-rose-700">الوفيات</th>
                <th className="py-2.5 px-3 font-bold">العلف (كجم)</th>
                <th className="py-2.5 px-3 font-bold">متوسط الوزن</th>
                <th className="py-2.5 px-3 font-bold">المشرف</th>
                <th className="py-2.5 px-3 font-bold">الملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => (
                <tr key={`dp-record-${r.id}`} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.record_date}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-slate-800">{r.flock_code}</span>
                    <span className="text-slate-400 mr-1">({r.house_name})</span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-800">
                    {r.production_quantity} {r.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-600">
                    {r.mortality_count}
                  </td>
                  <td className="py-2.5 px-3 font-mono">{r.feed_consumed_kg}</td>
                  <td className="py-2.5 px-3 font-mono">{r.avg_weight_g} جم</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.supervisor_name}</td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{r.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
