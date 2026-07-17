'use client';

import React from 'react';
import { Send, CheckCircle2, Info, RefreshCw } from 'lucide-react';

const activities = [
  { text: 'Telegram bot conectado e ativo', icon: <Send size={12} className="text-[#0088cc]" />, bg: 'bg-[#0088cc]/10 border-[#0088cc]/20' },
  { text: 'Despesa registrada: Almoço R$ 45,90', icon: <CheckCircle2 size={12} className="text-emerald-400" />, bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { text: 'Fatura Nubank PDF importada por IA', icon: <Info size={12} className="text-violet-400" />, bg: 'bg-violet-500/10 border-violet-500/20' },
  { text: 'Insight IA: Gastos com alimentação reduzidos em 12%', icon: <RefreshCw size={12} className="text-amber-400" />, bg: 'bg-amber-500/10 border-amber-500/20' },
  { text: 'Receita confirmada: Salário R$ 5.000,00', icon: <CheckCircle2 size={12} className="text-emerald-400" />, bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { text: 'Orçamento mensal projetado atualizado', icon: <Info size={12} className="text-indigo-400" />, bg: 'bg-indigo-500/10 border-indigo-500/20' },
];

export function RecentActivityTicker() {
  // Duplicate activities to make the scroll seamless and infinite
  const doubleActivities = [...activities, ...activities];

  return (
    <div className="relative w-full overflow-hidden py-4 border-y border-neutral-900 bg-neutral-950/20 select-none">
      {/* Left & Right gradient fades to overlay edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      {/* Infinite scrolling line */}
      <div className="animate-ticker-infinite flex gap-6 px-4">
        {doubleActivities.map((act, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 border px-3 py-1.5 rounded-full ${act.bg} text-[11px] font-medium text-neutral-300 whitespace-nowrap shrink-0 shadow-sm`}
          >
            {act.icon}
            <span>{act.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
