import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Bell,
  LogOut,
  CheckCheck,
  ShieldAlert,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  ServerCrash,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { AuthProvider, useAuth, RoleCode } from './context/AuthContext.js';
import { Sidebar, navItems } from './components/layout/Sidebar.js';
import { LoginView } from './views/LoginView.js';
import { DashboardView } from './views/DashboardView.js';
import { HousesFlocksView } from './views/HousesFlocksView.js';
import { DailyProductionView } from './views/DailyProductionView.js';
import { RequisitionsView } from './views/RequisitionsView.js';
import { SalesInvoicesView } from './views/SalesInvoicesView.js';
import { WarehouseSupplyView } from './views/WarehouseSupplyView.js';
import { ProductsCustomersView } from './views/ProductsCustomersView.js';
import { ReportsView } from './views/ReportsView.js';
import { UsersManagementView } from './views/UsersManagementView.js';
import { api, GlobalErrorType } from './api.js';

const viewPermissions: Record<string, RoleCode[]> = {
  'dashboard': ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT'],
  'houses-flocks': ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR'],
  'daily-production': ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR'],
  'requisitions': ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR', 'WAREHOUSE_KEEPER'],
  'sales': ['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT'],
  'warehouse': ['ADMIN', 'WAREHOUSE_KEEPER', 'PROD_MANAGER'],
  'products-customers': ['ADMIN', 'PROD_MANAGER', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT'],
  'reports': ['ADMIN', 'PROD_MANAGER', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT'],
  'users-management': ['ADMIN']
};

const MainApp: React.FC = () => {
  const { user, loading, logout, hasRole } = useAuth();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Global System & Connection Status State
  const [systemBanner, setSystemBanner] = useState<{
    type: GlobalErrorType;
    message: string;
    timestamp: number;
  } | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean>(true);
  const [retryingConnection, setRetryingConnection] = useState<boolean>(false);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
      setServerOnline(true);
    } catch {
      // Handled via global event listener
    }
  };

  const checkSystemHealth = async () => {
    try {
      setRetryingConnection(true);
      const res = await fetch('/api/health');
      if (res.ok) {
        setServerOnline(true);
        setSystemBanner((prev) =>
          prev?.type === 'NETWORK_ERROR' || prev?.type === 'SERVER_ERROR' ? null : prev
        );
        if (user) {
          await loadNotifications();
        }
      } else {
        setServerOnline(false);
      }
    } catch {
      setServerOnline(false);
    } finally {
      setRetryingConnection(false);
    }
  };

  useEffect(() => {
    const handleApiError = (e: Event) => {
      const customEvent = e as CustomEvent<{
        type: GlobalErrorType;
        status: number;
        message: string;
        endpoint: string;
      }>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.type === 'NETWORK_ERROR') {
        setServerOnline(false);
      }

      if (detail.endpoint === '/auth/login' && detail.type !== 'NETWORK_ERROR') {
        return;
      }

      setSystemBanner({
        type: detail.type,
        message: detail.message,
        timestamp: Date.now()
      });
    };

    const handleOnline = () => {
      checkSystemHealth();
    };

    const handleOffline = () => {
      setServerOnline(false);
      setSystemBanner({
        type: 'NETWORK_ERROR',
        message: 'انقطع الاتصال بالشبكة المحلية أو الخادم. يرجى التحقق من الاتصال.',
        timestamp: Date.now()
      });
    };

    window.addEventListener('nrg:api-error', handleApiError);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('nrg:api-error', handleApiError);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [user, activeView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-300 font-medium">جاري التحقق من الجلسة والصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir="rtl">
        {systemBanner && (
          <div className="fixed top-4 left-4 right-4 z-50 max-w-xl mx-auto bg-rose-950/95 border border-rose-700 text-rose-100 px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-bold">{systemBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSystemBanner(null)}
              className="px-2 py-1 rounded bg-rose-900 hover:bg-rose-800 text-rose-200 font-semibold shrink-0"
            >
              إغلاق
            </button>
          </div>
        )}
        <LoginView />
      </div>
    );
  }

  const allowedForCurrentView = viewPermissions[activeView] || [];
  const isAuthorized = hasRole(...allowedForCurrentView);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await loadNotifications();
    } catch {
      // Handled globally
    }
  };

  const renderActiveView = () => {
    if (!isAuthorized) {
      return (
        <div className="p-6 sm:p-12 my-6 sm:my-8 bg-white rounded-2xl border border-rose-200 text-center max-w-md mx-auto space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">غير مصرح بالوصول (403)</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            عذراً، دورك الوظيفي ({user.roleNameAr}) لا يمتلك صلاحية استعراض هذه الوحدة وفق مصفوفة الصلاحيات المعتمدة.
          </p>
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className="px-4 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-xl hover:bg-emerald-900 transition-colors"
          >
            العودة إلى لوحة التحكم
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveView} />;
      case 'houses-flocks':
        return <HousesFlocksView />;
      case 'daily-production':
        return <DailyProductionView />;
      case 'requisitions':
        return <RequisitionsView />;
      case 'sales':
        return <SalesInvoicesView />;
      case 'warehouse':
        return <WarehouseSupplyView />;
      case 'products-customers':
        return <ProductsCustomersView />;
      case 'reports':
        return <ReportsView />;
      case 'users-management':
        return <UsersManagementView />;
      default:
        return <DashboardView onNavigate={setActiveView} />;
    }
  };

  const currentNavLabel = navItems.find((i) => i.id === activeView)?.label || 'لوحة التحكم';

  const getBannerConfig = (type: GlobalErrorType) => {
    switch (type) {
      case 'NETWORK_ERROR':
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-900',
          icon: WifiOff,
          iconColor: 'text-rose-600',
          title: 'انقطاع الاتصال بالخادم (Network / Server Unreachable)'
        };
      case 'SERVER_ERROR':
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-900',
          icon: ServerCrash,
          iconColor: 'text-rose-600',
          title: 'خطأ في الخادم أو قاعدة البيانات (Server Error)'
        };
      case 'FORBIDDEN':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-900',
          icon: ShieldAlert,
          iconColor: 'text-amber-600',
          title: 'رفض الوصول بسبب الصلاحيات (403 Forbidden)'
        };
      case 'AUTH_EXPIRED':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-900',
          icon: KeyRound,
          iconColor: 'text-amber-600',
          title: 'انتهاء صلاحية الجلسة (401 Session Expired)'
        };
      default:
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-900',
          icon: AlertCircle,
          iconColor: 'text-rose-600',
          title: 'تنبيه تنفيذي من النظام'
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col overflow-x-hidden" dir="rtl">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'lg:mr-20' : 'lg:mr-64'
        }`}
      >
        {/* Top Navbar */}
        <header
          id="main-navbar"
          className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              id="btn-mobile-menu"
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="فتح القائمة الجانبية"
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                  {currentNavLabel}
                </h2>
                <span className="sm:hidden px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                  {user.roleNameAr}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                {new Date().toLocaleDateString('ar-YE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Server Connection Status Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                serverOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
              title={serverOnline ? 'الخادم وقاعدة البيانات متصلان' : 'تعذر الاتصال بالخادم'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{serverOnline ? 'متصل' : 'غير متصل'}</span>
            </div>

            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                id="btn-notifications"
                type="button"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                aria-label="الإشعارات والتنبيهات"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div className="fixed sm:absolute left-3 right-3 sm:left-0 sm:right-auto top-16 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">الإشعارات والتنبيهات</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 py-1 px-1.5 rounded hover:bg-emerald-50"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>تحديد الكل كمقروء</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">لا توجد إشعارات حالياً</div>
                    ) : (
                      notifications.map((n) => {
                        const isLowStockNotif = n.type === 'LOW_STOCK_ALERT';
                        return (
                          <div
                            key={n.id}
                            onClick={async () => {
                              if (!n.is_read) {
                                await api.markNotificationRead(n.id);
                                loadNotifications();
                              }
                              if (isLowStockNotif && hasRole('ADMIN', 'PROD_MANAGER', 'SALES_OFFICER', 'WAREHOUSE_KEEPER')) {
                                setActiveView('products-customers');
                                setShowNotifMenu(false);
                              }
                            }}
                            className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                              !n.is_read
                                ? isLowStockNotif
                                  ? 'bg-rose-50/60 border-r-3 border-r-rose-600'
                                  : 'bg-emerald-50/40'
                                : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span
                                className={`font-bold flex items-center gap-1 ${
                                  isLowStockNotif ? 'text-rose-800' : 'text-slate-900'
                                }`}
                              >
                                {isLowStockNotif && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                <span>{n.title}</span>
                              </span>
                              {!n.is_read && (
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    isLowStockNotif ? 'bg-rose-600' : 'bg-emerald-600'
                                  }`}
                                />
                              )}
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-slate-400">
                                {n.created_at?.slice(0, 16).replace('T', ' ')}
                              </span>
                              {isLowStockNotif && (
                                <span className="text-[10px] font-bold text-rose-700">
                                  فحص الرصيد ←
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* User Badge & Logout */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none">{user.fullName}</p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">{user.roleNameAr}</p>
              </div>
              <button
                id="btn-logout"
                type="button"
                onClick={logout}
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 h-10 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">خروج</span>
              </button>
            </div>
          </div>
        </header>

        {/* Global Operational / Connection Error Banner */}
        {systemBanner && (
          <div className="px-3 sm:px-6 pt-3">
            {(() => {
              const cfg = getBannerConfig(systemBanner.type);
              const BannerIcon = cfg.icon;
              return (
                <div
                  className={`max-w-7xl mx-auto w-full rounded-xl border p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${cfg.bg}`}
                >
                  <div className="flex items-start gap-2.5">
                    <BannerIcon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.iconColor}`} />
                    <div>
                      <p className="font-bold">{cfg.title}</p>
                      <p className="mt-0.5 opacity-90">{systemBanner.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {(systemBanner.type === 'NETWORK_ERROR' || systemBanner.type === 'SERVER_ERROR') && (
                      <button
                        type="button"
                        onClick={checkSystemHealth}
                        disabled={retryingConnection}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 border border-slate-300 font-bold transition-colors shadow-2xs disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${retryingConnection ? 'animate-spin' : ''}`} />
                        <span>إعادة فحص الاتصال</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSystemBanner(null)}
                      className="px-3 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 font-semibold transition-colors"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto min-w-0">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
