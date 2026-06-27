'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

export function MonthlyChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center">
        <p className="text-slate-400">Não há transações suficientes para gerar o gráfico histórico.</p>
      </div>
    );
  }

  const formatBRL = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  return (
    <div className="glass-panel p-6 rounded-2xl h-[400px] w-full">
      <h3 className="text-lg font-bold mb-6">Entradas vs Saídas (Últimos 12 meses)</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="month" 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12}
            tickFormatter={(value) => `R$ ${value}`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value) => formatBRL(Number(value))}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
