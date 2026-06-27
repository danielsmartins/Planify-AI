'use client';
import { useState } from 'react';
import { Plus, Receipt, X, Sparkles } from 'lucide-react';
import { createTransaction, addTransactionViaAI } from '@/app/actions';
import Link from 'next/link';

interface CategoryProps {
  id: string;
  name: string;
}

export function ActionButtons({ categories }: { categories: CategoryProps[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense' | 'ai'>('expense');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const formData = new FormData(e.currentTarget);
    
    if (type === 'ai') {
      const text = formData.get('ai_text') as string;
      const res = await addTransactionViaAI(text);
      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }
    } else {
      formData.append('type', type);
      await createTransaction(formData);
    }
    
    setLoading(false);
    setIsOpen(false);
  }

  return (
    <>
      <button onClick={() => { setType('ai'); setIsOpen(true); }} className="bg-gradient-to-r from-purple-500 to-brand hover:from-purple-600 hover:to-brand-dark text-white flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] cursor-pointer">
        <Sparkles size={18} />
        <span>Adicionar com IA</span>
      </button>

      <button onClick={() => { setType('income'); setIsOpen(true); }} className="glass-panel flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800/50 transition-colors cursor-pointer">
        <Plus size={18} className="text-emerald-400" />
        <span className="hidden sm:inline">Nova Receita</span>
      </button>

      <button onClick={() => { setType('expense'); setIsOpen(true); }} className="glass-panel flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800/50 transition-colors cursor-pointer">
        <Receipt size={18} className="text-rose-400" />
        <span className="hidden sm:inline">Nova Despesa</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={20}/></button>
            <h2 className="text-xl font-bold mb-6">
              {type === 'income' ? 'Adicionar Receita' : type === 'expense' ? 'Adicionar Despesa' : 'Inteligência Artificial ✨'}
            </h2>
            
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              {type === 'ai' ? (
                <>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Digite o que você gastou ou ganhou:</label>
                    <textarea required name="ai_text" rows={4} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-brand transition-colors resize-none" placeholder="Ex: Gastei 45 reais no Ifood com o cartão de crédito..." />
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-purple-500 to-brand hover:from-purple-600 hover:to-brand-dark text-white font-medium py-3 rounded-xl mt-2 cursor-pointer disabled:opacity-50">
                    {loading ? 'Analisando e salvando...' : 'Processar com IA'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Descrição</label>
                    <input required name="description" type="text" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder="Ex: Salário" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Valor (R$)</label>
                    <input required name="amount" type="number" step="0.01" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder="0.00" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-slate-300">Categoria</label>
                      <Link href="/categories" className="text-xs text-brand hover:underline">Criar nova</Link>
                    </div>
                    {categories.length > 0 ? (
                      <select required name="category" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors">
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input required name="category" type="text" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder="Ex: Serviços" />
                    )}
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-3 rounded-xl mt-4 cursor-pointer disabled:opacity-50">
                    {loading ? 'Salvando...' : 'Salvar Transação'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
