import { StatCard } from '@/components/dashboard/StatCard';
import { TransactionRow, TransactionType } from '@/components/dashboard/TransactionRow';
import { Wallet, TrendingUp, TrendingDown, LogOut, Send } from 'lucide-react';
import { getSession, logout } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { transactions, categories, creditCards, accounts } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { ActionButtons } from '@/components/dashboard/ActionButtons';
import { ExpensesChart } from '@/components/dashboard/ExpensesChart';
import { AiAdvisor } from '@/components/dashboard/AiAdvisor';

export default async function Home() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
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
    if (tx.type === 'income') totalIncome += val;
    else totalExpense += val;
  });

  const balance = totalIncome - totalExpense;

  const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  // Agrupar despesas por categoria
  const categoryTotals: Record<string, number> = {};
  userTransactions.forEach((tx) => {
    const val = parseFloat(tx.amount);
    if (tx.type === 'expense') {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + val;
    }
  });

  // Buscar categorias do usuário para usar as cores reais
  const userCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));
  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));
  
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
    <div className="py-6 transition-all duration-700 ease-out">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-start justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            Olá, <span className="text-gradient">{firstName}</span> 👋
          </h1>
          <p className="text-slate-400 mb-5">Aqui está o resumo das suas finanças <strong className="text-white">deste mês</strong>.</p>
          
          <div className="inline-flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 mb-5">
            <span className="text-xs text-slate-400">Vincular manualmente no Telegram:</span>
            <code className="text-xs text-[#0088cc] select-all font-mono cursor-copy" title="Copiar comando">/start {session.user.id}</code>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a 
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'SeuBot'}?start=${session.user.id}`} 
              target="_blank" 
              className="glass-panel flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-800/50 transition-colors cursor-pointer border border-[#0088cc]/30 text-[#0088cc]"
            >
              <Send size={14} />
              <span>Conectar Telegram</span>
            </a>
            
            <form action={logout}>
              <button type="submit" className="glass-panel flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">
                <LogOut size={14} />
                <span>Sair</span>
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end shrink-0">
          <ActionButtons categories={userCategories} creditCards={userCards} accounts={userAccounts} />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12">
        <div className="col-span-2 md:col-span-1">
          <StatCard 
            title="Saldo deste Mês" 
            amount={formatBRL(balance)} 
            icon={Wallet} 
            isAccent 
          />
        </div>
        <StatCard 
          title="Entradas do Mês" 
          amount={formatBRL(totalIncome)} 
          icon={TrendingUp} 
          trend="up"
        />
        <StatCard 
          title="Saídas do Mês" 
          amount={formatBRL(totalExpense)} 
          icon={TrendingDown} 
          trend="down"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Transactions */}
        <div className="lg:col-span-2">
          <section className="glass-panel rounded-2xl p-6 md:p-8 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Últimas Transações</h2>
            </div>
            
            {userTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet size={32} className="text-slate-400" />
                </div>
                <p className="text-slate-300 font-medium mb-1">Nenhuma transação encontrada</p>
                <p className="text-slate-500 text-sm">Adicione uma despesa aqui no site ou envie uma mensagem no Telegram!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {latestTransactions.map((tx) => (
                  <TransactionRow 
                    key={tx.id} 
                    id={tx.id}
                    description={tx.description}
                    amount={parseFloat(tx.amount)}
                    type={tx.type as TransactionType}
                    category={tx.category}
                    date={new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                    categoriesList={userCategories}
                  />
                ))}
                
                {userTransactions.length > 10 && (
                  <div className="mt-4 flex justify-center">
                    <a href="/transactions" className="text-sm font-medium text-brand hover:text-brand-light transition-colors px-4 py-2 bg-brand/10 hover:bg-brand/20 rounded-lg">
                      Ver todas ({userTransactions.length})
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: AI & Charts */}
        <div className="flex flex-col gap-6 self-start w-full">
          <AiAdvisor />
          <ExpensesChart data={expensesData} />
        </div>
      </div>
    </div>
  );
}
