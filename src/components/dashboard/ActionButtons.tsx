'use client';
import { useState } from 'react';
import { Plus, Receipt, X } from 'lucide-react';
import { createTransaction } from '@/app/actions';

export function ActionButtons() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append('type', type);
    await createTransaction(formData);
    setLoading(false);
    setIsOpen(false);
  }

  return (
    <>
      <button onClick={() => { setType('income'); setIsOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] cursor-pointer">
        <Plus size={18} />
        <span>Nova Receita</span>
      </button>

      <button onClick={() => { setType('expense'); setIsOpen(true); }} className="bg-brand hover:bg-brand-dark text-white flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] cursor-pointer">
        <Receipt size={18} />
        <span>Nova Despesa</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={20}/></button>
            <h2 className="text-xl font-bold mb-6">{type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa'}</h2>
            
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Descrição</label>
                <input required name="description" type="text" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder="Ex: Salário" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Valor (R$)</label>
                <input required name="amount" type="number" step="0.01" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Categoria</label>
                <input required name="category" type="text" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder="Ex: Serviços" />
              </div>
              <button disabled={loading} type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-3 rounded-xl mt-4 cursor-pointer disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar Transação'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
