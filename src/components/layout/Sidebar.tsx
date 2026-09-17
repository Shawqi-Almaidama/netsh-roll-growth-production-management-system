import React from 'react';
import {
  LayoutDashboard,
  Home,
  Egg,
  ClipboardList,
  PackagePlus,
  CheckSquare,
  ShoppingCart,
  Warehouse,
  FileBarChart2,
  Users,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isMobileOpen,
  onCloseMobile
}) => {
  const { user, hasRole } = useAuth();

  const isSupervisor = hasRole('SUPERVISOR');
  const isProdMgr = hasRole('PROD_MGR', 'PROD_MANAGER');
  const isSales = hasRole('SALES_OFFICER');
  const isWarehouse = hasRole('WAREHOUSE_KEEPER');
  const isAccountant = hasRole('ACCOUNTANT');
  const isAdmin = hasRole('ADMIN');

  const navGroups = [
    {
      title: 'الرئيسية',
      items: [
        { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, visible: true }
      ]
    },
    {
      title: 'الإنتاج',
      items: [
        { id: 'houses', label: 'الهناجر والقطعان', icon: Home, visible: isSupervisor || isProdMgr || isAdmin },
        { id: 'daily-production', label: 'الإنتاج اليومي', icon: Egg, visible: isSupervisor || isProdMgr || isAdmin }
      ]
    },
    {
      title: 'طلبات الاحتياج',
      items: [
        { id: 'req-create', label: 'تقديم طلب جديد', icon: PackagePlus, visible: isSupervisor || isAdmin },
        { id: 'requisitions', label: 'متابعة الطلبات', icon: ClipboardList, visible: true },
        { id: 'req-review', label: 'مراجعة واعتماد الطلبات', icon: CheckSquare, visible: isProdMgr || isAdmin }
      ]
    },
    {
      title: 'المبيعات',
      items: [
        { id: 'products-customers', label: 'المنتجات والعملاء', icon: ShoppingCart, visible: isSales || isWarehouse || isAdmin },
        { id: 'sales', label: 'فواتير المبيعات', icon: ShoppingCart, visible: isSales || isAccountant || isAdmin }
      ]
    },
    {
      title: 'المخازن',
      items: [
        { id: 'warehouse', label: 'توريد المنتجات للمخازن', icon: Warehouse, visible: isWarehouse || isAccountant || isAdmin }
      ]
    },
    {
      title: 'التقارير التشغيلية',
      items: [
        { id: 'reports', label: 'التقارير', icon: FileBarChart2, visible: isProdMgr || isAccountant || isAdmin }
      ]
    },
    {
      title: 'الإدارة',
      items: [
        { id: 'users-management', label: 'المستخدمون والصلاحيات', icon: Users, visible: isAdmin }
      ]
    }
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    if (isMobileOpen) onCloseMobile();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="main-sidebar"
        className={`fixed lg:sticky top-0 lg:top-16 right-0 z-40 lg:z-10 h-full lg:h-[calc(100vh-4rem)] w-72 bg-white border-l border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        dir="rtl"
      >
        {/* User Profile Card in Sidebar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {user?.fullName?.slice(0, 2) || 'مش'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</h4>
              <p className="text-[11px] text-emerald-700 font-semibold truncate">{user?.roleNameAr}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.branchName || 'شركة نتش رول جروث'}</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronLeft className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
