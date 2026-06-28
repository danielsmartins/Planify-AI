'use client';

import { useTransition } from 'react';
import { addSubscription, deleteSubscription, toggleSubscriptionStatus } from '@/app/subscriptions/actions';
import { Trash2, Plus, CalendarClock, Ban, CheckCircle2, RotateCcw } from 'lucide-react';

interface SubscriptionProps {
  id: string;
  name: string;
  amount: string;
  category: string;
  billingCycle: string;
  nextBillingDate: Date;
  accountId: string | null;
  creditCardId: string | null;
  status: string;
  color: string;
}

interface OptionProps {
  id: string;
  name: string;
}

export function SubscriptionClient({ 
  subscriptions, 
  categories, 
  accounts, 
  creditCards 
}: { 
  subscriptions: SubscriptionProps[], 
  categories: OptionProps[],
  accounts: OptionProps[],
  creditCards: OptionProps[]
}) {
  const [isPending, startTransition] = useTransition();

  const handleAdd = (formData: FormData) => {
    startTransition(() => {
      addSubscription(formData);
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta assinatura?')) {
      startTransition(() => {
        deleteSubscription(id);
      });
    }
  };

  const handleToggle = (id: string, currentStatus: string) => {
    startTransition(() => {
      toggleSubscriptionStatus(id, currentStatus);
    });
  };

  const activeMonthly = subscriptions
    .filter(s => s.status === 'active' && s.billingCycle === 'monthly')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    
  const activeYearly = subscriptions
    .filter(s => s.status === 'active' && s.billingCycle === 'yearly')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  const totalMonthlyImpact = activeMonthly + (activeYearly / 12);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-brand">
          <p className="text-sm text-slate-400">Impacto Mensal Fixo</p>
          <h2 className="text-3xl font-bold mt-1">R$ {totalMonthlyImpact.toFixed(2).replace('.', ',')}</h2>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500">
          <p className="text-sm text-slate-400">Mensalidades (Total)</p>
          <h2 className="text-2xl font-bold mt-1">R$ {activeMonthly.toFixed(2).replace('.', ',')}</h2>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-amber-500">
          <p className="text-sm text-slate-400">Anuidades (Total)</p>
          <h2 className="text-2xl font-bold mt-1">R$ {activeYearly.toFixed(2).replace('.', ',')}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <div className="lg:col-span-2 space-y-4">
          {subscriptions.length === 0 ? (
            <div className="text-center py-12 glass-panel rounded-2xl">
              <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw size={32} className="text-brand" />
              </div>
              <p className="text-slate-300 font-medium mb-1">Você não possui assinaturas</p>
              <p className="text-slate-500 text-sm">Adicione serviços como Netflix ou Spotify para acompanhá-los aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscriptions.map((sub) => {
                const isCanceled = sub.status === 'canceled';
                const nextDate = new Date(sub.nextBillingDate);
                
                return (
                  <div key={sub.id} className={`glass-panel p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden transition-all ${isCanceled ? 'opacity-60 grayscale' : 'hover:-translate-y-1 hover:shadow-xl'}`}>
                    <div className="absolute top-0 left-0 w-1.5 h-full opacity-80" style={{ backgroundColor: sub.color }}></div>
                    
                    <div className="flex items-start justify-between pl-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-bold text-lg ${isCanceled ? 'line-through text-slate-400' : 'text-white'}`}>{sub.name}</h3>
                          {isCanceled ? (
                            <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full">Cancelada</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">Ativa</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{sub.category} • Cobrança {sub.billingCycle === 'monthly' ? 'Mensal' : 'Anual'}</p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleToggle(sub.id, sub.status)}
                          disabled={isPending}
                          className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg disabled:opacity-50"
                          title={isCanceled ? "Reativar Assinatura" : "Cancelar Assinatura"}
                        >
                          {isCanceled ? <CheckCircle2 size={18} /> : <Ban size={18} className="hover:text-amber-400" />}
                        </button>
                        <button 
                          onClick={() => handleDelete(sub.id)}
                          disabled={isPending}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-lg disabled:opacity-50"
                          title="Excluir Definitivamente"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="pl-3 flex items-end justify-between mt-2">
                      <div>
                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                          <CalendarClock size={12} />
                          Próx. Cobrança
                        </p>
                        <p className="text-sm font-medium">
                          {nextDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${isCanceled ? 'text-slate-400' : 'text-white'}`}>
                          R$ {parseFloat(sub.amount).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-panel p-6 rounded-2xl h-max">
          <h3 className="text-lg font-bold mb-4">Adicionar Serviço</h3>
          
          <form action={handleAdd} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Nome do Serviço</label>
              <input type="text" name="name" required placeholder="Ex: Netflix" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Valor (R$)</label>
                <input type="number" name="amount" step="0.01" required placeholder="0.00" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Frequência</label>
                <select name="billingCycle" required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors">
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-slate-300">Categoria</label>
              </div>
              <select name="category" required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors">
                {categories.length > 0 ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : <option value="Lazer">Lazer</option>}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Próxima Cobrança</label>
              <input type="date" name="nextBillingDate" required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors" />
            </div>

            <div className="pt-2 border-t border-slate-700/50">
              <label className="block text-sm text-slate-400 mb-2">Forma de Pagamento (Escolha UMA):</label>
              
              <div className="space-y-3">
                {creditCards.length > 0 && (
                  <div>
                    <select name="creditCardId" defaultValue="" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors">
                      <option value="">Nenhum Cartão de Crédito</option>
                      {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {accounts.length > 0 && (
                  <div>
                    <select name="accountId" defaultValue="" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors">
                      <option value="">Nenhuma Conta (Débito Automático)</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2">
              <label className="block text-sm text-slate-300 mb-1">Cor</label>
              <div className="flex items-center gap-2">
                <input type="color" name="color" defaultValue="#e11d48" className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                <span className="text-xs text-slate-500">Cor de destaque (ex: Netflix = Vermelho)</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isPending}
              className="w-full mt-4 bg-brand hover:bg-brand-dark text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Plus size={16} />
              {isPending ? 'Salvando...' : 'Adicionar Assinatura'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
