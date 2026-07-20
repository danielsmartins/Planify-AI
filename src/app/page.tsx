import { TransactionRow, TransactionType, DashboardFilters } from '@/components/dashboard/TransactionRow';
import { Wallet, Send } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { transactions, categories, creditCards, accounts, subscriptions } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { ActionButtons } from '@/components/dashboard/ActionButtons';
import { ExpensesChart } from '@/components/dashboard/ExpensesChart';
import { AiAdvisor } from '@/components/dashboard/AiAdvisor';
import { LandingPage } from '@/components/layout/LandingPage';
import { NetWorthChart } from '@/components/dashboard/NetWorthChart';
import { processAutoPayments } from '@/lib/auto-pay';
import { processPendingSubscriptions } from '@/lib/subscriptions-billing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession();
  
  if (!session) {
    return <LandingPage />;
  }

  // Executa cobranças automáticas de assinaturas pendentes
  await processPendingSubscriptions(session.user.id);

  // Executa pagamentos automáticos de faturas pendentes
  await processAutoPayments(session.user.id);

  const firstName = session.user.name.split(' ')[0];

  const params = await searchParams;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const defaultMonthStr = `${currentYear}-${currentMonth}`;

  const monthStr = typeof params.month === 'string' ? params.month : defaultMonthStr;
  const planned = params.planned === 'true';

  const [yearStr, monthIndexStr] = monthStr.split('-');
  const year = parseInt(yearStr);
  const monthIndex = parseInt(monthIndexStr) - 1;

  const startOfMonth = new Date(year, monthIndex, 1);
  const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  // Buscar todas as transações do usuário (confirmadas e pendentes) de uma vez só
  const allUserTransactions = await db.select()
    .from(transactions)
    .where(eq(transactions.userId, session.user.id))
    .orderBy(desc(transactions.createdAt));

  // Filtrar as transações do mês selecionado
  const userTransactions = allUserTransactions.filter(tx => {
    const txDate = new Date(tx.createdAt);
    const inMonth = txDate >= startOfMonth && txDate <= endOfMonth;
    if (!inMonth) return false;
    if (!planned) return tx.status === 'confirmed';
    return true;
  });

  // Filtrar pagamentos de fatura confirmados
  const invoicePayments = allUserTransactions.filter(
    (tx) => tx.status === 'confirmed' && tx.accountId !== null && tx.creditCardId !== null
  );

  // Buscar contas, categorias, cartões e assinaturas
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));
  const userCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));
  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));
  const userSubscriptions = await db.select().from(subscriptions).where(and(
    eq(subscriptions.userId, session.user.id),
    eq(subscriptions.status, 'active')
  ));

  // Lógica de projeção de assinaturas para o mês selecionado
  interface ExtendedTransaction {
    id: string;
    userId: string;
    amount: string;
    description: string;
    category: string;
    type: 'income' | 'expense';
    status: 'pending' | 'confirmed';
    installmentId: string | null;
    creditCardId: string | null;
    accountId: string | null;
    createdAt: Date;
    dueDate?: Date | null;
    isProjected?: boolean;
    isPendingPayment?: boolean;
  }

  // Lógica de projeção de assinaturas para o mês selecionado e meses intermediários
  const allProjectedTxs: ExtendedTransaction[] = [];

  if (planned) {
    const currentY = now.getFullYear();
    const currentM = now.getMonth();
    const targetY = year;
    const targetM = monthIndex;

    // Iterar mês a mês do mês atual até o mês selecionado (apenas se for igual ou futuro)
    let tempY = currentY;
    let tempM = currentM;

    while (tempY < targetY || (tempY === targetY && tempM <= targetM)) {
      const monthStart = new Date(tempY, tempM, 1);
      const monthEnd = new Date(tempY, tempM + 1, 0, 23, 59, 59, 999);

      // Buscar transações reais nesse mês específico
      const monthTransactions = allUserTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      userSubscriptions.forEach((sub) => {
        const nextBilling = new Date(sub.nextBillingDate);
        let shouldBill = false;

        if (sub.billingCycle === 'monthly') {
          const billingMonthDate = new Date(nextBilling.getFullYear(), nextBilling.getMonth(), 1);
          shouldBill = monthStart >= billingMonthDate;
        } else if (sub.billingCycle === 'yearly') {
          shouldBill = nextBilling.getMonth() === tempM;
        }

        if (shouldBill) {
          const alreadyCharged = monthTransactions.some(
            (tx) => tx.description.toLowerCase().trim() === sub.name.toLowerCase().trim()
          );

          if (!alreadyCharged) {
            const day = nextBilling.getDate();
            const lastDayOfMonth = monthEnd.getDate();
            const actualDay = Math.min(day, lastDayOfMonth);
            const projectedDate = new Date(tempY, tempM, actualDay, 12, 0, 0);

            allProjectedTxs.push({
              id: `projected-sub-${sub.id}-${tempY}-${tempM}`,
              userId: session.user.id,
              amount: sub.amount,
              description: sub.name,
              category: sub.category,
              type: 'expense',
              status: 'pending',
              installmentId: null,
              creditCardId: sub.creditCardId || null,
              accountId: sub.accountId || null,
              createdAt: projectedDate,
              isProjected: true,
            });
          }
        }
      });

      // Avançar mês
      tempM++;
      if (tempM > 11) {
        tempM = 0;
        tempY++;
      }
    }
  }

  // As transações projetadas exibidas na lista do mês selecionado são apenas as daquele mês
  const projectedTxs = allProjectedTxs.filter(tx => {
    const txDate = new Date(tx.createdAt);
    return txDate >= startOfMonth && txDate <= endOfMonth;
  });

  // Mesclar transações e ordenar por data decrescente
  const allTxs: ExtendedTransaction[] = [
    ...userTransactions.map(tx => {
      let isPendingPayment = false;
      if (tx.type === 'expense' && tx.creditCardId && !tx.accountId) {
        const txDueDate = new Date(tx.dueDate || tx.createdAt);
        const hasPayment = invoicePayments.some(p => 
          p.creditCardId === tx.creditCardId && 
          new Date(p.createdAt).getMonth() === txDueDate.getMonth() && 
          new Date(p.createdAt).getFullYear() === txDueDate.getFullYear()
        );
        isPendingPayment = !hasPayment;
      }
      return { ...tx, isProjected: false, isPendingPayment };
    }),
    ...projectedTxs.map(tx => ({ ...tx, isPendingPayment: false }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latestTransactions = allTxs.slice(0, 10);

  // Calcular receitas e despesas exibidas no card de Saldo Total
  // (Lógica baseada em transações reais do mês)
  let totalIncome = 0;
  let totalExpense = 0;

  userTransactions.forEach((tx) => {
    const val = parseFloat(tx.amount);
    const isCardPayment = tx.accountId && tx.creditCardId;
    if (!isCardPayment) {
      if (tx.type === 'income') totalIncome += val;
      else totalExpense += val;
    }
  });

  // Saldo real consolidado atual
  const totalBalance = userAccounts.reduce((acc, curr) => acc + parseFloat(curr.balance), 0);

  const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Obter dinamicamente os últimos 6 meses terminando no mês atual (para o NetWorthChart)
  const monthsData = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsData.push({
      name: monthNames[d.getMonth()],
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
    });
  }

  // Transações confirmadas a partir de todas as buscadas
  const allConfirmedTransactions = allUserTransactions.filter(tx => tx.status === 'confirmed');

  // Calcular dívida do cartão de crédito (despesas confirmadas no crédito)
  let creditCardDebt = 0;
  allConfirmedTransactions.forEach(tx => {
    const txDate = new Date(tx.createdAt);
    if (txDate <= endOfMonth && tx.type === 'expense' && tx.creditCardId && !tx.accountId) {
      creditCardDebt += parseFloat(tx.amount);
    }
  });

  const hasAccounts = userAccounts.length > 0;
  let currentBalance = hasAccounts ? (totalBalance - creditCardDebt) : 0;
  if (!hasAccounts) {
    allConfirmedTransactions.forEach(tx => {
      const txDate = new Date(tx.createdAt);
      if (txDate <= endOfMonth) {
        const val = parseFloat(tx.amount);
        const isCardPayment = tx.accountId && tx.creditCardId;
        if (!isCardPayment) {
          if (tx.type === 'income') {
            currentBalance += val;
          } else {
            currentBalance -= val;
          }
        }
      }
    });
  }

  // Reconstruir o histórico de saldo regredindo mês a mês com base nos dados reais
  const historyData = monthsData.map((mInfo) => {
    const endOfMonthLimit = new Date(mInfo.year, mInfo.monthIndex + 1, 0, 23, 59, 59, 999);
    
    if (endOfMonthLimit >= endOfMonth) {
      return {
        month: mInfo.name,
        valor: Math.round(currentBalance)
      };
    }
    
    let historicalBalance = currentBalance;
    allConfirmedTransactions.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      if (txDate > endOfMonthLimit && txDate <= endOfMonth) {
        const val = parseFloat(tx.amount);
        const isCardPayment = tx.accountId && tx.creditCardId;
        if (!isCardPayment) {
          if (tx.type === 'income') {
            historicalBalance -= val;
          } else {
            historicalBalance += val;
          }
        }
      }
    });

    return {
      month: mInfo.name,
      valor: Math.round(historicalBalance)
    };
  });

  // Agrupar despesas por categoria
  const categoryTotals: Record<string, number> = {};
  userTransactions.forEach((tx) => {
    const val = parseFloat(tx.amount);
    const isCardPayment = tx.accountId && tx.creditCardId;
    if (tx.type === 'expense' && !isCardPayment) {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + val;
    }
  });

  // Se planned estiver ativo, agrupar despesas projetadas também no gráfico
  if (planned) {
    projectedTxs.forEach((tx) => {
      const val = parseFloat(tx.amount);
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + val;
    });
  }

  const categoryColorMap: Record<string, string> = {};
  userCategories.forEach(c => {
    categoryColorMap[c.name] = c.color;
  });

  const expensesData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      color: categoryColorMap[name] || '#64748b'
    }))
    .sort((a, b) => b.value - a.value);

  // Calcular receitas, despesas e saldo projetado
  let plannedIncome = 0;
  let plannedExpense = 0;
  let projectedBalance = totalBalance;

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let startingBankBalanceOfCurrentMonth = totalBalance;

  allConfirmedTransactions.forEach((tx) => {
    const txDate = new Date(tx.createdAt);
    if (txDate >= currentMonthStart && txDate <= now) {
      const val = parseFloat(tx.amount);
      if (tx.accountId) {
        if (tx.type === 'income') {
          startingBankBalanceOfCurrentMonth -= val;
        } else {
          startingBankBalanceOfCurrentMonth += val;
        }
      }
    }
  });

  if (startOfMonth < currentMonthStart) {
    // Alvo é um mês passado: regressão do saldo
    let startingBankBalance = startingBankBalanceOfCurrentMonth;
    allConfirmedTransactions.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      if (txDate >= startOfMonth && txDate < currentMonthStart) {
        const val = parseFloat(tx.amount);
        if (tx.accountId) {
          if (tx.type === 'income') {
            startingBankBalance -= val;
          } else {
            startingBankBalance += val;
          }
        }
      }
    });

    userTransactions.forEach((tx) => {
      const val = parseFloat(tx.amount);
      const isCardPayment = tx.accountId && tx.creditCardId;
      if (!isCardPayment) {
        if (tx.type === 'income') plannedIncome += val;
        else plannedExpense += val;
      }
    });

    projectedTxs.forEach((tx) => {
      const val = parseFloat(tx.amount);
      plannedExpense += val;
    });

    projectedBalance = startingBankBalance + plannedIncome - plannedExpense;
  } else {
    // Alvo é o mês atual ou um mês futuro: progressão mês a mês a partir do início do mês atual
    let runningBalance = startingBankBalanceOfCurrentMonth;
    const startYear = now.getFullYear();
    const startMonth = now.getMonth();
    const targetYear = year;
    const targetMonthIndex = monthIndex;

    let tempY = startYear;
    let tempM = startMonth;

    while (tempY < targetYear || (tempY === targetYear && tempM <= targetMonthIndex)) {
      const mStart = new Date(tempY, tempM, 1);
      const mEnd = new Date(tempY, tempM + 1, 0, 23, 59, 59, 999);

      let mPlannedIncome = 0;
      let mPlannedExpense = 0;

      const mTransactions = allUserTransactions.filter((tx) => {
        const txDate = new Date(tx.createdAt);
        return txDate >= mStart && txDate <= mEnd;
      });

      mTransactions.forEach((tx) => {
        const val = parseFloat(tx.amount);
        const isCardPayment = tx.accountId && tx.creditCardId;
        if (!isCardPayment) {
          if (tx.type === 'income') {
            mPlannedIncome += val;
          } else {
            mPlannedExpense += val;
          }
        }
      });

      const mProjectedTxs = allProjectedTxs.filter((tx) => {
        const txDate = new Date(tx.createdAt);
        return txDate >= mStart && txDate <= mEnd;
      });

      mProjectedTxs.forEach((tx) => {
        const val = parseFloat(tx.amount);
        mPlannedExpense += val;
      });

      const mEndBalance = runningBalance + mPlannedIncome - mPlannedExpense;

      if (tempY === targetYear && tempM === targetMonthIndex) {
        plannedIncome = mPlannedIncome;
        plannedExpense = mPlannedExpense;
        projectedBalance = mEndBalance;
        break;
      }

      runningBalance = mEndBalance;

      tempM++;
      if (tempM > 11) {
        tempM = 0;
        tempY++;
      }
    }
  }

  return (
    <div className="py-6 transition-all duration-700 ease-out select-none">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-neutral-900 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Visão Geral
          </h1>
          <p className="text-xs text-neutral-400">Olá, {firstName}. Aqui está o resumo das suas finanças.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end shrink-0">
          <ActionButtons categories={userCategories} creditCards={userCards} accounts={userAccounts} />
        </div>
      </header>

      {/* Dashboard Filters */}
      <DashboardFilters currentMonth={monthStr} planned={planned} />

      {/* Telegram Link Sub-bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-neutral-950 border border-neutral-900 rounded-2xl p-4 mb-8 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#0088cc]/10 text-[#0088cc] border border-[#0088cc]/20">
            <Send size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Integração Telegram ativa</h4>
            <p className="text-[10px] text-neutral-400">Envie mensagens ou áudios para registrar transações na hora.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[10px] text-neutral-300 font-mono">
            Vincular: <code className="text-[#0088cc] select-all font-semibold">/start {session.user.id}</code>
          </div>
          <a 
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'SeuBot'}?start=${session.user.id}`} 
            target="_blank" 
            className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-[#0088cc] hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
          >
            <span>Conectar Bot</span>
          </a>
        </div>
      </div>

      {/* Top Grid (Saldo Total + NetWorthChart + Saldo Projetado se planejado) */}
      <div className={`grid grid-cols-1 ${planned ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 mb-8`}>
        <div>
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-full min-h-[220px]">
            <div>
              <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block mb-1">Saldo Total</span>
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-3xl font-bold tracking-tight text-white">{formatBRL(totalBalance)}</h2>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
                  <span>↗</span> +3.2% vs mês ant.
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Saldo consolidado de todas as suas contas bancárias</p>
            </div>

            <div className="border-t border-neutral-900/60 pt-4 mt-6 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-0.5">Receitas</span>
                <span className="text-base font-bold text-white">{formatBRL(totalIncome)}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-0.5">Despesas</span>
                <span className="text-base font-bold text-white">{formatBRL(totalExpense)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Saldo Projetado (exibido apenas se planned = true) */}
        {planned && (
          <div>
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-full min-h-[220px] border border-dashed border-violet-500/30">
              <div>
                <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mb-1">Saldo Projetado</span>
                <div className="flex items-baseline gap-3 mb-2">
                  <h2 className="text-3xl font-bold tracking-tight text-white">{formatBRL(projectedBalance)}</h2>
                </div>
                <p className="text-[10px] text-slate-500">Saldo estimado ao final do mês selecionado</p>
              </div>

              <div className="border-t border-neutral-900/60 pt-4 mt-6 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-neutral-500 font-semibold block mb-0.5">Rec. Planejadas</span>
                  <span className="text-base font-bold text-emerald-400">{formatBRL(plannedIncome)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 font-semibold block mb-0.5">Desp. Planejadas</span>
                  <span className="text-base font-bold text-rose-400">{formatBRL(plannedExpense)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className={planned ? 'lg:col-span-1' : ''}>
          <NetWorthChart history={historyData} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Transactions Table */}
        <div className="lg:col-span-2">
          <section className="glass-panel rounded-2xl p-6 md:p-8 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-slate-300">
                {planned ? 'Transações & Projeções' : 'Transações Confirmadas'}
              </h2>
            </div>
            
            {allTxs.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-800">
                  <Wallet size={24} className="text-slate-400" />
                </div>
                <p className="text-slate-300 font-medium mb-1">Nenhuma transação encontrada</p>
                <p className="text-slate-500 text-sm">Adicione uma despesa aqui no site ou envie uma mensagem no Telegram!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-900 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                        <th className="pb-3 px-4">Data</th>
                        <th className="pb-3 px-4">Estabelecimento / Categoria</th>
                        <th className="pb-3 px-4">Origem</th>
                        <th className="pb-3 px-4">Status</th>
                        <th className="pb-3 px-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestTransactions.map((tx) => (
                        <TransactionRow 
                          key={tx.id} 
                          id={tx.id}
                          description={tx.description}
                          amount={parseFloat(tx.amount)}
                          type={tx.type as TransactionType}
                          category={tx.category}
                          date={new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                          createdAt={new Date(tx.createdAt).toISOString()}
                          accountId={tx.accountId}
                          creditCardId={tx.creditCardId}
                          accountName={tx.accountId ? (userAccounts.find(a => a.id === tx.accountId)?.name) : null}
                          creditCardName={tx.creditCardId ? (userCards.find(c => c.id === tx.creditCardId)?.name) : null}
                          categoriesList={userCategories}
                          isProjected={tx.isProjected}
                          isPendingPayment={tx.isPendingPayment}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {allTxs.length > 10 && (
                  <div className="mt-2 flex justify-center">
                    <a href="/transactions" className="text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors px-4 py-2 rounded-xl">
                      Ver todas ({allTxs.length})
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: AI Advisor & Category Chart */}
        <div className="flex flex-col gap-6 self-start w-full">
          <AiAdvisor />
          <ExpensesChart data={expensesData} />
        </div>
      </div>
    </div>
  );
}
