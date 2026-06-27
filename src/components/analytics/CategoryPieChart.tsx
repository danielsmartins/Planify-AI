'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center">
        <p className="text-slate-400">Nenhuma despesa para gerar o gráfico de categorias.</p>
      </div>
    );
  }

  const formatBRL = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  return (
    <div className="glass-panel p-6 rounded-2xl h-[400px] w-full">
      <h3 className="text-lg font-bold mb-6">Despesas por Categoria (Total)</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
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
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
