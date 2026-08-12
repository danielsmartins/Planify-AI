'use client';
import { useState, useEffect } from 'react';
import { Plus, Receipt, X, Sparkles, ArrowLeft } from 'lucide-react';
import { createTransaction, createInstallmentPurchase, parseTransactionViaAI } from '@/app/actions';
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

interface AccountProps {
  id: string;
  name: string;
}

interface ExtractedData {
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  isInstallment?: boolean;
  installmentsCount?: number;
  currentInstallment?: number;
  paymentMethodSuggestion?: string;
}

export function ActionButtons({ 
  categories, 
  creditCards = [], 
  accounts = [] 
}: { 
  categories: CategoryProps[]; 
  creditCards?: CreditCardProps[]; 
  accounts?: AccountProps[]; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense' | 'ai'>('expense');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Installment state
  const [isInstallment, setIsInstallment] = useState(false);

  // AI 2-Step Modal State
  const [aiStep, setAiStep] = useState<1 | 2>(1);
  const [aiText, setAiText] = useState('');
  const [aiParsedData, setAiParsedData] = useState<ExtractedData | null>(null);

  // Mobile Floating Bar Scroll/Touch Visibility State
  const [isMobileBarVisible, setIsMobileBarVisible] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleInteraction = () => {
      setIsMobileBarVisible(true);

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobileBarVisible(false);
      }, 3500);
    };

    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('touchmove', handleInteraction, { passive: true });

    // Initial timeout to gently fade out floating bar after initial load if inactive
    timeoutId = setTimeout(() => {
      setIsMobileBarVisible(false);
    }, 4500);

    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('touchmove', handleInteraction);
      clearTimeout(timeoutId);
    };
  }, []);

  const resetState = () => {
    setIsOpen(false);
    setErrorMsg('');
    setIsInstallment(false);
    setAiStep(1);
    setAiText('');
    setAiParsedData(null);
  };

  async function handleParseAI(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await parseTransactionViaAI(aiText);

    if (res.error || !res.data) {
      setErrorMsg(res.error || 'Não foi possível analisar a mensagem.');
      setLoading(false);
      return;
    }

    setAiParsedData(res.data);
    if (res.data.isInstallment) {
      setIsInstallment(true);
    }
    setAiStep(2);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const formData = new FormData(e.currentTarget);
    
    // Extrair forma de pagamento para preencher accountId/creditCardId antes de enviar
    const paymentMethod = formData.get('paymentMethod') as string | null;
    if (paymentMethod) {
      if (paymentMethod.startsWith('account_')) {
        formData.set('accountId', paymentMethod.replace('account_', ''));
        formData.set('creditCardId', '');
      } else if (paymentMethod.startsWith('card_')) {
        formData.set('creditCardId', paymentMethod.replace('card_', ''));
        formData.set('accountId', '');
      }
    }
    
    const targetType = type === 'ai' ? (aiParsedData?.type || 'expense') : type;
    if (targetType === 'income' && !formData.get('category')) {
      formData.set('category', 'Receita');
    }

    if (targetType === 'expense' && isInstallment) {
      const res = await createInstallmentPurchase(formData);
      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }
    } else {
      formData.set('type', targetType);
      const res = await createTransaction(formData);
      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }
    }
    
    setLoading(false);
    resetState();
  }

  // Tentar adivinhar a forma de pagamento recomendada para a IA
  const getSuggestedPaymentMethod = () => {
    if (!aiParsedData) return '';
    const suggestion = aiParsedData.paymentMethodSuggestion?.toLowerCase() || '';

    if (suggestion) {
      const matchedCard = creditCards.find(c => c.name.toLowerCase().includes(suggestion));
      if (matchedCard) return `card_${matchedCard.id}`;

      const matchedAccount = accounts.find(a => a.name.toLowerCase().includes(suggestion));
      if (matchedAccount) return `account_${matchedAccount.id}`;
    }

    if (aiParsedData.type === 'income' && accounts.length > 0) {
      return `account_${accounts[0].id}`;
    }

    if (aiParsedData.isInstallment && creditCards.length > 0) {
      return `card_${creditCards[0].id}`;
    }

    if (accounts.length > 0) return `account_${accounts[0].id}`;
    if (creditCards.length > 0) return `card_${creditCards[0].id}`;

    return '';
  };

  return (
    <>
      {/* Desktop Header Buttons */}
      <div className="hidden md:flex items-center gap-3">
        <button 
          onClick={() => { setType('ai'); setAiStep(1); setIsOpen(true); }} 
          className="bg-brand hover:bg-brand-light text-black flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border border-brand/20 cursor-pointer shadow-sm"
        >
          <Sparkles size={18} />
          <span>Adicionar com IA</span>
        </button>

        <button 
          onClick={() => { setType('income'); setIsOpen(true); }} 
          className="glass-panel flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <Plus size={18} className="text-emerald-400" />
          <span>Nova Receita</span>
        </button>

        <button 
          onClick={() => { setType('expense'); setIsOpen(true); }} 
          className="glass-panel flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <Receipt size={18} className="text-rose-400" />
          <span>Nova Despesa</span>
        </button>
      </div>

      {/* Mobile Floating Action Bar (Scroll/Touch-Aware) */}
      <div
        className={`fixed bottom-4 left-4 right-4 z-40 md:hidden transition-all duration-300 transform ${
          isMobileBarVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-neutral-950/90 backdrop-blur-xl border border-neutral-800/90 rounded-2xl p-2 shadow-2xl flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setType('ai');
              setAiStep(1);
              setIsOpen(true);
            }}
            className="flex-1 bg-brand hover:bg-brand-light text-black flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand/10 cursor-pointer"
          >
            <Sparkles size={16} />
            <span>IA ✨</span>
          </button>

          <button
            onClick={() => {
              setType('income');
              setIsOpen(true);
            }}
            className="flex-1 bg-neutral-900/80 border border-emerald-500/20 text-emerald-400 hover:bg-neutral-850 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Receita</span>
          </button>

          <button
            onClick={() => {
              setType('expense');
              setIsOpen(true);
            }}
            className="flex-1 bg-neutral-900/80 border border-rose-500/20 text-rose-400 hover:bg-neutral-850 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Receipt size={16} />
            <span>Despesa</span>
          </button>
        </div>
      </div>

      {/* Main Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={resetState} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20}/>
            </button>

            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              {type === 'income' ? 'Adicionar Receita' : type === 'expense' ? 'Adicionar Despesa' : (
                <>
                  <span>Inteligência Artificial</span>
                  <Sparkles size={18} className="text-brand" />
                </>
              )}
            </h2>
            
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm mb-4">
                {errorMsg}
              </div>
            )}

            {/* AI MODAL: STEP 1 (Input Text Prompt) */}
            {type === 'ai' && aiStep === 1 && (
              <form onSubmit={handleParseAI} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Digite o que você gastou ou ganhou:</label>
                  <textarea 
                    required 
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    rows={4} 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-brand transition-colors resize-none text-sm" 
                    placeholder="Ex: Gastei 45 reais no Ifood no cartão de crédito..." 
                  />
                </div>
                <button 
                  disabled={loading || !aiText.trim()} 
                  type="submit" 
                  className="w-full bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl mt-2 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Analisando com IA...' : (
                    <>
                      <Sparkles size={18} />
                      <span>Analisar com IA</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* AI MODAL: STEP 2 (Review Extracted Data & Select Account/Card) */}
            {type === 'ai' && aiStep === 2 && aiParsedData && (
              <form onSubmit={handleAdd} className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-1">
                  <button 
                    type="button" 
                    onClick={() => setAiStep(1)} 
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Editar texto</span>
                  </button>
                  <span className="text-[10px] uppercase tracking-wider text-brand font-bold bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md">
                    Passo 2 de 2: Confirmar Conta
                  </span>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Descrição</label>
                  <input 
                    required 
                    name="description" 
                    defaultValue={aiParsedData.description} 
                    type="text" 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm" 
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Data da Transação</label>
                  <input 
                    required 
                    name="createdAt" 
                    type="date" 
                    defaultValue={new Date().toISOString().split('T')[0]} 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm" 
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Valor (R$)</label>
                  <input 
                    required 
                    name="amount" 
                    defaultValue={aiParsedData.amount} 
                    type="number" 
                    step="0.01" 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm" 
                  />
                </div>

                {aiParsedData.type !== 'income' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-slate-300">Categoria</label>
                      <Link href="/categories" className="text-xs text-brand hover:underline" onClick={resetState}>Criar nova</Link>
                    </div>
                    <select 
                      required 
                      name="category" 
                      defaultValue={aiParsedData.category}
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm"
                    >
                      <option value={aiParsedData.category}>{aiParsedData.category}</option>
                      {categories.filter(c => c.name !== aiParsedData.category).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Forma de Pagamento / Seleção de Conta Manual (O MAIS IMPORTANTE) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm text-slate-300 font-medium">
                      Forma de Pagamento / Conta
                    </label>
                    <div className="flex gap-2">
                      <Link href="/accounts" className="text-xs text-brand hover:underline" onClick={resetState}>Contas</Link>
                      <span className="text-xs text-slate-500">•</span>
                      <Link href="/cards" className="text-xs text-brand hover:underline" onClick={resetState}>Cartões</Link>
                    </div>
                  </div>
                  <select 
                    required 
                    name="paymentMethod" 
                    defaultValue={getSuggestedPaymentMethod()} 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm"
                  >
                    <option value="" disabled>Selecione a conta ou cartão</option>
                    {accounts.length > 0 && (
                      <optgroup label="Contas / Carteiras (Débito/Pix)" className="bg-slate-950 text-slate-300">
                        {accounts.map(a => (
                          <option key={a.id} value={`account_${a.id}`}>{a.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {creditCards.length > 0 && (
                      <optgroup label="Cartões de Crédito" className="bg-slate-950 text-slate-300">
                        {creditCards.map(c => (
                          <option key={c.id} value={`card_${c.id}`}>{c.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Se for parcelado */}
                {aiParsedData.isInstallment && (
                  <div className="grid grid-cols-2 gap-4 bg-slate-900/30 p-3 rounded-xl border border-slate-800">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Qtd. Parcelas</label>
                      <input 
                        required 
                        min="2" 
                        max="360" 
                        name="installmentsCount" 
                        type="number" 
                        defaultValue={aiParsedData.installmentsCount || 2} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none text-xs" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Parcela Atual</label>
                      <input 
                        required 
                        min="1" 
                        max="360" 
                        name="currentInstallment" 
                        type="number" 
                        defaultValue={aiParsedData.currentInstallment || 1} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none text-xs" 
                      />
                    </div>
                  </div>
                )}

                <button 
                  disabled={loading} 
                  type="submit" 
                  className="w-full bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl mt-2 cursor-pointer disabled:opacity-50 text-sm"
                >
                  {loading ? 'Salvando Transação...' : 'Confirmar e Salvar Transação'}
                </button>
              </form>
            )}

            {/* DIRECT MANUAL FORM (INCOME / EXPENSE) */}
            {type !== 'ai' && (
              <form onSubmit={handleAdd} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Descrição</label>
                  <input required name="description" type="text" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder={isInstallment ? "Ex: iPhone 15" : "Ex: Salário"} />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Data da Transação / Compra</label>
                  <input required name="createdAt" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm" />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    {isInstallment ? "Valor da Parcela (R$)" : "Valor (R$)"}
                  </label>
                  <input required name="amount" type="number" step="0.01" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors" placeholder="0.00" />
                </div>
                
                {type === 'expense' && (
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
                )}

                {type === 'expense' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-slate-300 font-medium">Forma de Pagamento (Pix, Débito ou Crédito)</label>
                      <div className="flex gap-2">
                        <Link href="/accounts" className="text-xs text-brand hover:underline" onClick={resetState}>Contas</Link>
                        <span className="text-xs text-slate-500">•</span>
                        <Link href="/cards" className="text-xs text-brand hover:underline" onClick={resetState}>Cartões</Link>
                      </div>
                    </div>
                    <select required name="paymentMethod" defaultValue="" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors">
                      <option value="" disabled>Selecione onde foi gasto</option>
                      {accounts.length > 0 && (
                        <optgroup label="Contas / Carteiras (Débito/Pix)" className="bg-slate-950 text-slate-300">
                          {accounts.map(a => (
                            <option key={a.id} value={`account_${a.id}`}>{a.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {creditCards.length > 0 && (
                        <optgroup label="Cartões de Crédito" className="bg-slate-950 text-slate-300">
                          {creditCards.map(c => (
                            <option key={c.id} value={`card_${c.id}`}>{c.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}

                {type === 'income' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-slate-300 font-medium">Conta de Recebimento</label>
                      <Link href="/accounts" className="text-xs text-brand hover:underline" onClick={resetState}>Gerenciar</Link>
                    </div>
                    <select required name="paymentMethod" defaultValue="" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors">
                      <option value="" disabled>Selecione a conta de destino</option>
                      {accounts.map(a => (
                        <option key={a.id} value={`account_${a.id}`}>{a.name}</option>
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

                <button disabled={loading} type="submit" className="w-full bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl mt-4 cursor-pointer disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar Transação'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
