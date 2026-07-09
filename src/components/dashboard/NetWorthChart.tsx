'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface HistoryPoint {
  month: string;
  valor: number;
}

export function NetWorthChart({ history }: { history: HistoryPoint[] }) {
  if (history.length === 0) {
    return (
      <div className="glass-panel p-6 rounded-2xl h-full flex flex-col justify-center items-center text-center">
        <h3 className="text-sm font-semibold text-slate-400 mb-2">Patrimônio</h3>
        <p className="text-slate-500 text-xs">Adicione contas ou transações para ver o gráfico.</p>
      </div>
    );
  }

  // Format value for tooltip
  const formatTooltip = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col h-full min-h-[220px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-300">Patrimônio</h3>
        <span className="text-[10px] text-neutral-500 font-medium">Últimos 6 meses</span>
      </div>
      
      <div className="flex-1 w-full relative min-h-[140px] text-[10px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              stroke="#52525b" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 9, fill: '#71717a' }} 
            />
            <YAxis 
              stroke="#52525b" 
              tickLine={false} 
              axisLine={false} 
              domain={['auto', 'auto']}
              tickFormatter={(v) => {
                const abs = Math.abs(v);
                const sign = v < 0 ? '-' : '';
                return `R$ ${sign}${abs >= 1000 ? `${(abs/1000).toFixed(0)}k` : abs}`;
              }}
              tick={{ fontSize: 9, fill: '#71717a' }} 
            />
            <Tooltip 
              formatter={(value) => [formatTooltip(Number(value)), "Patrimônio"]}
              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px', color: '#f4f4f5' }}
              itemStyle={{ color: '#f4f4f5' }}
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke="#ffffff"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorNetWorth)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
