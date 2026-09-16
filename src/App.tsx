import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { NotificationsDrawer } from './components/NotificationsDrawer.js';

// Views
import { LoginView } from './views/LoginView.js';
import { DashboardView } from './views/DashboardView.js';
import { HousesFlocksView } from './views/HousesFlocksView.js';
import { DailyProductionView } from './views/DailyProductionView.js';
import { RequisitionsView } from './views/RequisitionsView.js';
import { ProductsCustomersView } from './views/ProductsCustomersView.js';
import { SalesInvoicesView } from './views/SalesInvoicesView.js';
import { WarehouseSupplyView } from './views/WarehouseSupplyView.js';
import { ReportsView } from './views/ReportsView.js';
import { UsersManagementView } from './views/UsersManagementView.js';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm font-medium" dir="rtl">
        جاري تهيئة نظام إدارة الإنتاج...
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentView} />;
      case 'houses':
        return <HousesFlocksView onBack={() => setCurrentView('dashboard')} />;
      case 'daily-production':
        return <DailyProductionView onBack={() => setCurrentView('dashboard')} />;
      case 'requisitions':
        return <RequisitionsView initialTab="list" onBack={() => setCurrentView('dashboard')} />;
      case 'req-create':
        return <RequisitionsView initialTab="create" onBack={() => setCurrentView('requisitions')} />;
      case 'req-review':
        return <RequisitionsView initialTab="review" onBack={() => setCurrentView('requisitions')} />;
      case 'products-customers':
        return <ProductsCustomersView onBack={() => setCurrentView('dashboard')} />;
      case 'sales':
        return <SalesInvoicesView onBack={() => setCurrentView('dashboard')} />;
      case 'warehouse':
        return <WarehouseSupplyView onBack={() => setCurrentView('dashboard')} />;
      case 'reports':
        return <ReportsView onBack={() => setCurrentView('dashboard')} />;
      case 'users-management':
        return <UsersManagementView onBack={() => setCurrentView('dashboard')} />;
      default:
        return <DashboardView onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans" dir="rtl">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onToggleNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-(--breakpoint-2xl) w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* View Workspace Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {renderCurrentView()}
        </main>
      </div>

      {/* Slide-over Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
