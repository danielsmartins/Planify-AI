'use client';
import { useState } from 'react';
import { Plus, Receipt, X, Sparkles } from 'lucide-react';
import { createTransaction, addTransactionViaAI, createInstallmentPurchase } from '@/app/actions';
import Link from 'next/link';

interface CategoryProps {
  id: string;
  name: string;
}

interface CreditCardProps {
  id: string;
  name: string;
  color: string;
}

export function ActionButtons({ categories, creditCards = [] }: { categories: CategoryProps[], creditCards?: CreditCardProps[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense' | 'ai'>('expense');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Installment state
  const [isInstallment, setIsInstallment] = useState(false);

  const resetState = () => {
    setIsOpen(false);
    setErrorMsg('');
    setIsInstallment(false);
  };

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
      if (type === 'expense' && isInstallment) {
        // Nova action para compras parceladas
        const res = await createInstallmentPurchase(formData);
        if (res?.error) {
          setErrorMsg(res.error);
          setLoading(false);
          return;
        }
      } else {
        formData.append('type', type);
        const res = await createTransaction(formData);
        if (res?.error) {
          setErrorMsg(res.error);
          setLoading(false);
          return;
        }
      }
    }
    
    setLoading(false);
    resetState();
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
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <button onClick={resetState} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X size={20}/></button>
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
                    <input required name="description" type="text" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder={isInstallment ? "Ex: iPhone 15" : "Ex: Salário"} />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      {isInstallment ? "Valor da Parcela (R$)" : "Valor (R$)"}
                    </label>
                    <input required name="amount" type="number" step="0.01" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder="0.00" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-slate-300">Categoria</label>
                      <Link href="/categories" className="text-xs text-brand hover:underline" onClick={resetState}>Criar nova</Link>
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

                  {type === 'expense' && creditCards.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm text-slate-300">Cartão de Crédito (Opcional)</label>
                        <Link href="/cards" className="text-xs text-brand hover:underline" onClick={resetState}>Gerenciar</Link>
                      </div>
                      <select name="creditCardId" defaultValue="" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors">
                        <option value="">Nenhum (Débito/Dinheiro)</option>
                        {creditCards.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {type === 'expense' && (
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="checkbox" 
                        id="installment-toggle" 
                        checked={isInstallment}
                        onChange={(e) => setIsInstallment(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 focus:ring-brand accent-brand cursor-pointer"
                      />
                      <label htmlFor="installment-toggle" className="text-sm text-slate-300 cursor-pointer select-none">
                        É uma compra parcelada?
                      </label>
                    </div>
                  )}

                  {isInstallment && type === 'expense' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Qtd. de Parcelas</label>
                        <input required min="2" max="360" name="installmentsCount" type="number" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder="Ex: 12" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1" title="Em qual parcela você está agora?">Parcela Atual</label>
                        <input required min="1" max="360" name="currentInstallment" type="number" defaultValue="1" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" />
                      </div>
                    </div>
                  )}

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
