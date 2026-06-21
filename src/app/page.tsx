import { StatCard } from '@/components/dashboard/StatCard';
import { TransactionRow, TransactionType } from '@/components/dashboard/TransactionRow';
import { Wallet, TrendingUp, TrendingDown, Plus, MessageCircle, LogOut } from 'lucide-react';
import { getSession, logout } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Mock Data
const MOCK_TRANSACTIONS = [
  { id: '1', description: 'Uber para o trabalho', amount: 24.50, type: 'expense' as TransactionType, category: 'Transporte', date: 'Hoje, 08:30' },
  { id: '2', description: 'Almoço Restaurante', amount: 45.90, type: 'expense' as TransactionType, category: 'Alimentação', date: 'Hoje, 12:15' },
  { id: '3', description: 'Salário', amount: 5200.00, type: 'income' as TransactionType, category: 'Salário', date: 'Ontem, 09:00' },
  { id: '4', description: 'Mercado Mensal', amount: 450.00, type: 'expense' as TransactionType, category: 'Compras', date: '18 Jun, 19:40' },
];

export default async function Home() {
  const session = await getSession();
  
  // Como temos middleware, a session sempre existirá aqui, mas o typescript precisa saber
  if (!session) {
    redirect('/login');
  }

  const firstName = session.user.name.split(' ')[0];

  return (
    <div className="py-6 transition-all duration-700 ease-out">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            Olá, <span className="text-gradient">{firstName}</span> 👋
          </h1>
          <p className="text-slate-400">Aqui está o resumo das suas finanças neste mês.</p>
        </div>
        <div className="flex items-center gap-3">
          <form action={logout}>
            <button type="submit" title="Sair" className="glass-panel p-2.5 rounded-xl text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">
              <LogOut size={18} />
            </button>
          </form>
          <button className="glass-panel flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800/50 transition-colors cursor-pointer">
            <MessageCircle size={18} className="text-emerald-400" />
            <span>Ver WhatsApp</span>
          </button>
          <button className="bg-brand hover:bg-brand-dark text-white flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] cursor-pointer">
            <Plus size={18} />
            <span>Nova Despesa</span>
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard 
          title="Saldo Atual" 
          amount="R$ 4.679,60" 
          icon={Wallet} 
          isAccent 
        />
        <StatCard 
          title="Entradas" 
          amount="R$ 5.200,00" 
          icon={TrendingUp} 
          trend="up"
          trendValue="12%"
        />
        <StatCard 
          title="Saídas" 
          amount="R$ 520,40" 
          icon={TrendingDown} 
          trend="down"
          trendValue="4%"
        />
      </div>

      {/* Transactions */}
      <section className="glass-panel rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Últimas Transações</h2>
          <button className="text-sm font-medium text-brand-light hover:text-white transition-colors cursor-pointer">
            Ver todas →
          </button>
        </div>
        
        <div className="flex flex-col gap-1">
          {MOCK_TRANSACTIONS.map((tx) => (
            <TransactionRow key={tx.id} {...tx} />
          ))}
        </div>
      </section>
    </div>
  );
}
