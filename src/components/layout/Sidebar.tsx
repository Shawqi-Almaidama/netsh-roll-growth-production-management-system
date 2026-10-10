import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Home,
  Egg,
  ClipboardList,
  ShoppingCart,
  Warehouse,
  Package,
  FileBarChart,
  Users,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth, RoleCode } from '../../context/AuthContext.js';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  allowedRoles: RoleCode[];
}

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT']
  },
  {
    id: 'houses-flocks',
    label: 'الهناجر والقطعان',
    icon: Home,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR']
  },
  {
    id: 'daily-production',
    label: 'الإنتاج اليومي',
    icon: Egg,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR']
  },
  {
    id: 'requisitions',
    label: 'الطلبات',
    icon: ClipboardList,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR', 'WAREHOUSE_KEEPER']
  },
  {
    id: 'sales',
    label: 'المبيعات والفواتير',
    icon: ShoppingCart,
    allowedRoles: ['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT']
  },
  {
    id: 'warehouse',
    label: 'المخازن والتوريد',
    icon: Warehouse,
    allowedRoles: ['ADMIN', 'WAREHOUSE_KEEPER', 'PROD_MANAGER']
  },
  {
    id: 'products-customers',
    label: 'الأصناف والعملاء',
    icon: Package,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT']
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: FileBarChart,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT']
  },
  {
    id: 'users-management',
    label: 'إدارة المستخدمين',
    icon: Users,
    allowedRoles: ['ADMIN']
  }
];

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { user, hasRole } = useAuth();

  const visibleItems = navItems.filter((item) => hasRole(...item.allowedRoles));

  useEffect(() => {
    if (!isMobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen, setIsMobileOpen]);

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        id="main-sidebar"
        aria-label="القائمة الجانبية"
        className={`fixed top-0 right-0 h-full bg-slate-900 text-slate-100 z-50 transition-all duration-300 ease-in-out flex flex-col border-l border-slate-800 ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${isMobileOpen ? 'w-72 sm:w-64 translate-x-0 shadow-2xl' : 'w-72 sm:w-64 translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/50">
              <Egg className="w-6 h-6 text-white" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-wide text-white truncate">
                  نتش رول جروث
                </span>
                <span className="text-[11px] text-emerald-400 font-medium truncate">
                  نظام إدارة قسم الإنتاج
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="إغلاق القائمة الجانبية"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile User Identity Card */}
        {user && (!isCollapsed || isMobileOpen) && (
          <div className="lg:hidden px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">@{user.username}</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 shrink-0">
              {user.roleNameAr}
            </span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto overscroll-contain">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-medium transition-all duration-150 min-h-[44px] ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-950/50 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Role Security Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-slate-300 truncate">
                  صلاحيات محمية (RBAC)
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  توثيق الجلسة مفعل
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
