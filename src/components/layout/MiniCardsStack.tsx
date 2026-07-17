'use client';

import React from 'react';
import { CreditCard, Wallet, Landmark } from 'lucide-react';

export function MiniCardsStack() {
  const cards = [
    {
      id: 'nubank',
      name: 'Nubank',
      balance: 'R$ 4.250,30',
      color: 'from-[#820ad1] to-[#5c0796]',
      icon: <CreditCard size={12} className="text-white/90" />,
      style: 'rotate-[-8deg] -translate-x-6 translate-y-2 group-hover:rotate-[-14deg] group-hover:-translate-x-12 group-hover:-translate-y-1 z-10 opacity-70 group-hover:opacity-100',
    },
    {
      id: 'itau',
      name: 'Itaú',
      balance: 'R$ 12.890,55',
      color: 'from-[#ec7000] to-[#b85600]',
      icon: <Landmark size={12} className="text-white/90" />,
      style: 'rotate-[2deg] translate-y-0 group-hover:-translate-y-3 z-20',
    },
    {
      id: 'especie',
      name: 'Dinheiro',
      balance: 'R$ 380,00',
      color: 'from-[#10b981] to-[#047857]',
      icon: <Wallet size={12} className="text-white/90" />,
      style: 'rotate-[8deg] translate-x-6 translate-y-2 group-hover:rotate-[14deg] group-hover:translate-x-12 group-hover:-translate-y-1 z-10 opacity-70 group-hover:opacity-100',
    },
  ];

  return (
    <div className="relative h-24 w-full flex items-center justify-center my-4 overflow-visible select-none">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`absolute w-32 h-18 rounded-lg bg-gradient-to-br ${card.color} border border-white/10 p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col justify-between transition-all duration-500 ease-out transform ${card.style}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold tracking-wider text-white/90 uppercase">{card.name}</span>
            {card.icon}
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[7px] text-white/60 font-semibold uppercase mb-0.5">Saldo</span>
            <span className="text-[10px] font-bold text-white font-mono">{card.balance}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
