import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  amount: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isAccent?: boolean;
}

export function StatCard({ title, amount, icon: Icon, trend, trendValue, isAccent }: StatCardProps) {
  return (
    <div className={`glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isAccent ? 'border-brand/30' : ''}`}>
      {isAccent && (
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-brand opacity-20 blur-3xl rounded-full" />
      )}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold tracking-tight text-slate-50">{amount}</h3>
        </div>
        <div className={`p-3 rounded-xl ${isAccent ? 'bg-brand/20 text-brand-light' : 'bg-slate-800/50 text-slate-300'}`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>
      
      {trend && trendValue && (
        <div className="flex items-center text-sm mt-4">
          <span className={`font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '-'} {trendValue}
          </span>
          <span className="text-slate-500 ml-2">vs último mês</span>
        </div>
      )}
    </div>
  );
}
