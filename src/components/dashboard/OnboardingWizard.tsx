'use client';

import { useState } from 'react';
import { Landmark, Plus, Trash2, Check, ChevronRight, ChevronLeft, Sparkles, Wallet, Calendar } from 'lucide-react';
import { completeOnboarding, skipOnboarding } from '@/app/actions';

interface OnboardingWizardProps {
  user: {
    id: string;
    name: string;
  };
}

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

const PREMIUM_COLORS = [
  { name: 'Slate', value: '#64748b' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
];

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Corrente', description: 'Uso diário e transações rápidas' },
  { value: 'savings', label: 'Poupança', description: 'Reservas financeiras' },
  { value: 'investment', label: 'Investimento', description: 'Ações, CDBs e fundos' },
  { value: 'cash', label: 'Dinheiro Físico', description: 'Dinheiro na carteira' },
];

const DEFAULT_CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Outros'];

export function OnboardingWizard({ user }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1 State: Bank Account
  const [accountName, setAccountName] = useState('Minha Conta');
  const [accountType, setAccountType] = useState('checking');
  const [accountColor, setAccountColor] = useState('#8b5cf6');
  const [accountBalance, setAccountBalance] = useState('');

  // Step 2 State: Expenses
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Alimentação');
  const [expDate, setExpDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDescription || !expAmount) return;

    const newExpense: ExpenseItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: expDescription,
      amount: parseFloat(expAmount),
      category: expCategory,
      date: expDate,
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setExpDescription('');
    setExpAmount('');
    setExpCategory('Alimentação');
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSkip = async () => {
    if (confirm('Deseja pular a configuração inicial? Você começará com saldo zerado.')) {
      setLoading(true);
      const res = await skipOnboarding();
      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
      } else {
        window.location.reload();
      }
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('accountName', accountName);
    formData.append('accountType', accountType);
    formData.append('accountColor', accountColor);
    formData.append('accountBalance', accountBalance || '0');

    // Mapear expenses retirando o id temporário para passar à action
    const cleanedExpenses = expenses.map(({ description, amount, category, date }) => ({
      description,
      amount,
      category,
      date,
    }));

    const res = await completeOnboarding(formData, cleanedExpenses);

    if (res?.error) {
      setErrorMsg(res.error);
      setLoading(false);
    } else {
      window.location.reload();
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const firstName = user.name.split(' ')[0];

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel p-6 sm:p-10 rounded-2xl border border-neutral-800 bg-[#070709] relative select-none animate-in fade-in zoom-in duration-300">
      
      {/* Skip Button Top Right */}
      <button 
        onClick={handleSkip} 
        disabled={loading}
        className="absolute top-4 right-4 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors px-3 py-1.5 rounded-lg border border-neutral-900 hover:border-neutral-800 bg-neutral-950 cursor-pointer disabled:opacity-50"
      >
        Pular passo a passo
      </button>

      {/* Header Info */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-white p-1.5 rounded-lg text-black">
            <Sparkles size={16} />
          </div>
          <span className="text-xs font-mono tracking-widest text-neutral-500 uppercase">Configuração de Conta</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight sm:text-3xl">
          Olá, {firstName}! ✨
        </h1>
        <p className="text-sm text-neutral-400 mt-2">
          Vamos iniciar sua conta no Planify AI. Complete os 3 passos para organizar suas finanças.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-900 h-1.5 rounded-full mb-8 relative overflow-hidden">
        <div 
          className="bg-white h-full transition-all duration-500 ease-out" 
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs mb-6 font-medium">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: Bank Account */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Landmark size={18} className="text-neutral-400" />
              1. Qual é sua conta bancária principal?
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Cadastre a conta que você mais utiliza no dia a dia para que possamos monitorar seu saldo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nome da Conta</label>
              <input 
                type="text" 
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ex: Nubank, Itaú, Carteira"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Saldo Atual (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-neutral-600 text-sm font-semibold font-mono">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors font-semibold font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Account Types */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2">Tipo de Conta</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAccountType(type.value)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    accountType === type.value 
                      ? 'border-neutral-400 bg-neutral-900/60' 
                      : 'border-neutral-900 bg-neutral-950/40 hover:border-neutral-850 hover:bg-neutral-900/20'
                  }`}
                >
                  <span className="text-xs font-bold text-white">{type.label}</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2">Cor da Conta</label>
            <div className="flex flex-wrap gap-3">
              {PREMIUM_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setAccountColor(color.value)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer border flex items-center justify-center ${
                    accountColor === color.value 
                      ? 'scale-110 border-white ring-2 ring-neutral-800' 
                      : 'border-neutral-900 scale-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {accountColor === color.value && <Check size={12} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end pt-4 border-t border-neutral-900">
            <button
              onClick={() => {
                if (!accountName.trim()) {
                  setErrorMsg('Por favor, informe o nome da conta.');
                  return;
                }
                if (!accountBalance.trim()) {
                  setErrorMsg('Por favor, informe o saldo atual.');
                  return;
                }
                setErrorMsg('');
                setStep(2);
              }}
              className="bg-white hover:bg-neutral-200 text-black px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Próximo Passo</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Expenses of the Month */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Wallet size={18} className="text-neutral-400" />
              2. Tem alguma despesa deste mês para registrar?
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Adicione os gastos que você já teve neste mês até agora (ex: mercado, aluguel, assinatura). Isso ajuda a iniciar com gráficos preenchidos! (Opcional)
            </p>
          </div>

          {/* Expense Form */}
          <form onSubmit={handleAddExpense} className="bg-neutral-950 p-4 rounded-xl border border-neutral-900 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Descrição do Gasto</label>
                <input 
                  type="text"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Ex: Supermercado, Uber"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Categoria</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 transition-colors"
                >
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Data</label>
                <input 
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!expDescription || !expAmount}
              className="bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700/60 font-semibold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 mt-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              Adicionar à Lista
            </button>
          </form>

          {/* List of added expenses */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-2">Despesas a cadastrar ({expenses.length})</label>
            {expenses.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-neutral-900 text-neutral-600 text-xs">
                Nenhum gasto adicionado ainda. Preencha o formulário acima se desejar.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-neutral-900 rounded-xl divide-y divide-neutral-900 bg-neutral-950/20">
                {expenses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 text-xs hover:bg-neutral-900/30 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-white">{item.description}</span>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                        <span className="px-1.5 py-0.2 bg-neutral-900 border border-neutral-850 rounded text-neutral-400">{item.category}</span>
                        <span className="flex items-center gap-0.5">
                          <Calendar size={10} />
                          {new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-rose-400">{formatBRL(item.amount)}</span>
                      <button
                        onClick={() => handleRemoveExpense(item.id)}
                        className="text-neutral-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
            <button
              onClick={() => setStep(1)}
              className="border border-neutral-800 hover:bg-neutral-900 text-neutral-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Voltar</span>
            </button>

            <button
              onClick={() => setStep(3)}
              className="bg-white hover:bg-neutral-200 text-black px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Revisar Dados</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review and Confirm */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Check size={18} className="text-emerald-400" />
              3. Tudo pronto! Revise os dados abaixo
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Confirme se está tudo certo antes de criar a sua conta. Ao finalizar, você será redirecionado para o dashboard principal.
            </p>
          </div>

          {/* Summary Card */}
          <div className="space-y-4">
            {/* Account Info Box */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-white/20" 
                  style={{ backgroundColor: accountColor }}
                />
                <div>
                  <h4 className="text-xs font-bold text-white">{accountName}</h4>
                  <p className="text-[10px] text-neutral-500 font-medium uppercase mt-0.5">
                    {ACCOUNT_TYPES.find(a => a.value === accountType)?.label || accountType}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-neutral-500 block">Saldo Cadastrado</span>
                <span className="font-mono font-extrabold text-sm text-white">
                  {formatBRL(parseFloat(accountBalance || '0'))}
                </span>
              </div>
            </div>

            {/* Expenses Summary Box */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                <span className="text-xs font-semibold text-neutral-400">Despesas do Mês registradas</span>
                <span className="text-xs font-mono font-bold text-neutral-200">{expenses.length} itens</span>
              </div>

              {expenses.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-4">Nenhuma despesa registrada.</p>
              ) : (
                <>
                  <div className="max-h-36 overflow-y-auto divide-y divide-neutral-900 pr-1">
                    {expenses.map(item => (
                      <div key={item.id} className="flex justify-between items-center py-2 text-xs">
                        <span className="text-neutral-400 font-medium">{item.description}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500">{item.category}</span>
                          <span className="font-mono font-semibold text-neutral-300">{formatBRL(item.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-neutral-900 pt-2 flex justify-between items-center text-xs font-bold">
                    <span className="text-neutral-400">Total de Despesas Iniciais</span>
                    <span className="font-mono text-rose-400">
                      {formatBRL(expenses.reduce((acc, curr) => acc + curr.amount, 0))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className="border border-neutral-800 hover:bg-neutral-900 text-neutral-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ChevronLeft size={14} />
              <span>Voltar</span>
            </button>

            <button
              onClick={handleComplete}
              disabled={loading}
              className="bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check size={14} />
                  <span>Finalizar e Começar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
