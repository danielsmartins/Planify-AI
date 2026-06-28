'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export function BudgetPieChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return null; // Don't show if no limits are configured
  }

  const formatBRL = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  return (
    <div className="glass-panel p-6 rounded-2xl h-[350px] w-full max-w-lg mx-auto mt-8">
      <h3 className="text-lg font-bold mb-4 text-center">Distribuição do Planejamento</h3>
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => formatBRL(Number(value))}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
