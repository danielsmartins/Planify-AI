'use client';

import { useState, useTransition } from 'react';
import { deleteInstallment, updateInstallment } from '@/app/installments/actions';
import { Trash2, Edit2, CreditCard, DollarSign, X } from 'lucide-react';

interface InstallmentProps {
  id: string;
  description: string;
  category: string;
  totalAmount: string;
  installmentsCount: number;
  paidCount: number;
  installmentValue: string;
  remainingAmount: string;
}

export function InstallmentClient({ installments }: { installments: InstallmentProps[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingInstallment, setEditingInstallment] = useState<InstallmentProps | null>(null);

  const handleDelete = (id: string) => {
    if (confirm('Atenção: Excluir este parcelamento irá apagar também TODAS as faturas futuras vinculadas a ele. Transações passadas serão mantidas. Deseja continuar?')) {
      startTransition(() => {
        deleteInstallment(id);
      });
    }
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInstallment) return;
    
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      updateInstallment(editingInstallment.id, formData).then(() => {
        setEditingInstallment(null);
      });
    });
  };

  // Metricas
  const activeInstallments = installments.filter(i => i.paidCount < i.installmentsCount);
  const totalDebt = activeInstallments.reduce((acc, curr) => acc + Number(curr.remainingAmount), 0);
  const monthlyCommitment = activeInstallments.reduce((acc, curr) => acc + Number(curr.installmentValue), 0);

  const formatBRL = (val: string | number) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <DollarSign className="text-rose-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Total Devido (Futuro)</p>
            <p className="text-2xl font-bold">{formatBRL(totalDebt)}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
            <CreditCard className="text-brand" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Comprometimento Mensal</p>
            <p className="text-2xl font-bold">{formatBRL(monthlyCommitment)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {installments.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl">
            <p className="text-slate-400 mb-2">Você não tem compras parceladas cadastradas.</p>
            <p className="text-sm text-slate-500">Adicione compras parceladas pelo modal de &quot;Nova Despesa&quot; no Dashboard.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {installments.map((inst) => {
              const isFinished = inst.paidCount >= inst.installmentsCount;
              const progressPct = Math.min((inst.paidCount / inst.installmentsCount) * 100, 100);

              return (
                <div key={inst.id} className={`glass-panel p-5 rounded-2xl flex flex-col gap-4 group relative overflow-hidden transition-all ${isFinished ? 'opacity-60 grayscale' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{inst.description}</h3>
                      <p className="text-xs text-brand mt-1">{inst.category}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100">
                      <button 
                        onClick={() => setEditingInstallment(inst)}
                        disabled={isPending}
                        className="p-1.5 text-slate-500 hover:text-brand transition-colors rounded-lg disabled:opacity-50"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(inst.id)}
                        disabled={isPending}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-lg disabled:opacity-50"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Progresso ({inst.paidCount}/{inst.installmentsCount})</span>
                      <span className="font-medium">{progressPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-brand h-full rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2 border-t border-slate-800/50 pt-4">
                    <div>
                      <p className="text-xs text-slate-500">Valor da Parcela</p>
                      <p className="font-semibold">{formatBRL(inst.installmentValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Valor Restante</p>
                      <p className="font-semibold text-rose-400">{formatBRL(inst.remainingAmount)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingInstallment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setEditingInstallment(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20}/>
            </button>
            <h2 className="text-xl font-bold mb-2">Editar Parcelamento</h2>
            <p className="text-xs text-slate-400 mb-6">Por enquanto, só é possível alterar a descrição e a categoria do parcelamento.</p>

            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Descrição</label>
                <input 
                  type="text" 
                  name="description" 
                  required
                  defaultValue={editingInstallment.description}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-300 mb-1">Categoria</label>
                <input 
                  type="text" 
                  name="category" 
                  required
                  defaultValue={editingInstallment.category}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                />
              </div>

              <button 
                type="submit"
                disabled={isPending}
                className="w-full mt-4 bg-brand hover:bg-brand-dark text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
