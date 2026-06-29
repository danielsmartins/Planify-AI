import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { LayoutDashboard, Tags, Sparkles, CreditCard, Wallet, BarChart2, Landmark, RotateCcw } from 'lucide-react';
import { MobileMenu } from './MobileMenu';

export async function TopNav() {
  const session = await getSession();
  
  if (!session) return null;

  return (
    <nav className="glass-panel mb-8 p-4 rounded-2xl flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="text-brand" size={24} />
        <span className="font-bold text-xl tracking-tight">Planify AI</span>
      </div>
      
      {/* Menu Desktop */}
      <div className="hidden lg:flex items-center gap-2 xl:gap-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-brand transition-colors px-2 xl:px-3 py-2 rounded-lg hover:bg-brand/10">
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
        
        <Link href="/analytics" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-brand transition-colors px-2 xl:px-3 py-2 rounded-lg hover:bg-brand/10">
          <BarChart2 size={18} />
          <span>Análises</span>
        </Link>
        
        <Link href="/subscriptions" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-brand transition-colors px-2 xl:px-3 py-2 rounded-lg hover:bg-brand/10">
          <RotateCcw size={18} />
          <span>Assinaturas</span>
        </Link>
        
        <Link href="/accounts" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-brand transition-colors px-2 xl:px-3 py-2 rounded-lg hover:bg-brand/10">
          <Landmark size={18} />
          <span>Contas</span>
        </Link>
        
        <Link href="/transactions" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-brand transition-colors px-2 xl:px-3 py-2 rounded-lg hover:bg-brand/10">
          <Wallet size={18} />
          <span>Transações</span>
        </Link>
        
        <Link href="/categories" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-brand transition-colors px-2 xl:px-3 py-2 rounded-lg hover:bg-brand/10">
          <Tags size={18} />
          <span>Categorias</span>
        </Link>

        <Link href="/installments" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-brand transition-colors px-2 xl:px-3 py-2 rounded-lg hover:bg-brand/10">
          <CreditCard size={18} />
          <span>Parcelamentos</span>
        </Link>
        
        <Link href="/cards" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-brand transition-colors px-2 xl:px-3 py-2 rounded-lg hover:bg-brand/10">
          <CreditCard size={18} />
          <span>Cartões</span>
        </Link>
      </div>

      {/* Menu Mobile */}
      <div className="lg:hidden">
        <MobileMenu />
      </div>
    </nav>
  );
}
