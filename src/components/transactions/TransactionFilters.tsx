'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';

interface TransactionFiltersProps {
  currentMonth: string; // e.g. "2026-07" or "all"
}

export function TransactionFilters({ currentMonth }: TransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Gerar lista de meses de -6 a +12 a partir do mês atual + "Todos"
  const months = React.useMemo(() => {
    const now = new Date();
    const list = [{ value: 'all', label: 'Todos os meses' }];
    for (let i = -6; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      list.push({ value, label: capitalizedLabel });
    }
    return list;
  }, []);

  const updateParams = (newMonth: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    params.set('page', '1'); // Reseta para a primeira página ao filtrar
    router.push(`/transactions?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mb-8 bg-[#0a0a0a] border border-neutral-800 rounded-2xl">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-850 shrink-0 text-slate-400">
          <Calendar size={16} />
        </div>
        <div className="relative w-full sm:w-64">
          <select
            value={currentMonth}
            onChange={(e) => updateParams(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-850 hover:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-neutral-700 transition-colors appearance-none cursor-pointer pr-10"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 text-[9px]">
            ▼
          </div>
        </div>
      </div>
    </div>
  );
}
