import React, { useState } from 'react';
import { Sprout, Lock, User, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext.js';

export const LoginView: React.FC = () => {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('supervisor1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول، يرجى التأكد من صحة البيانات');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (uname: string) => {
    setUsername(uname);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white items-center justify-center shadow-lg shadow-emerald-600/20 mb-2.5 sm:mb-3">
          <Sprout className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">شركة نتش رول جروث</h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">نظام إدارة قسم الإنتاج والمزارع الداجنة</p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 bg-emerald-50 text-emerald-800 rounded-full text-[11px] sm:text-xs font-semibold border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>تسجيل الدخول الآمن لنظام إدارة الإنتاج</span>
        </div>
      </div>

      <div className="mt-5 sm:mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-6 sm:py-8 px-4 sm:px-6 shadow-sm border border-slate-200 rounded-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 text-left focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                  placeholder="admin / supervisor1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 text-left focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors shadow-xs disabled:opacity-50"
            >
              <span>{submitting ? 'جاري التحقق...' : 'تسجيل الدخول للنظام'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access by Role */}
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs font-bold text-slate-700">حسابات مستخدمي النظام المعتمدين:</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium shrink-0">
                اختر الحساب ثم أدخل كلمة المرور
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = username === acc.username;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickLogin(acc.username)}
                    className={`p-2.5 border rounded-xl text-right transition-all group flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500/30'
                        : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-800 text-white group-hover:bg-emerald-700'
                      }`}
                    >
                      {acc.avatarText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{acc.fullName}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold truncate">{acc.roleNameAr}</div>
                      <div className="text-[10px] text-slate-400 font-mono" dir="ltr">@{acc.username}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          مشروع إدارة قسم الإنتاج — شركة نتش رول جروث © 2026
        </div>
      </div>
    </div>
  );
};
