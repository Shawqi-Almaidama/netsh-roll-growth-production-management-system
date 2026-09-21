import React, { useState, useEffect } from 'react';
import { Bell, LogOut, ShieldCheck, ChevronDown, Check, UserCircle2, Sprout, Menu } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext.js';
import { api } from '../../api.js';

interface NavbarProps {
  onToggleNotifications: () => void;
  onNavigate: (view: string) => void;
  onToggleMobileSidebar: () => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleNotifications,
  onNavigate,
  onToggleMobileSidebar,
  currentView
}) => {
  const { user, logout, quickSwitchUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const res = await api.getNotifications();
        if (res.success) {
          setUnreadCount(res.unreadCount);
        }
      } catch {
        // silent fail
      }
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      id="main-navbar"
      className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 shadow-xs"
      dir="rtl"
    >
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm tracking-tight">نتش رول جروث</span>
              <span className="text-slate-400 font-normal select-none leading-none">—</span>
              <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                نظام الإنتاج
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5 hidden sm:block">
              نظام إدارة قسم الإنتاج والمزارع الداجنة
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls: Notifications, Role Switcher, Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Bell */}
        <button
          type="button"
          onClick={onToggleNotifications}
          className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="الإشعارات والتنبيهات"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Team Member Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 py-1 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-all text-right"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
              {user?.fullName?.slice(0, 2) || 'ع'}
            </div>
            <div className="hidden lg:block text-right">
              <div className="text-xs font-bold text-slate-900 leading-tight">{user?.fullName}</div>
              <div className="text-[10px] text-emerald-700 font-medium leading-none">{user?.roleNameAr}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div
              className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95"
              onClick={() => setShowRoleMenu(false)}
            >
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  التبديل بين أعضاء الفريق المعتمدين
                </p>
              </div>

              <div className="py-1">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isActive = user?.username === acc.username;
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => quickSwitchUser(acc.username)}
                      className={`w-full px-3 py-2 text-right flex items-center justify-between text-xs transition-colors ${
                        isActive ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                            isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {acc.avatarText}
                        </div>
                        <div>
                          <div className="font-semibold">{acc.fullName}</div>
                          <div className="text-[10px] text-slate-400">{acc.roleNameAr}</div>
                        </div>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
