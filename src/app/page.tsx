import { StatCard } from '@/components/dashboard/StatCard';
import { TransactionRow, TransactionType } from '@/components/dashboard/TransactionRow';
import { Wallet, TrendingUp, TrendingDown, LogOut, Send } from 'lucide-react';
import { getSession, logout } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ActionButtons } from '@/components/dashboard/ActionButtons';

export default async function Home() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const firstName = session.user.name.split(' ')[0];

  // Buscando transações reais
  const userTransactions = await db.select()
    .from(transactions)
    .where(eq(transactions.userId, session.user.id))
    .orderBy(desc(transactions.createdAt));

  let totalIncome = 0;
  let totalExpense = 0;

  userTransactions.forEach((tx) => {
    const val = parseFloat(tx.amount);
    if (tx.type === 'income') totalIncome += val;
    else totalExpense += val;
  });

  const balance = totalIncome - totalExpense;

  const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  return (
    <div className="py-6 transition-all duration-700 ease-out">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            Olá, <span className="text-gradient">{firstName}</span> 👋
          </h1>
          <p className="text-slate-400">Aqui está o resumo das suas finanças neste mês.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action={logout}>
            <button type="submit" title="Sair" className="glass-panel p-2.5 rounded-xl text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">
              <LogOut size={18} />
            </button>
          </form>
          
          <a 
            href={`https://t.me/PlanifyAIBot?start=${session.user.id}`} 
            target="_blank" 
            className="glass-panel flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800/50 transition-colors cursor-pointer border border-[#0088cc]/30 text-[#0088cc] hover:text-[#0088cc] hover:border-[#0088cc]"
          >
            <Send size={18} />
            <span>Conectar Telegram</span>
          </a>
          
          <ActionButtons />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard 
          title="Saldo Atual" 
          amount={formatBRL(balance)} 
          icon={Wallet} 
          isAccent 
        />
        <StatCard 
          title="Entradas" 
          amount={formatBRL(totalIncome)} 
          icon={TrendingUp} 
          trend="up"
        />
        <StatCard 
          title="Saídas" 
          amount={formatBRL(totalExpense)} 
          icon={TrendingDown} 
          trend="down"
        />
      </div>

      {/* Transactions */}
      <section className="glass-panel rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Últimas Transações</h2>
        </div>
        
        {userTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-300 font-medium mb-1">Nenhuma transação encontrada</p>
            <p className="text-slate-500 text-sm">Adicione uma despesa aqui no site ou envie uma mensagem no WhatsApp!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {userTransactions.map((tx) => (
              <TransactionRow 
                key={tx.id} 
                id={tx.id}
                description={tx.description}
                amount={parseFloat(tx.amount)}
                type={tx.type as TransactionType}
                category={tx.category}
                date={new Date(tx.createdAt).toLocaleDateString('pt-BR')}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
