import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { transactions, categories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { MonthlyChart } from '@/components/analytics/MonthlyChart';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export default async function AnalyticsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Busca todas as transações confirmadas do usuário
  const userTxs = await db.select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, session.user.id),
        eq(transactions.status, 'confirmed')
      )
    );

  // Busca categorias
  const userCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));
  const categoryColorMap: Record<string, string> = {};
  userCategories.forEach(c => { categoryColorMap[c.name] = c.color; });

  // Agrupa transações por mês (MM/YYYY)
  const monthlyMap: Record<string, { income: number, expense: number, dateObj: Date }> = {};
  const categoryTotals: Record<string, number> = {};

  let totalIncome = 0;
  let totalExpense = 0;

  userTxs.forEach(tx => {
    const d = new Date(tx.createdAt);
    // Ex: "06/2026"
    const monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { income: 0, expense: 0, dateObj: d };
    }
    
    const val = parseFloat(tx.amount);
    if (tx.type === 'income') {
      monthlyMap[monthKey].income += val;
      totalIncome += val;
    } else {
      monthlyMap[monthKey].expense += val;
      totalExpense += val;
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + val;
    }
  });

  // Ordena os meses cronologicamente
  const sortedData = Object.entries(monthlyMap)
    .sort(([, a], [, b]) => a.dateObj.getTime() - b.dateObj.getTime())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense
    }));

  const pieData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      color: categoryColorMap[name] || '#64748b'
    }))
    .sort((a, b) => b.value - a.value);

  const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  return (
    <div className="py-2">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Análise <span className="text-gradient">Histórica</span>
        </h1>
        <p className="text-slate-400 mt-2">
          Visualize o seu desempenho financeiro ao longo do tempo e entenda para onde o seu dinheiro está indo.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Entradas Totais" amount={formatBRL(totalIncome)} icon={TrendingUp} trend="up" />
        <StatCard title="Saídas Totais" amount={formatBRL(totalExpense)} icon={TrendingDown} trend="down" />
        <StatCard title="Saldo Acumulado" amount={formatBRL(totalIncome - totalExpense)} icon={Wallet} isAccent />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyChart data={sortedData} />
        <CategoryPieChart data={pieData} />
      </div>
    </div>
  );
}
