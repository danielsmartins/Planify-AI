import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { transactions, categories } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { MonthlyChart } from '@/components/analytics/MonthlyChart';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { CategoryLimitChart } from '@/components/analytics/CategoryLimitChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { PdfReportButton } from '@/components/analytics/PdfReportButton';

export default async function AnalyticsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Busca todas as transações confirmadas do usuário (até o fim do mês atual)
  const userTxs = await db.select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, session.user.id),
        eq(transactions.status, 'confirmed'),
        sql`${transactions.createdAt} <= ${endOfMonth}`
      )
    );

  // Busca categorias
  const userCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));
  const categoryColorMap: Record<string, string> = {};
  const categoryLimitsMap: Record<string, number> = {};
  
  userCategories.forEach(c => { 
    categoryColorMap[c.name] = c.color; 
    categoryLimitsMap[c.name] = parseFloat(c.monthlyLimit || '0');
  });

  // Agrupa transações por mês (MM/YYYY)
  const monthlyMap: Record<string, { income: number, expense: number, dateObj: Date }> = {};
  const categoryTotals: Record<string, number> = {};

  let totalIncome = 0;
  let totalExpense = 0;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthCategoryTotals: Record<string, number> = {};

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
      
      // Se for do mês atual, soma para o gráfico de limites
      if (d >= startOfMonth && d <= endOfMonth) {
        currentMonthCategoryTotals[tx.category] = (currentMonthCategoryTotals[tx.category] || 0) + val;
      }
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

  // Prepara dados do gráfico de limites (apenas mês atual)
  const limitsData = Object.entries(categoryLimitsMap).map(([name, limit]) => {
    const spent = currentMonthCategoryTotals[name] || 0;
    return {
      name,
      spent,
      limit,
      color: categoryColorMap[name] || '#64748b'
    };
  }).filter(d => d.limit > 0 || d.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  return (
    <div className="py-2">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Análise <span className="text-gradient">Histórica</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Visualize o seu desempenho financeiro ao longo do tempo e entenda para onde o seu dinheiro está indo.
          </p>
        </div>
        <PdfReportButton />
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Entradas Totais" amount={formatBRL(totalIncome)} icon={TrendingUp} trend="up" />
        <StatCard title="Saídas Totais" amount={formatBRL(totalExpense)} icon={TrendingDown} trend="down" />
        <StatCard title="Saldo Acumulado" amount={formatBRL(totalIncome - totalExpense)} icon={Wallet} isAccent />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <MonthlyChart data={sortedData} />
        <CategoryPieChart data={pieData} />
      </div>

      <div className="w-full">
        <CategoryLimitChart data={limitsData} />
      </div>
    </div>
  );
}
