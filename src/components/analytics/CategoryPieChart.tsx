'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage?: string;
}

interface CategoryPieChartProps {
  data?: CategoryData[];
  allTimeData?: CategoryData[];
  monthlyData?: Record<string, CategoryData[]>;
  availableMonths?: string[];
}

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: { value?: number; name?: string; color?: string; payload?: CategoryData }[];
}

const formatBRL = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

function CustomPieTooltip({ active, payload }: CustomPieTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const val = Number(item.value || 0);
  const color = item.payload?.color || item.color || '#64748b';
  const pct = item.payload?.percentage || '0';

  return (
    <div className="bg-[#121212] border border-neutral-800 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[150px]">
      <div className="flex items-center gap-2 font-semibold text-neutral-200 border-b border-neutral-800/80 pb-1">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
        <span>{item.name}</span>
      </div>
      <div className="flex justify-between items-center gap-3 pt-0.5">
        <span className="text-neutral-400">Total:</span>
        <span className="font-semibold text-white">{formatBRL(val)}</span>
      </div>
      <div className="flex justify-between items-center gap-3">
        <span className="text-neutral-400">Proporção:</span>
        <span className="font-semibold text-indigo-400">{pct}%</span>
      </div>
    </div>
  );
}

export function CategoryPieChart({
  data,
  allTimeData,
  monthlyData = {},
  availableMonths = [],
}: CategoryPieChartProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const activeData = useMemo(() => {
    const raw = selectedMonth === 'all'
      ? (allTimeData || data || [])
      : (monthlyData[selectedMonth] || []);

    const sum = raw.reduce((acc, curr) => acc + curr.value, 0);
    return raw.map((item) => ({
      ...item,
      percentage: sum > 0 ? ((item.value / sum) * 100).toFixed(1) : '0',
    }));
  }, [selectedMonth, allTimeData, data, monthlyData]);

  const totalSpent = useMemo(() => {
    return activeData.reduce((acc, curr) => acc + curr.value, 0);
  }, [activeData]);

  const hasData = activeData.length > 0;

  return (
    <div className="glass-panel p-6 rounded-2xl h-[420px] w-full flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">Despesas por Categoria</h3>
            {hasData && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                {formatBRL(totalSpent)}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            {selectedMonth === 'all'
              ? 'Total acumulado em todo o histórico'
              : `Distribuição de gastos em ${selectedMonth}`}
          </p>
        </div>

        {availableMonths.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-neutral-500 hidden sm:inline font-medium">Mês:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Filtrar categoria por mês"
              className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
            >
              <option value="all">Todo o Histórico</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-400 text-sm">
          <p>Nenhuma despesa encontrada para {selectedMonth === 'all' ? 'o período' : selectedMonth}.</p>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-0 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {activeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
