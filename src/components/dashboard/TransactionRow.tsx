'use client';

import React, { useState, useTransition } from 'react';
import { ArrowDownLeft, Coffee, ShoppingBag, Car, DollarSign, Edit2, Trash2, X, Calendar } from 'lucide-react';
import { deleteTransaction, updateTransaction } from '@/app/actions';
import { useRouter, useSearchParams } from 'next/navigation';

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
  isProjected?: boolean;
  isPendingPayment?: boolean;
  createdAt: string;
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
  categoriesList = [],
  isProjected = false,
  isPendingPayment = false,
  createdAt
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
      <tr className={`border-b border-neutral-900/60 hover:bg-neutral-900/20 transition-colors group text-xs text-neutral-300 ${isProjected ? 'opacity-60 border-dashed' : ''}`}>
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
          {(isProjected || isPendingPayment) ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 border-dashed">
              PREVISTO
            </span>
          ) : (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700/50'}`}>
              {type === 'income' ? 'RECEBIDO' : 'PAGO'}
            </span>
          )}
        </td>
        <td className="py-3 px-4 text-right font-semibold text-sm">
          <div className="flex items-center justify-end gap-3">
            {/* Ações (invisíveis por padrão, aparecem no hover) */}
            {!isProjected && (
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
            )}
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
                <label className="block text-sm text-slate-300 mb-1">Data da Transação</label>
                <input required name="createdAt" defaultValue={createdAt.split('T')[0]} type="date" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm" />
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

interface DashboardFiltersProps {
  currentMonth: string;
  planned: boolean;
}

export function DashboardFilters({ currentMonth, planned }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Gerar lista de meses de -3 a +12 a partir do mês atual
  const months = React.useMemo(() => {
    const now = new Date();
    const list = [];
    for (let i = -3; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      // Formatar rótulo como "Julho de 2026"
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      list.push({ value, label: capitalizedLabel });
    }
    return list;
  }, []);

  const updateParams = (newMonth: string, newPlanned: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    params.set('planned', newPlanned ? 'true' : 'false');
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mb-8 bg-[#0a0a0a] border border-neutral-800 rounded-2xl">
      {/* Month Selector */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-850 shrink-0 text-slate-400">
          <Calendar size={16} />
        </div>
        <div className="relative w-full sm:w-64">
          <select
            value={currentMonth}
            onChange={(e) => updateParams(e.target.value, planned)}
            className="w-full bg-neutral-900 border border-neutral-850 hover:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-neutral-700 transition-colors appearance-none cursor-pointer pr-10"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 text-[9px]">
            ▼
          </div>
        </div>
      </div>

      {/* Planned Expenses Toggle */}
      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t border-neutral-900 sm:border-0 pt-3 sm:pt-0">
        <span className="text-xs font-medium text-neutral-400">
          Incluir gastos previstos (projeções)
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={planned}
          onClick={() => updateParams(currentMonth, !planned)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            planned ? 'bg-violet-600' : 'bg-neutral-850'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              planned ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
