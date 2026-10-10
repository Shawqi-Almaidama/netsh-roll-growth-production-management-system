import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Sprout, Menu, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
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
  onToggleMobileSidebar
}) => {
  const { user, logout, hasRole } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const canMonitorStock = hasRole('ADMIN', 'PROD_MANAGER', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT');

  useEffect(() => {
    const checkNotificationsAndStock = async () => {
      try {
        const res = await api.getNotifications();
        if (res.success) {
          setUnreadCount(res.unreadCount);
        }
      } catch {
        // silent fail
      }
      if (canMonitorStock) {
        try {
          const stockRes = await api.getLowStockAlerts();
          if (stockRes.success) {
            setLowStockCount(stockRes.count || 0);
          }
        } catch {
          // silent fail
        }
      }
    };
    checkNotificationsAndStock();
    const interval = setInterval(checkNotificationsAndStock, 15000);
    return () => clearInterval(interval);
  }, [canMonitorStock]);

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

      {/* Right Controls: Low Stock Indicator, Notifications, Current User Info, Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {canMonitorStock && lowStockCount > 0 && (
          <button
            type="button"
            onClick={() => {
              if (hasRole('ACCOUNTANT')) {
                onNavigate('reports');
              } else {
                onNavigate('products-customers');
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold transition-colors"
            title="تنبيهات المخزون المنخفض - اضغط للانتقال إلى المخزون"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span className="hidden md:inline">تنبيه مخزون:</span>
            <span className="font-mono font-black bg-rose-600 text-white px-1.5 py-0.2 rounded text-[10px]">
              {lowStockCount}
            </span>
          </button>
        )}

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

        {/* Current User Profile & Logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 py-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-right">
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
              {user?.fullName?.slice(0, 2) || 'ع'}
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-900 leading-tight">{user?.fullName}</div>
              <div className="text-[10px] text-emerald-700 font-medium leading-none">{user?.roleNameAr}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="تسجيل الخروج"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};
