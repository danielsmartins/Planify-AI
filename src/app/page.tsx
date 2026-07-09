import { TransactionRow, TransactionType } from '@/components/dashboard/TransactionRow';
import { Wallet, Send } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { transactions, categories, creditCards, accounts } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { ActionButtons } from '@/components/dashboard/ActionButtons';
import { ExpensesChart } from '@/components/dashboard/ExpensesChart';
import { AiAdvisor } from '@/components/dashboard/AiAdvisor';
import { LandingPage } from '@/components/layout/LandingPage';
import { NetWorthChart } from '@/components/dashboard/NetWorthChart';

export default async function Home() {
  const session = await getSession();
  
  if (!session) {
    return <LandingPage />;
  }

  const firstName = session.user.name.split(' ')[0];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Buscando transações reais (apenas confirmadas) e apenas do MÊS VIGENTE
  const userTransactions = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      eq(transactions.status, 'confirmed'),
      sql`${transactions.createdAt} >= ${startOfMonth}`,
      sql`${transactions.createdAt} <= ${endOfMonth}`
    ))
    .orderBy(desc(transactions.createdAt));

  const latestTransactions = userTransactions.slice(0, 10);

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

  // Buscar contas para saldo total consolidado
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));
  const userCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));
  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));

  const totalBalance = userAccounts.reduce((acc, curr) => acc + parseFloat(curr.balance), 0);

  const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Obter dinamicamente os últimos 6 meses terminando no mês atual
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

  // Buscar todas as transações confirmadas do usuário para calcular o histórico real
  const allConfirmedTransactions = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      eq(transactions.status, 'confirmed')
    ));

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
    
    // Se for o mês atual ou futuro, usamos o saldo final atual
    if (endOfMonthLimit >= endOfMonth) {
      return {
        month: mInfo.name,
        valor: Math.round(currentBalance)
      };
    }
    
    // Retroceder no tempo: desfazer transações ocorridas após o fim deste mês e até o fim do mês atual
    let historicalBalance = currentBalance;
    allConfirmedTransactions.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      if (txDate > endOfMonthLimit && txDate <= endOfMonth) {
        const val = parseFloat(tx.amount);
        const isCardPayment = tx.accountId && tx.creditCardId;
        if (!isCardPayment) {
          // Desfazemos qualquer transação confirmada (seja em conta ou em cartão), pois todas afetam o patrimônio líquido
          if (tx.type === 'income') {
            historicalBalance -= val; // desfazer ganho
          } else {
            historicalBalance += val; // desfazer gasto
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

      {/* Top Grid (Saldo Total + NetWorthChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
        
        <div>
          <NetWorthChart history={historyData} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Transactions Table */}
        <div className="lg:col-span-2">
          <section className="glass-panel rounded-2xl p-6 md:p-8 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-slate-300">Transações Recentes</h2>
            </div>
            
            {userTransactions.length === 0 ? (
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
                          accountId={tx.accountId}
                          creditCardId={tx.creditCardId}
                          accountName={tx.accountId ? (userAccounts.find(a => a.id === tx.accountId)?.name) : null}
                          creditCardName={tx.creditCardId ? (userCards.find(c => c.id === tx.creditCardId)?.name) : null}
                          categoriesList={userCategories}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {userTransactions.length > 10 && (
                  <div className="mt-2 flex justify-center">
                    <a href="/transactions" className="text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors px-4 py-2 rounded-xl">
                      Ver todas ({userTransactions.length})
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
