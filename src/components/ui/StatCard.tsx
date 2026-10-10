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
  colorTheme: 'emerald' | 'amber' | 'blue' | 'rose' | 'purple' | 'slate';
}

const themeClasses = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200'
};

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorTheme
}) => {
  return (
    <div
      id={id}
      className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-start justify-between gap-3 transition-all hover:shadow-md"
    >
      <div className="space-y-1 min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 truncate">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight break-words">
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 pt-1">
            <span
              className={`text-xs font-semibold ${
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}
            </span>
          </div>
        )}
      </div>
      <div className={`p-2.5 sm:p-3 rounded-xl border shrink-0 ${themeClasses[colorTheme]}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    </div>
  );
};
