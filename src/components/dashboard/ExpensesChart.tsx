'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

export function ExpensesChart({ data }: { data: ChartData[] }) {
  if (data.length === 0) {
    return (
      <div className="glass-panel p-6 rounded-2xl h-full flex flex-col justify-center items-center text-center">
        <h3 className="text-lg font-bold mb-2">Despesas por Categoria</h3>
        <p className="text-slate-500 text-sm">Adicione despesas para ver o gráfico.</p>
      </div>
    );
  }

  // Format value for tooltip
  const formatTooltip = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className="glass-panel p-6 rounded-2xl min-h-[350px] flex flex-col">
      <h3 className="text-lg font-bold mb-4">Despesas por Categoria</h3>
      <div className="flex-1 w-full relative min-h-[200px]">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
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
              formatter={(value) => [formatTooltip(Number(value)), "Valor"]}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-slate-300">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
