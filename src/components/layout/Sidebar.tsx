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
  X,
  MoreHorizontal
} from 'lucide-react';
import { useAuth, RoleCode } from '../../context/AuthContext.js';

export interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  section: string;
  icon: React.ElementType;
  allowedRoles: RoleCode[];
}

export const REPORT_ALLOWED_ROLES: RoleCode[] = ['ADMIN', 'PROD_MANAGER', 'ACCOUNTANT'];

export const navSections = [
  { id: 'MAIN', title: 'الرئيسية والمتابعة' },
  { id: 'PRODUCTION', title: 'إدارة العمليات والإنتاج' },
  { id: 'COMMERCE_WAREHOUSE', title: 'المبيعات والمخازن والأصناف' },
  { id: 'REPORTS_ADMIN', title: 'التقارير والإدارة العامة' }
];

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    shortLabel: 'الرئيسية',
    section: 'MAIN',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT']
  },
  {
    id: 'houses-flocks',
    label: 'الهناجر والقطعان',
    shortLabel: 'الهناجر',
    section: 'PRODUCTION',
    icon: Home,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR']
  },
  {
    id: 'daily-production',
    label: 'الإنتاج اليومي',
    shortLabel: 'الإنتاج',
    section: 'PRODUCTION',
    icon: Egg,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR']
  },
  {
    id: 'requisitions',
    label: 'الطلبات',
    shortLabel: 'الطلبات',
    section: 'PRODUCTION',
    icon: ClipboardList,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SUPERVISOR', 'WAREHOUSE_KEEPER']
  },
  {
    id: 'sales',
    label: 'المبيعات والفواتير',
    shortLabel: 'المبيعات',
    section: 'COMMERCE_WAREHOUSE',
    icon: ShoppingCart,
    allowedRoles: ['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT']
  },
  {
    id: 'warehouse',
    label: 'المخازن والتوريد',
    shortLabel: 'المخازن',
    section: 'COMMERCE_WAREHOUSE',
    icon: Warehouse,
    allowedRoles: ['ADMIN', 'WAREHOUSE_KEEPER', 'PROD_MANAGER']
  },
  {
    id: 'products-customers',
    label: 'المنتجات والعملاء',
    shortLabel: 'المنتجات',
    section: 'COMMERCE_WAREHOUSE',
    icon: Package,
    allowedRoles: ['ADMIN', 'PROD_MANAGER', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT']
  },
  {
    id: 'reports',
    label: 'التقارير',
    shortLabel: 'التقارير',
    section: 'REPORTS_ADMIN',
    icon: FileBarChart,
    allowedRoles: REPORT_ALLOWED_ROLES
  },
  {
    id: 'users-management',
    label: 'إدارة المستخدمين',
    shortLabel: 'المستخدمون',
    section: 'REPORTS_ADMIN',
    icon: Users,
    allowedRoles: ['ADMIN']
  }
];

export const viewPermissions: Record<string, RoleCode[]> = Object.fromEntries(
  navItems.map((item) => [item.id, item.allowedRoles])
);

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
        className={`fixed top-0 right-0 h-full bg-slate-900 text-slate-100 z-50 transition-all duration-300 ease-in-out flex flex-col border-l border-slate-800 print:hidden ${
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

        {/* Navigation Links Grouped by Section */}
        <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto overscroll-contain">
          {navSections.map((sec) => {
            const sectionItems = visibleItems.filter((item) => item.section === sec.id);
            if (sectionItems.length === 0) return null;

            return (
              <div key={sec.id} className="space-y-1">
                {(!isCollapsed || isMobileOpen) ? (
                  <div className="px-3 pb-1 pt-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {sec.title}
                  </div>
                ) : (
                  <div className="mx-2 my-1 border-t border-slate-800/80" />
                )}
                {sectionItems.map((item) => {
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 min-h-[42px] ${
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
              </div>
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

interface MobileBottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { hasRole } = useAuth();
  const visibleItems = navItems.filter((item) => hasRole(...item.allowedRoles));

  if (visibleItems.length === 0) return null;

  const hasOverflow = visibleItems.length > 5;
  let primaryItems: NavItem[];

  if (!hasOverflow) {
    primaryItems = visibleItems;
  } else {
    const firstThree = visibleItems.slice(0, 3);
    const overflowItems = visibleItems.slice(3);
    const activeInOverflow = overflowItems.find((item) => item.id === activeView);
    const fourthItem = activeInOverflow || visibleItems[3];
    primaryItems = [...firstThree, fourthItem];
  }

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="شريط التنقل السفلي للهاتف"
      dir="rtl"
      className="lg:hidden print:hidden fixed bottom-0 right-0 left-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.08)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch justify-around h-16 px-1 max-w-md mx-auto">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id && !isMobileOpen;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              type="button"
              onClick={() => {
                setActiveView(item.id);
                setIsMobileOpen(false);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-w-0 px-1 py-1.5 rounded-xl transition-colors relative ${
                isActive
                  ? 'text-emerald-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 inset-x-3 h-0.5 rounded-b-full bg-emerald-700" />
              )}
              <div
                className={`px-3 py-1 rounded-full transition-colors ${
                  isActive ? 'bg-emerald-100/90 text-emerald-800' : 'text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[10px] leading-tight truncate max-w-full">
                {item.shortLabel}
              </span>
            </button>
          );
        })}

        {hasOverflow && (
          <button
            id="mobile-nav-more"
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-expanded={isMobileOpen}
            aria-label="فتح جميع أقسام النظام"
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-w-0 px-1 py-1.5 rounded-xl transition-colors relative ${
              isMobileOpen
                ? 'text-emerald-800 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            {isMobileOpen && (
              <span className="absolute top-0 inset-x-3 h-0.5 rounded-b-full bg-emerald-700" />
            )}
            <div
              className={`px-3 py-1 rounded-full transition-colors ${
                isMobileOpen ? 'bg-emerald-100/90 text-emerald-800' : 'text-slate-500'
              }`}
            >
              <MoreHorizontal className="w-4 h-4 shrink-0" />
            </div>
            <span className="text-[10px] leading-tight truncate max-w-full">المزيد</span>
          </button>
        )}
      </div>
    </nav>
  );
};
