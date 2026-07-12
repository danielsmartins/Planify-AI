'use client';

import { useState } from 'react';
import { Landmark, Plus, Trash2, Check, ChevronRight, ChevronLeft, Sparkles, Wallet, Calendar, CreditCard, Layers } from 'lucide-react';
import { completeOnboarding, skipOnboarding } from '@/app/actions';

interface CategoryItem {
  id?: string;
  name: string;
  color: string;
  monthlyLimit: number;
}

interface OnboardingWizardProps {
  user: {
    id: string;
    name: string;
  };
  initialCategories?: Array<{
    id?: string;
    name: string;
    color: string;
    monthlyLimit: string | number;
  }>;
}

interface CreditCardItem {
  name: string;
  limitAmount: number;
  closingDay: number;
  dueDay: number;
  color: string;
  brand: string;
}

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentType: 'account' | 'card';
  paymentTargetName?: string;
}

const PREMIUM_COLORS = [
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Slate', value: '#64748b' },
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

const CARD_BRANDS = [
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'visa', label: 'Visa' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'Amex' },
  { value: 'other', label: 'Outro' },
];

export function OnboardingWizard({ user, initialCategories }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1 State: Bank Account
  const [accountName, setAccountName] = useState('Minha Conta');
  const [accountType, setAccountType] = useState('checking');
  const [accountColor, setAccountColor] = useState('#8b5cf6');
  const [accountBalance, setAccountBalance] = useState('');

  // Step 2 State: Credit Cards
  const [creditCardsList, setCreditCardsList] = useState<CreditCardItem[]>([]);
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardClosingDay, setCardClosingDay] = useState('10');
  const [cardDueDay, setCardDueDay] = useState('15');
  const [cardColor, setCardColor] = useState('#64748b');
  const [cardBrand, setCardBrand] = useState('mastercard');

  // Step 3 State: Categories & Limits
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>(() => {
    if (initialCategories && initialCategories.length > 0) {
      return initialCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        monthlyLimit: typeof cat.monthlyLimit === 'string' ? parseFloat(cat.monthlyLimit) : cat.monthlyLimit || 0,
      }));
    }
    return [
      { name: 'Alimentação', color: '#ef4444', monthlyLimit: 0 },
      { name: 'Transporte', color: '#f59e0b', monthlyLimit: 0 },
      { name: 'Lazer', color: '#8b5cf6', monthlyLimit: 0 },
      { name: 'Moradia', color: '#3b82f6', monthlyLimit: 0 },
    ];
  });
  const [newCatName, setNewCatName] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8b5cf6');

  // Step 4 State: Expenses
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expDate, setExpDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [expPaymentType, setExpPaymentType] = useState<'account' | 'card'>('account');
  const [expPaymentTargetName, setExpPaymentTargetName] = useState('');

  // Handle setting default category and payment target when step 4 opens
  const initializeStep4 = () => {
    if (categoriesList.length > 0 && !expCategory) {
      setExpCategory(categoriesList[0].name);
    }
    setExpPaymentType('account');
    setExpPaymentTargetName(accountName);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim() || !cardLimit) return;

    const newCard: CreditCardItem = {
      name: cardName.trim(),
      limitAmount: parseFloat(cardLimit),
      closingDay: parseInt(cardClosingDay) || 10,
      dueDay: parseInt(cardDueDay) || 15,
      color: cardColor,
      brand: cardBrand,
    };

    setCreditCardsList((prev) => [...prev, newCard]);
    setCardName('');
    setCardLimit('');
    setCardClosingDay('10');
    setCardDueDay('15');
    setCardBrand('mastercard');
    setCardColor('#64748b');
  };

  const handleRemoveCard = (index: number) => {
    setCreditCardsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    // Check for duplicates
    if (categoriesList.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
      setErrorMsg('Essa categoria já existe.');
      return;
    }

    setErrorMsg('');
    const newCat: CategoryItem = {
      name: newCatName.trim(),
      color: newCatColor,
      monthlyLimit: newCatLimit ? parseFloat(newCatLimit) : 0,
    };

    setCategoriesList((prev) => [...prev, newCat]);
    setNewCatName('');
    setNewCatLimit('');
  };

  const handleRemoveCategory = (index: number) => {
    setCategoriesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDescription || !expAmount || !expCategory) return;

    const targetName = expPaymentType === 'account' ? accountName : expPaymentTargetName;

    const newExpense: ExpenseItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: expDescription,
      amount: parseFloat(expAmount),
      category: expCategory,
      date: expDate,
      paymentType: expPaymentType,
      paymentTargetName: targetName,
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setExpDescription('');
    setExpAmount('');
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

    const payload = {
      account: {
        name: accountName,
        type: accountType as 'checking' | 'savings' | 'investment' | 'cash',
        color: accountColor,
        balance: parseFloat(accountBalance || '0'),
      },
      creditCards: creditCardsList.map(card => ({
        name: card.name,
        limitAmount: card.limitAmount,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        color: card.color,
        brand: card.brand,
      })),
      categories: categoriesList.map(cat => ({
        name: cat.name,
        color: cat.color,
        monthlyLimit: cat.monthlyLimit,
      })),
      expenses: expenses.map(exp => ({
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        date: exp.date,
        paymentType: exp.paymentType,
        paymentTargetName: exp.paymentTargetName,
      })),
    };

    const res = await completeOnboarding(payload);

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
          Vamos iniciar sua conta no Planify AI. Complete os 5 passos para organizar suas finanças.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-900 h-1.5 rounded-full mb-8 relative overflow-hidden">
        <div 
          className="bg-white h-full transition-all duration-500 ease-out" 
          style={{ width: `${(step / 5) * 100}%` }}
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

      {/* STEP 2: Credit Cards */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <CreditCard size={18} className="text-neutral-400" />
              2. Possui algum cartão de crédito?
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Adicione os cartões que você utiliza. Isso permitirá gerenciar faturas e associar compras. (Opcional)
            </p>
          </div>

          {/* Credit Card Form */}
          <form onSubmit={handleAddCard} className="bg-neutral-950 p-4 rounded-xl border border-neutral-900 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Nome do Cartão</label>
                <input 
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Ex: Nubank, Itaú Black, XP"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Limite do Cartão (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={cardLimit}
                  onChange={(e) => setCardLimit(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Fechamento (Dia)</label>
                <input 
                  type="number" 
                  min="1"
                  max="31"
                  value={cardClosingDay}
                  onChange={(e) => setCardClosingDay(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Vencimento (Dia)</label>
                <input 
                  type="number"
                  min="1"
                  max="31"
                  value={cardDueDay}
                  onChange={(e) => setCardDueDay(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Bandeira</label>
                <select
                  value={cardBrand}
                  onChange={(e) => setCardBrand(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 transition-colors"
                >
                  {CARD_BRANDS.map(brand => (
                    <option key={brand.value} value={brand.value}>{brand.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1 gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-neutral-500">Cor do Cartão:</span>
                <div className="flex gap-1.5">
                  {PREMIUM_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setCardColor(color.value)}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer border flex items-center justify-center ${
                        cardColor === color.value 
                          ? 'scale-110 border-white ring-1 ring-neutral-800' 
                          : 'border-neutral-900 scale-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {cardColor === color.value && <Check size={8} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!cardName || !cardLimit}
                className="bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700/60 font-semibold py-1.5 px-3 rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
                Adicionar Cartão
              </button>
            </div>
          </form>

          {/* List of added cards */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-2">Cartões a cadastrar ({creditCardsList.length})</label>
            {creditCardsList.length === 0 ? (
              <div className="text-center py-6 rounded-xl border border-dashed border-neutral-900 text-neutral-600 text-xs">
                Nenhum cartão adicionado. Clique em &quot;Próximo Passo&quot; se não possuir cartões.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {creditCardsList.map((card, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-neutral-900 bg-neutral-950/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-5 rounded border border-white/10 flex items-center justify-center text-[8px] font-bold text-white uppercase" style={{ backgroundColor: card.color }}>
                        {card.brand.substring(0, 4)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white leading-tight">{card.name}</span>
                        <span className="text-[9px] text-neutral-500">Lim: {formatBRL(card.limitAmount)} | Venc: Dia {card.dueDay}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCard(idx)}
                      className="text-neutral-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
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
              <span>Próximo Passo</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Categories & Limits */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Layers size={18} className="text-neutral-400" />
              3. Metas e Limites de Gastos por Categoria
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Defina o orçamento mensal limite para cada categoria de gasto. Deixe zerado se não quiser estipular limite.
            </p>
          </div>

          {/* Custom Category Form */}
          <form onSubmit={handleAddCustomCategory} className="bg-neutral-950 p-4 rounded-xl border border-neutral-900 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Nova Categoria</label>
                <input 
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Pets, Saúde, Presentes"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>

              <div className="w-full sm:w-40">
                <label className="block text-[10px] font-medium text-neutral-500 mb-1">Limite Mensal (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={newCatLimit}
                  onChange={(e) => setNewCatLimit(e.target.value)}
                  placeholder="Ex: 150,00"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors font-mono"
                />
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <span className="text-[10px] font-medium text-neutral-500">Cor</span>
                <div className="flex gap-1.5 py-1">
                  {PREMIUM_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewCatColor(color.value)}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer border flex items-center justify-center ${
                        newCatColor === color.value 
                          ? 'scale-110 border-white ring-1 ring-neutral-800' 
                          : 'border-neutral-900 scale-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {newCatColor === color.value && <Check size={8} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700/60 font-semibold py-2 px-3 rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Plus size={12} />
                Adicionar
              </button>
            </div>
          </form>

          {/* List of categories with limits */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-2">Suas Categorias ({categoriesList.length})</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {categoriesList.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-neutral-900 bg-neutral-950/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs font-bold text-white">{cat.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1.5 text-neutral-600 text-[10px] font-semibold font-mono">R$</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={cat.monthlyLimit === 0 ? '' : cat.monthlyLimit}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setCategoriesList(prev => prev.map((c, i) => i === idx ? { ...c, monthlyLimit: val } : c));
                        }}
                        placeholder="Sem limite"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-7 pr-1.5 py-1 text-[11px] text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(idx)}
                      className="text-neutral-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
            <button
              onClick={() => setStep(2)}
              className="border border-neutral-800 hover:bg-neutral-900 text-neutral-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Voltar</span>
            </button>

            <button
              onClick={() => {
                initializeStep4();
                setStep(4);
              }}
              className="bg-white hover:bg-neutral-200 text-black px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Próximo Passo</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Expenses of the Month */}
      {step === 4 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Wallet size={18} className="text-neutral-400" />
              4. Tem alguma despesa deste mês para registrar?
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Adicione os gastos que você já teve neste mês. Isso ajuda a iniciar com gráficos preenchidos! (Opcional)
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
                  {categoriesList.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                  {categoriesList.length === 0 && <option value="Outros">Outros</option>}
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

            {/* Payment Method / Origin selection */}
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1.5">Origem do Gasto (De onde saiu o dinheiro?)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpPaymentType('account');
                    setExpPaymentTargetName(accountName);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    expPaymentType === 'account'
                      ? 'border-neutral-400 bg-neutral-900/60 text-white'
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <Landmark size={12} className={expPaymentType === 'account' ? 'text-white' : 'text-neutral-500'} />
                  <span className="truncate">Conta: {accountName}</span>
                </button>

                {creditCardsList.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setExpPaymentType('card');
                      setExpPaymentTargetName(card.name);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      expPaymentType === 'card' && expPaymentTargetName === card.name
                        ? 'border-neutral-400 bg-neutral-900/60 text-white'
                        : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <CreditCard size={12} className={expPaymentType === 'card' && expPaymentTargetName === card.name ? 'text-white' : 'text-neutral-500'} />
                    <span className="truncate">Cartão: {card.name}</span>
                  </button>
                ))}
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
                    <div className="flex flex-col gap-0.5 max-w-[70%]">
                      <span className="font-semibold text-white truncate">{item.description}</span>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                        <span className="px-1.5 py-0.2 bg-neutral-900 border border-neutral-850 rounded text-neutral-400">{item.category}</span>
                        <span className="flex items-center gap-0.5">
                          <Calendar size={10} />
                          {new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>
                        <span className="flex items-center gap-1 px-1 bg-neutral-900/40 rounded border border-neutral-900 text-neutral-400">
                          {item.paymentType === 'account' ? <Landmark size={8} /> : <CreditCard size={8} />}
                          {item.paymentTargetName}
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
              onClick={() => setStep(3)}
              className="border border-neutral-800 hover:bg-neutral-900 text-neutral-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Voltar</span>
            </button>

            <button
              onClick={() => setStep(5)}
              className="bg-white hover:bg-neutral-200 text-black px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Revisar Dados</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Review and Confirm */}
      {step === 5 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Check size={18} className="text-emerald-400" />
              5. Tudo pronto! Revise os dados abaixo
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Confirme se está tudo certo antes de criar a sua conta. Ao finalizar, você será redirecionado para o dashboard principal.
            </p>
          </div>

          {/* Summary Box */}
          <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-1">
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

            {/* Credit Cards Summary Box */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-neutral-400 block border-b border-neutral-900 pb-1.5">Cartões de Crédito ({creditCardsList.length})</span>
              {creditCardsList.length === 0 ? (
                <p className="text-xs text-neutral-500 py-1">Nenhum cartão de crédito cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {creditCardsList.map((card, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-neutral-900/30 border border-neutral-900 rounded-lg">
                      <div className="w-6 h-4 rounded text-[7px] font-bold text-white flex items-center justify-center uppercase" style={{ backgroundColor: card.color }}>
                        {card.brand.substring(0, 3)}
                      </div>
                      <div className="flex flex-col text-[10px]">
                        <span className="text-white font-semibold leading-none mb-0.5">{card.name}</span>
                        <span className="text-neutral-500 leading-none">Lim: {formatBRL(card.limitAmount)} | Venc: Dia {card.dueDay}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Categories and Budgets Summary */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-neutral-400 block border-b border-neutral-900 pb-1.5">Categorias e Limites de Gastos</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoriesList.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] p-2 bg-neutral-900/30 border border-neutral-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-neutral-200 font-semibold">{cat.name}</span>
                    </div>
                    <span className="text-neutral-400 font-mono">
                      {cat.monthlyLimit > 0 ? formatBRL(cat.monthlyLimit) : 'Sem limite'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses Summary Box */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                <span className="text-xs font-semibold text-neutral-400">Despesas Iniciais registradas</span>
                <span className="text-xs font-mono font-bold text-neutral-200">{expenses.length} itens</span>
              </div>

              {expenses.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-4">Nenhuma despesa inicial registrada.</p>
              ) : (
                <>
                  <div className="max-h-36 overflow-y-auto divide-y divide-neutral-900 pr-1">
                    {expenses.map(item => (
                      <div key={item.id} className="flex justify-between items-center py-2 text-xs">
                        <div className="flex flex-col">
                          <span className="text-neutral-300 font-medium">{item.description}</span>
                          <span className="text-[9px] text-neutral-500 mt-0.5">Destino: {item.paymentTargetName}</span>
                        </div>
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
              onClick={() => setStep(4)}
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
