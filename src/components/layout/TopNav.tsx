import Link from 'next/link';
import Image from 'next/image';
import { getSession, logout } from '@/lib/auth';
import { LayoutDashboard, Tags, CreditCard, Wallet, BarChart2, Landmark, RotateCcw, LogOut, Settings } from 'lucide-react';
import { MobileMenu } from './MobileMenu';

export async function TopNav() {
  const session = await getSession();
  
  if (!session) return null;

  return (
    <>
      {/* Sidebar para Desktop */}
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed top-0 left-0 border-r border-neutral-900 bg-[#020203] p-6 justify-between z-30 select-none">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <Image 
              src="/images/logo_icon_v2.png" 
              alt="Planify AI" 
              width={34} 
              height={34} 
              className="rounded-xl border border-neutral-800"
            />
            <span className="font-bold text-xl tracking-tight text-white">Planify AI</span>
          </div>

          {/* Links da Sidebar */}
          <nav className="flex flex-col gap-1">
            <Link href="/" className="flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2.5 rounded-xl hover:bg-neutral-900/50">
              <LayoutDashboard size={18} />
              <span>Visão Geral</span>
            </Link>
            
            <Link href="/accounts" className="flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2.5 rounded-xl hover:bg-neutral-900/50">
              <Landmark size={18} />
              <span>Contas</span>
            </Link>
            
            <Link href="/transactions" className="flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2.5 rounded-xl hover:bg-neutral-900/50">
              <Wallet size={18} />
              <span>Transações</span>
            </Link>
            
            <Link href="/subscriptions" className="flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2.5 rounded-xl hover:bg-neutral-900/50">
              <RotateCcw size={18} />
              <span>Assinaturas</span>
            </Link>
            
            <Link href="/analytics" className="flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2.5 rounded-xl hover:bg-neutral-900/50">
              <BarChart2 size={18} />
              <span>Análises</span>
            </Link>

            <Link href="/categories" className="flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2.5 rounded-xl hover:bg-neutral-900/50">
              <Tags size={18} />
              <span>Categorias</span>
            </Link>
            
            <Link href="/installments" className="flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2.5 rounded-xl hover:bg-neutral-900/50">
              <CreditCard size={18} />
              <span>Parcelamentos</span>
            </Link>
            
            <Link href="/cards" className="flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2.5 rounded-xl hover:bg-neutral-900/50">
              <CreditCard size={18} />
              <span>Cartões</span>
            </Link>

            <Link href="/settings" className="flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2.5 rounded-xl hover:bg-neutral-900/50">
              <Settings size={18} />
              <span>Configurações</span>
            </Link>
          </nav>
        </div>

        {/* Perfil & Logout */}
        <div className="flex flex-col gap-4 border-t border-neutral-900 pt-4">
          <div className="flex items-center justify-between px-2 gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {session.user.name?.substring(0, 2).toUpperCase() || 'US'}
              </div>
              <span className="text-xs font-medium text-slate-300 truncate">{session.user.name}</span>
            </div>
            
            <form action={logout} className="shrink-0">
              <button type="submit" className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer" title="Sair">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Header para Mobile */}
      <nav className="lg:hidden flex items-center justify-between p-4 bg-[#000000] border-b border-neutral-900 w-full z-30">
        <div className="flex items-center gap-2">
          <Image 
            src="/images/logo_icon_v2.png" 
            alt="Planify AI" 
            width={28} 
            height={28} 
            className="rounded-lg border border-neutral-800"
          />
          <span className="font-bold text-base tracking-tight text-white">Planify AI</span>
        </div>
        
        <MobileMenu />
      </nav>
    </>
  );
}
