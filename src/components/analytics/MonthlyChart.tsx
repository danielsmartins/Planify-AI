'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  invested?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: MonthlyData & { net: number } }[];
  label?: string;
}

const formatBRL = (value: number) => {
  const sign = value < 0 ? '-' : '';
  return `${sign}R$ ${Math.abs(value).toFixed(2).replace('.', ',')}`;
};

function CustomMonthlyTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const currentItem = payload[0]?.payload;
  if (!currentItem) return null;

  const { income, expense, net, invested = 0 } = currentItem;
  const isSurplus = net >= 0;
  const realSaved = net + invested;
  const realSavingsRate = income > 0 ? (realSaved / income) * 100 : 0;

  return (
    <div className="bg-[#121212] border border-neutral-800 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[190px]">
      <p className="font-semibold text-neutral-200 border-b border-neutral-800/80 pb-1 mb-1">{label}</p>
      <div className="flex justify-between items-center gap-3">
        <span className="text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Entradas:
        </span>
        <span className="font-medium text-white">{formatBRL(income)}</span>
      </div>
      <div className="flex justify-between items-center gap-3">
        <span className="text-rose-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          Saídas:
        </span>
        <span className="font-medium text-white">{formatBRL(expense)}</span>
      </div>
      {invested > 0 && (
        <div className="flex justify-between items-center gap-3">
          <span className="text-sky-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
            Investimentos:
          </span>
          <span className="font-medium text-white">{formatBRL(invested)}</span>
        </div>
      )}
      <div className="border-t border-neutral-800/80 pt-1.5 mt-1 flex justify-between items-center gap-3">
        <span className="text-neutral-400 font-medium">Resultado do Mês:</span>
        <span className={`font-bold ${isSurplus ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isSurplus ? `+${formatBRL(net)}` : formatBRL(net)}
        </span>
      </div>
      {income > 0 && (
        <div className="text-[10px] text-neutral-400 text-right pt-0.5">
          {invested > 0 ? (
            <span className="text-sky-400 font-medium">
              Poupança Real (Invest. + Caixa): {realSavingsRate.toFixed(1)}%
            </span>
          ) : isSurplus ? (
            <span className="text-emerald-400/90 font-medium">
              Poupança: {((net / income) * 100).toFixed(1)}%
            </span>
          ) : (
            <span className="text-rose-400/90 font-medium">
              Déficit: {Math.abs((net / income) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function MonthlyChart({ data }: { data: MonthlyData[] }) {
  const [viewMode, setViewMode] = useState<'comparison' | 'net'>('comparison');

  if (data.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center">
        <p className="text-slate-400">Não há transações suficientes para gerar o gráfico histórico.</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    net: item.income - item.expense,
  }));

  return (
    <div className="glass-panel p-6 rounded-2xl h-[420px] w-full flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold">
            {viewMode === 'comparison' ? 'Entradas vs Saídas' : 'Resultado Líquido Mensal'}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {viewMode === 'comparison'
              ? 'Comparativo mensal de receitas e despesas'
              : 'Superávit (verde) e Déficit (vermelho) de cada mês'}
          </p>
        </div>

        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('comparison')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              viewMode === 'comparison'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Entradas vs Saídas
          </button>
          <button
            type="button"
            onClick={() => setViewMode('net')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              viewMode === 'net'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Resultado Líquido
          </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'comparison' ? (
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke="#737373" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#737373" 
                fontSize={12}
                tickFormatter={(value) => `R$ ${value}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomMonthlyTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
              <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <ReferenceLine y={0} stroke="#525252" strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                stroke="#737373" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#737373" 
                fontSize={12}
                tickFormatter={(value) => `R$ ${value}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomMonthlyTooltip />} />
              <Bar dataKey="net" name="Saldo Líquido" radius={4}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.net >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
