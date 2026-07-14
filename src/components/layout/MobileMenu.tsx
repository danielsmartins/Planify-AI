'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Tags, CreditCard, Wallet, BarChart2, Landmark, RotateCcw, Menu, X, LogOut, Settings } from 'lucide-react';
import { logout } from '@/lib/auth';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Análises', href: '/analytics', icon: BarChart2 },
    { name: 'Assinaturas', href: '/subscriptions', icon: RotateCcw },
    { name: 'Contas', href: '/accounts', icon: Landmark },
    { name: 'Transações', href: '/transactions', icon: Wallet },
    { name: 'Categorias', href: '/categories', icon: Tags },
    { name: 'Parcelamentos', href: '/installments', icon: CreditCard },
    { name: 'Cartões', href: '/cards', icon: CreditCard },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-300 hover:text-white transition-colors"
      >
        <Menu size={24} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar / Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-72 bg-[#09090b] border-l border-neutral-800 z-[100] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <span className="font-bold text-xl tracking-tight text-white">Menu</span>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-2 h-[calc(100%-80px)] justify-between">
          <div className="flex flex-col gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-brand/20 text-brand' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <form action={logout} className="border-t border-neutral-800 pt-4 mb-4">
            <button
              type="submit"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
