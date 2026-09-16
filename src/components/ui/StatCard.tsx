import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorTheme?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'slate';
}

const colorMap = {
  emerald: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', iconBg: 'bg-emerald-600 text-white' },
  blue: { bg: 'bg-blue-50 text-blue-700 border-blue-100', iconBg: 'bg-blue-600 text-white' },
  amber: { bg: 'bg-amber-50 text-amber-700 border-amber-100', iconBg: 'bg-amber-600 text-white' },
  purple: { bg: 'bg-purple-50 text-purple-700 border-purple-100', iconBg: 'bg-purple-600 text-white' },
  rose: { bg: 'bg-rose-50 text-rose-700 border-rose-100', iconBg: 'bg-rose-600 text-white' },
  slate: { bg: 'bg-slate-50 text-slate-700 border-slate-200', iconBg: 'bg-slate-700 text-white' }
};

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorTheme = 'slate'
}) => {
  const theme = colorMap[colorTheme] || colorMap.slate;

  return (
    <div
      id={id}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</p>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${theme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center text-xs">
          <span className={`font-semibold ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.value}
          </span>
          <span className="text-slate-400 mr-1.5">مقارنة بالفترة السابقة</span>
        </div>
      )}
    </div>
  );
};
