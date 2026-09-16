import React, { useState, useEffect } from 'react';
import { X, CheckCheck, Bell, AlertTriangle, CheckCircle, Info, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../api.js';
import { NotificationItem } from '../types.js';

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      if (res.success) {
        const unique = Array.from(new Map((res.notifications || []).map((n: any) => [n.id, n])).values());
        setNotifications(unique);
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

  const filtered = filter === 'unread' ? notifications.filter(n => n.is_read === 0) : notifications;
  const unreadCount = notifications.filter(n => n.is_read === 0).length;

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

        {/* Filter Pills */}
        <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-white">
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
        </div>

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
