import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { LayoutDashboard, BarChart3, Tags, Sparkles, CreditCard } from 'lucide-react';

export async function TopNav() {
  const session = await getSession();
  
  if (!session) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 z-40 flex items-center justify-between px-6 lg:px-12 transition-all">
      <div className="flex items-center gap-2">
        <Sparkles className="text-brand w-5 h-5" />
        <span className="font-bold text-lg tracking-tight">Planify AI</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
          <LayoutDashboard size={16} />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <Link href="/analytics" className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
          <BarChart3 size={16} />
          <span className="hidden sm:inline">Análises</span>
        </Link>
        <Link href="/categories" className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
          <Tags size={16} />
          <span className="hidden sm:inline">Categorias</span>
        </Link>
        <Link href="/installments" className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
          <CreditCard size={16} />
          <span className="hidden sm:inline">Parcelamentos</span>
        </Link>
      </div>
    </nav>
  );
}
