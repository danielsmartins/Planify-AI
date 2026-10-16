import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  amount: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isAccent?: boolean;
  subtitle?: string;
  badge?: string;
}

export function StatCard({
  title,
  amount,
  icon: Icon,
  trend,
  trendValue,
  isAccent,
  subtitle,
  badge,
}: StatCardProps) {
  return (
    <div
      className={`h-full flex flex-col justify-between glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isAccent ? 'border-brand/30' : ''
      }`}
    >
      {isAccent && (
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-brand opacity-20 blur-3xl rounded-full" />
      )}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-slate-400 line-clamp-1">{title}</p>
            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand-light border border-brand/20">
                {badge}
              </span>
            )}
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50">{amount}</h3>
        </div>
        <div
          className={`p-3 rounded-xl ${
            isAccent ? 'bg-brand/20 text-brand-light' : 'bg-slate-800/50 text-slate-300'
          }`}
        >
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>

      {subtitle && (
        <p className="text-xs text-slate-400 mt-2 font-medium">{subtitle}</p>
      )}

      {trend && trendValue && (
        <div className="flex items-center text-sm mt-3">
          <span
            className={`font-medium ${
              trend === 'up'
                ? 'text-emerald-400'
                : trend === 'down'
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '-'} {trendValue}
          </span>
          <span className="text-slate-500 ml-2">vs último mês</span>
        </div>
      )}
    </div>
  );
}
