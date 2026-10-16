import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { transactions, categories, accounts } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { MonthlyChart } from '@/components/analytics/MonthlyChart';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { CategoryLimitChart } from '@/components/analytics/CategoryLimitChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { TrendingUp, TrendingDown, PiggyBank, Sparkles } from 'lucide-react';
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

  // Busca saldo atual real das contas bancárias
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));
  const totalBankBalance = userAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

  // Agrupa transações por mês (MM/YYYY)
  const monthlyMap: Record<string, { income: number, expense: number, invested: number, dateObj: Date }> = {};
  const categoryTotals: Record<string, number> = {};
  const monthlyCategoryTotals: Record<string, Record<string, number>> = {};

  let totalIncome = 0;
  let totalExpense = 0;
  let totalInvested = 0;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthCategoryTotals: Record<string, number> = {};

  userTxs.forEach(tx => {
    const isCardPayment = Boolean(tx.accountId && tx.creditCardId) || tx.category === 'Pagamento de Fatura';
    if (isCardPayment) return;

    const d = new Date(tx.createdAt);
    const monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { income: 0, expense: 0, invested: 0, dateObj: d };
    }
    
    const val = parseFloat(tx.amount);
    if (tx.type === 'income') {
      monthlyMap[monthKey].income += val;
      totalIncome += val;
    } else {
      monthlyMap[monthKey].expense += val;
      totalExpense += val;
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + val;
      
      const isInvestment = tx.category.toLowerCase().includes('investimento');
      if (isInvestment) {
        totalInvested += val;
        monthlyMap[monthKey].invested = (monthlyMap[monthKey].invested || 0) + val;
      }

      if (!monthlyCategoryTotals[monthKey]) {
        monthlyCategoryTotals[monthKey] = {};
      }
      monthlyCategoryTotals[monthKey][tx.category] = (monthlyCategoryTotals[monthKey][tx.category] || 0) + val;

      // Se for do mês atual, soma para o gráfico de limites
      if (d >= startOfMonth && d <= endOfMonth) {
        currentMonthCategoryTotals[tx.category] = (currentMonthCategoryTotals[tx.category] || 0) + val;
      }
    }
  });

  // Métricas agregadas de inteligência financeira
  const totalCashNet = totalIncome - totalExpense;
  const realConsumption = totalExpense - totalInvested;
  const totalSaved = totalCashNet + totalInvested;
  const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;
  const monthCount = Math.max(1, Object.keys(monthlyMap).length);
  const avgIncome = totalIncome / monthCount;
  const avgConsumption = realConsumption / monthCount;

  // Ordena os meses cronologicamente para a linha do tempo
  const sortedData = Object.entries(monthlyMap)
    .sort(([, a], [, b]) => a.dateObj.getTime() - b.dateObj.getTime())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      invested: data.invested || 0,
    }));

  const pieData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      color: categoryColorMap[name] || '#64748b'
    }))
    .sort((a, b) => b.value - a.value);

  // Mapeia categorias por mês
  const monthlyCategoryData: Record<string, { name: string; value: number; color: string }[]> = {};
  for (const [monthKey, catMap] of Object.entries(monthlyCategoryTotals)) {
    monthlyCategoryData[monthKey] = Object.entries(catMap)
      .map(([name, value]) => ({
        name,
        value,
        color: categoryColorMap[name] || '#64748b'
      }))
      .sort((a, b) => b.value - a.value);
  }

  // Meses ordenados do mais recente para o mais antigo (para exibição no select)
  const availableMonths = Object.entries(monthlyMap)
    .sort(([, a], [, b]) => b.dateObj.getTime() - a.dateObj.getTime())
    .map(([month]) => month);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <StatCard
          title="Entradas Totais"
          amount={formatBRL(totalIncome)}
          icon={TrendingUp}
          trend="up"
          subtitle={`Média: ${formatBRL(avgIncome)}/mês`}
        />
        <StatCard
          title="Saídas Totais"
          amount={formatBRL(totalExpense)}
          icon={TrendingDown}
          trend="down"
          subtitle={`Consumo: ${formatBRL(realConsumption)} • Aportes: ${formatBRL(totalInvested)}`}
        />
        <StatCard
          title="Investimentos (Patrimônio)"
          amount={formatBRL(totalInvested)}
          icon={PiggyBank}
          badge="Poupado"
          subtitle="Aportes convertidos em patrimônio"
        />
        <StatCard
          title="Taxa Real de Poupança"
          amount={`${savingsRate.toFixed(1)}%`}
          icon={Sparkles}
          isAccent
          badge={savingsRate >= 15 ? 'Excelente' : savingsRate >= 10 ? 'Boa' : 'Em evolução'}
          subtitle={`Total poupado: ${formatBRL(totalSaved)} (Aportes + Balanço)`}
        />
      </div>

      {/* Intelligence Banner */}
      <div className="glass-panel p-4 rounded-xl border border-neutral-800 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <span>
            {totalInvested > 0 ? (
              <>
                <strong className="text-white">Inteligência Financeira:</strong> Seus gastos na categoria <strong className="text-sky-400">Investimentos</strong> ({formatBRL(totalInvested)}) são calculados como <strong className="text-emerald-400">renda poupada</strong>, e não como consumo descartável.
              </>
            ) : (
              <>
                <strong className="text-white">Dica Financeira:</strong> Ao registrar despesas na categoria <strong className="text-sky-400">Investimentos</strong>, o sistema calcula como <strong className="text-emerald-400">patrimônio poupado</strong>, sem penalizar seu custo de vida.
              </>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-neutral-400 font-medium">
          <span>Custo de vida médio: <strong className="text-neutral-200">{formatBRL(avgConsumption)}/mês</strong></span>
          <span>Balanço histórico: <strong className={totalCashNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatBRL(totalCashNet)}</strong></span>
          <span>Saldo em conta: <strong className="text-emerald-400">{formatBRL(totalBankBalance)}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <MonthlyChart data={sortedData} />
        <CategoryPieChart
          allTimeData={pieData}
          monthlyData={monthlyCategoryData}
          availableMonths={availableMonths}
        />
      </div>

      <div className="w-full">
        <CategoryLimitChart data={limitsData} />
      </div>
    </div>
  );
}
