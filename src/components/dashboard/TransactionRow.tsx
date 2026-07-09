'use client';

import React, { useState, useTransition } from 'react';
import { ArrowDownLeft, Coffee, ShoppingBag, Car, DollarSign, Edit2, Trash2, X } from 'lucide-react';
import { deleteTransaction, updateTransaction } from '@/app/actions';

export type TransactionType = 'income' | 'expense';

interface TransactionProps {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  accountId?: string | null;
  creditCardId?: string | null;
  accountName?: string | null;
  creditCardName?: string | null;
  categoriesList?: { id: string, name: string }[];
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

export function TransactionRow({ 
  id, 
  description, 
  amount, 
  type, 
  category, 
  date, 
  accountId,
  creditCardId,
  accountName,
  creditCardName,
  categoriesList = [] 
}: TransactionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      startTransition(() => {
        deleteTransaction(id);
      });
    }
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      updateTransaction(id, formData).then(() => {
        setIsEditing(false);
      });
    });
  };

  // Calcular label de pagamento
  let paymentLabel = '';
  if (accountId && creditCardId) {
    paymentLabel = `Fatura: ${creditCardName} via ${accountName}`;
  } else if (creditCardId) {
    paymentLabel = `Crédito: ${creditCardName}`;
  } else if (accountName) {
    paymentLabel = accountName;
  }

  return (
    <>
      <tr className="border-b border-neutral-900/60 hover:bg-neutral-900/20 transition-colors group text-xs text-neutral-300">
        <td className="py-3 px-4 font-medium text-neutral-500">
          {date}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-850 shrink-0 text-slate-400">
              <CategoryIcon category={category} type={type} />
            </div>
            <div>
              <p className="font-semibold text-slate-200 group-hover:text-white transition-colors">{description}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">{category}</p>
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          {paymentLabel ? (
            <span className="bg-neutral-900 border border-neutral-800/60 text-slate-300 px-2.5 py-1 rounded-xl text-[10px] font-medium tracking-wide">
              {paymentLabel}
            </span>
          ) : (
            <span className="text-neutral-600 text-[10px] italic">-</span>
          )}
        </td>
        <td className="py-3 px-4">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700/50'}`}>
            {type === 'income' ? 'RECEBIDO' : 'PAGO'}
          </span>
        </td>
        <td className="py-3 px-4 text-right font-semibold text-sm">
          <div className="flex items-center justify-end gap-3">
            {/* Ações (invisíveis por padrão, aparecem no hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setIsEditing(true)}
                disabled={isPending}
                className="p-1.5 text-slate-500 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                title="Editar"
              >
                <Edit2 size={13} />
              </button>
              <button 
                onClick={handleDelete}
                disabled={isPending}
                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-50 cursor-pointer"
                title="Excluir"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <span className={type === 'income' ? 'text-emerald-400' : 'text-slate-100'}>
              {type === 'income' ? '+' : '-'}{formattedAmount}
            </span>
          </div>
        </td>
      </tr>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={20}/></button>
            <h2 className="text-xl font-bold mb-6">Editar Transação</h2>

            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Descrição</label>
                <input required name="description" defaultValue={description} type="text" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Valor (R$)</label>
                <input required name="amount" defaultValue={amount} type="number" step="0.01" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Categoria</label>
                {categoriesList.length > 0 ? (
                  <select required name="category" defaultValue={category} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors">
                    <option value={category}>{category}</option>
                    {categoriesList.filter(c => c.name !== category).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input required name="category" defaultValue={category} type="text" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" />
                )}
              </div>
              <button disabled={isPending} type="submit" className="w-full bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl mt-4 cursor-pointer disabled:opacity-50">
                {isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
