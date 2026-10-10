import React, { useState, useEffect } from 'react';
import { X, CheckCheck, Bell, AlertTriangle, CheckCircle, Info, AlertCircle, ArrowLeft, Search, Package } from 'lucide-react';
import { api } from '../api.js';
import { NotificationItem } from '../types.js';
import { useAuth } from '../context/AuthContext.js';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { hasRole } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'stock'>('all');
  const [searchKw, setSearchKw] = useState('');

  const canMonitorStock = hasRole('ADMIN', 'PROD_MANAGER', 'SALES_OFFICER', 'WAREHOUSE_KEEPER', 'ACCOUNTANT');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [res, stockRes] = await Promise.all([
        api.getNotifications(),
        canMonitorStock ? api.getLowStockAlerts().catch(() => ({ success: false, alerts: [] })) : Promise.resolve({ success: false, alerts: [] })
      ]);
      if (res.success) {
        const unique = Array.from(new Map((res.notifications || []).map((n: any) => [n.id, n])).values());
        setNotifications(unique);
      }
      if (stockRes && stockRes.success) {
        setLowStockAlerts(stockRes.alerts || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n)));
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread' && n.is_read !== 0) return false;
    if (filter === 'stock' && !n.title?.includes('مخزون') && !n.message?.includes('مخزون') && !n.link?.includes('products')) return false;
    if (searchKw.trim()) {
      const q = searchKw.trim().toLowerCase();
      return n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q);
    }
    return true;
  });
  const unreadCount = notifications.filter(n => n.is_read === 0).length;
  const stockNotifsCount = notifications.filter(
    (n) => n.title?.includes('مخزون') || n.message?.includes('مخزون') || n.link?.includes('products')
  ).length;

  const typeIcons = {
    INFO: <Info className="w-4 h-4 text-blue-600" />,
    SUCCESS: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    WARNING: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    ALERT: <AlertCircle className="w-4 h-4 text-rose-600" />
  };

  const typeBorders = {
    INFO: 'border-l-4 border-l-blue-500 bg-blue-50/20',
    SUCCESS: 'border-l-4 border-l-emerald-500 bg-emerald-50/20',
    WARNING: 'border-l-4 border-l-amber-500 bg-amber-50/20',
    ALERT: 'border-l-4 border-l-rose-500 bg-rose-50/20'
  };

  return (
    <div
      id="notifications-drawer-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-start"
      onClick={onClose}
    >
      <div
        id="notifications-drawer"
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">مركز الإشعارات والتحذيرات</h3>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                title="تحديد الكل كمقروء"
                className="p-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">قراءة الكل</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills & Instant Search */}
        <div className="p-3 border-b border-slate-100 space-y-2.5 bg-white">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === 'unread' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              غير المقروءة ({unreadCount})
            </button>
            {canMonitorStock && (
              <button
                type="button"
                onClick={() => setFilter('stock')}
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1 ${
                  filter === 'stock' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>تنبيهات المخزون ({lowStockAlerts.length || stockNotifsCount})</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2" />
            <input
              type="text"
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
              placeholder="بحث فوري في الإشعارات والتنبيهات..."
              className="w-full text-xs pr-8 pl-7 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
            />
            {searchKw && (
              <button
                type="button"
                onClick={() => setSearchKw('')}
                className="absolute left-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Active Low-Stock Products Summary */}
        {canMonitorStock && lowStockAlerts.length > 0 && (
          <div className="mx-3 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-900">
                <Package className="w-4 h-4 text-rose-600" />
                <span>أصناف تحت الحد الأدنى حالياً ({lowStockAlerts.length})</span>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(hasRole('ACCOUNTANT') ? 'reports' : 'products-customers');
                    onClose();
                  }}
                  className="text-[11px] font-bold text-rose-700 hover:underline"
                >
                  إدارة المخزون ←
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {lowStockAlerts.map((p: any) => (
                <div
                  key={`drawer-low-${p.id}`}
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate(hasRole('WAREHOUSE_KEEPER') ? 'warehouse' : 'products-customers');
                      onClose();
                    }
                  }}
                  className="bg-white p-2 rounded-lg border border-rose-200 flex items-center justify-between text-[11px] cursor-pointer hover:border-rose-400"
                >
                  <span className="font-bold text-slate-900">{p.product_name}</span>
                  <span className="font-mono font-bold text-rose-700">
                    الرصيد: {p.current_stock} / {p.min_stock_alert} {p.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">جاري تحميل الإشعارات...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
              <p className="text-xs font-medium">لا توجد إشعارات حالياً</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={`notif-item-${item.id}`}
                onClick={() => {
                  if (item.is_read === 0) handleMarkRead(item.id);
                  if (item.link && onNavigate) {
                    const cleanLink = item.link.replace('/', '');
                    onNavigate(cleanLink || 'dashboard');
                    onClose();
                  }
                }}
                className={`p-3 rounded-lg border transition-all cursor-pointer relative ${
                  item.is_read === 0 ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50/50 border-slate-100 opacity-80'
                } ${typeBorders[item.type] || ''} hover:border-emerald-300`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {typeIcons[item.type]}
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {item.created_at ? new Date(item.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.message}</p>
                {item.link && (
                  <div className="mt-2 flex items-center justify-end text-[11px] font-semibold text-emerald-700">
                    <span>عرض التفاصيل</span>
                    <ArrowLeft className="w-3 h-3 mr-1" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
