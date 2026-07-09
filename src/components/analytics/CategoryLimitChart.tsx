'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target, AlertTriangle } from 'lucide-react';

interface LimitData {
  name: string;
  spent: number;
  limit: number;
  color: string;
}

interface CategoryLimitChartProps {
  data: LimitData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const spent = payload.find((p) => p.dataKey === 'spent')?.value || 0;
    const limit = payload.find((p) => p.dataKey === 'limit')?.value || 0;
    const isOver = limit > 0 && spent > limit;

    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
        <p className="font-medium text-slate-100 mb-2">{label}</p>
        <p className="text-sm text-slate-300">
          Gasto: <span className="font-semibold text-white">R$ {spent.toFixed(2)}</span>
        </p>
        {limit > 0 && (
          <p className="text-sm text-slate-400">
            Limite: <span className="font-medium">R$ {limit.toFixed(2)}</span>
          </p>
        )}
        {isOver && (
          <div className="mt-2 text-xs text-rose-400 flex items-center gap-1 font-medium bg-rose-400/10 p-1.5 rounded-lg">
            <AlertTriangle size={14} /> Estourou o limite!
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function CategoryLimitChart({ data }: CategoryLimitChartProps) {
  // If no data or all limits are 0, we can still show the spent amounts, 
  // but it's better to show an empty state if nothing is configured.
  const hasData = data.length > 0;

  return (
    <div className="glass-panel rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Target className="text-indigo-400" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold">Limites por Categoria</h2>
          <p className="text-xs text-slate-400">Como estão seus gastos do mês vs. seus limites</p>
        </div>
      </div>

      <div className="w-full" style={{ height: '350px' }}>
        {!hasData ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            Nenhuma despesa ou limite configurado neste mês.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              <Bar 
                dataKey="spent" 
                name="Gasto Atual" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="limit" 
                name="Limite Definido" 
                fill="#334155" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
