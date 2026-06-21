import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Coffee, ShoppingBag, Car, DollarSign } from 'lucide-react';

export type TransactionType = 'income' | 'expense';

interface TransactionProps {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
}

const CategoryIcon = ({ category, type }: { category: string, type: TransactionType }) => {
  if (type === 'income') return <DollarSign size={18} className="text-emerald-400" />;
  
  switch (category.toLowerCase()) {
    case 'alimentação': return <Coffee size={18} className="text-amber-400" />;
    case 'compras': return <ShoppingBag size={18} className="text-purple-400" />;
    case 'transporte': return <Car size={18} className="text-blue-400" />;
    default: return <ArrowDownLeft size={18} className="text-rose-400" />;
  }
};

export function TransactionRow({ description, amount, type, category, date }: TransactionProps) {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);

  return (
    <div className="flex items-center justify-between p-4 mb-2 rounded-xl bg-slate-800/20 border border-slate-700/30 hover:bg-slate-800/40 transition-colors group">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${type === 'income' ? 'bg-emerald-500/10' : 'bg-slate-700/30'}`}>
          <CategoryIcon category={category} type={type} />
        </div>
        <div>
          <p className="font-medium text-slate-200 group-hover:text-white transition-colors">{description}</p>
          <p className="text-xs text-slate-500">{category} • {date}</p>
        </div>
      </div>
      <div className={`font-semibold ${type === 'income' ? 'text-emerald-400' : 'text-slate-100'}`}>
        {type === 'income' ? '+' : '-'}{formattedAmount}
      </div>
    </div>
  );
}
