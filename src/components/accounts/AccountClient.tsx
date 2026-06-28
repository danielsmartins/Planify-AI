'use client';

import { useState, useTransition } from 'react';
import { addAccount, deleteAccount, updateAccount } from '@/app/accounts/actions';
import { Trash2, Plus, Wallet, Edit2, X, PiggyBank, Landmark, Banknote } from 'lucide-react';

interface AccountProps {
  id: string;
  name: string;
  color: string;
  type: string;
  balance: string;
}

const getAccountIcon = (type: string, color: string) => {
  switch (type) {
    case 'savings': return <PiggyBank style={{ color }} size={24} />;
    case 'investment': return <Landmark style={{ color }} size={24} />;
    case 'cash': return <Banknote style={{ color }} size={24} />;
    default: return <Wallet style={{ color }} size={24} />;
  }
};

const getAccountTypeName = (type: string) => {
  switch (type) {
    case 'savings': return 'Poupança';
    case 'investment': return 'Investimento';
    case 'cash': return 'Dinheiro';
    default: return 'Conta Corrente';
  }
};

export function AccountClient({ accounts }: { accounts: AccountProps[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingAccount, setEditingAccount] = useState<AccountProps | null>(null);

  const handleAdd = (formData: FormData) => {
    startTransition(() => {
      addAccount(formData);
    });
  };

  const handleEdit = (formData: FormData) => {
    if (!editingAccount) return;
    startTransition(() => {
      updateAccount(editingAccount.id, formData).then(() => {
        setEditingAccount(null);
      });
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta? Isso pode desvincular as transações atreladas a ela.')) {
      startTransition(() => {
        deleteAccount(id);
      });
    }
  };

  const totalBalance = accounts.reduce((acc, curr) => acc + parseFloat(curr.balance), 0);

  return (
    <>
      <div className="glass-panel p-6 rounded-2xl mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Saldo Total Consolidado</p>
          <h2 className="text-3xl font-bold">R$ {totalBalance.toFixed(2).replace('.', ',')}</h2>
        </div>
        <div className="w-12 h-12 bg-brand/20 rounded-xl flex items-center justify-center">
          <Landmark className="text-brand" size={24} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="lg:col-span-2 space-y-4">
          
          {accounts.length === 0 ? (
            <p className="text-slate-500">Nenhuma conta cadastrada. Crie uma ao lado para organizar suas finanças!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <div key={acc.id} className="glass-panel p-5 rounded-xl flex flex-col gap-4 group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-0 left-0 w-1.5 h-full opacity-80" style={{ backgroundColor: acc.color }}></div>
                  
                  <div className="flex items-start justify-between pl-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800/50">
                        {getAccountIcon(acc.type, acc.color)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{acc.name}</h3>
                        <p className="text-xs text-slate-400">{getAccountTypeName(acc.type)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100">
                      <button 
                        onClick={() => setEditingAccount(acc)}
                        disabled={isPending}
                        className="p-1.5 text-slate-500 hover:text-brand transition-colors rounded-lg disabled:opacity-50"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(acc.id)}
                        disabled={isPending}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-lg disabled:opacity-50"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="pl-3 mt-2">
                    <p className="text-xs text-slate-400 mb-1">Saldo Atual</p>
                    <p className={`text-xl font-bold ${parseFloat(acc.balance) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      R$ {parseFloat(acc.balance).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel p-6 rounded-2xl h-max">
          <h3 className="text-lg font-bold mb-4">Adicionar Conta</h3>
          
          <form action={handleAdd} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Nome da Conta</label>
              <input 
                type="text" 
                name="name" 
                required
                placeholder="Ex: Nubank, Carteira"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Tipo de Conta</label>
              <select 
                name="type" 
                required
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
              >
                <option value="checking">Conta Corrente</option>
                <option value="savings">Poupança</option>
                <option value="investment">Investimento</option>
                <option value="cash">Dinheiro em Espécie</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-slate-300 mb-1">Cor de Identificação</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  name="color" 
                  defaultValue="#8b5cf6"
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <span className="text-xs text-slate-500">Escolha uma cor para os gráficos</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Saldo Inicial (R$)</label>
              <input 
                type="number" 
                name="balance" 
                step="0.01"
                placeholder="0,00"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
              />
            </div>

            <button 
              type="submit"
              disabled={isPending}
              className="w-full mt-2 bg-brand/20 text-brand hover:bg-brand/30 hover:text-white border border-brand/50 font-medium py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Plus size={16} />
              {isPending ? 'Salvando...' : 'Criar Conta'}
            </button>
          </form>
        </div>
      </div>

      {/* Edit Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setEditingAccount(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20}/>
            </button>
            <h2 className="text-xl font-bold mb-6">Editar Conta</h2>

            <form action={handleEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Nome da Conta</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  defaultValue={editingAccount.name}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Tipo de Conta</label>
                <select 
                  name="type" 
                  required
                  defaultValue={editingAccount.type}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                >
                  <option value="checking">Conta Corrente</option>
                  <option value="savings">Poupança</option>
                  <option value="investment">Investimento</option>
                  <option value="cash">Dinheiro em Espécie</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-slate-300 mb-1">Cor</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    name="color" 
                    defaultValue={editingAccount.color}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="text-xs text-slate-500">Escolha uma cor para os gráficos</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Saldo Atual (R$)</label>
                <input 
                  type="number" 
                  name="balance" 
                  step="0.01"
                  defaultValue={editingAccount.balance}
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
