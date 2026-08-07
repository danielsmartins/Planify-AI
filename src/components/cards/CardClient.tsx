'use client';

import { useState, useTransition } from 'react';
import { deleteCreditCard, updateCreditCard, addCreditCard, payCreditCardInvoice } from '@/app/cards/actions';
import { deleteTransaction } from '@/app/actions';
import { CreditCard, Trash2, Edit2, Plus, Calendar, X, Upload, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getInvoiceDueDateForDate, getInvoiceKey, formatInvoiceMonthYear, getTxDueDate } from '@/lib/credit-card-helpers';



interface CardProps {
  id: string;
  name: string;
  color: string;
  closingDay: string;
  dueDay: string;
  limitAmount: string | null;
  brand: string;
  invoiceAmount?: string;
  autoPay?: boolean;
  autoPayAccountId?: string | null;
}

interface AccountProps {
  id: string;
  name: string;
}

interface CardTransactionProps {
  id: string;
  amount: string;
  description: string;
  category: string;
  type: string;
  creditCardId: string | null;
  accountId: string | null;
  createdAt: string;
  dueDate?: string | null;
}

export function CardClient({ 
  cards, 
  accounts = [], 
  transactions = [] 
}: { 
  cards: CardProps[], 
  accounts?: AccountProps[], 
  transactions?: CardTransactionProps[] 
}) {
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCard, setEditingCard] = useState<CardProps | null>(null);

  // Card Details Modal State
  const [viewingCardDetails, setViewingCardDetails] = useState<CardProps | null>(null);
  const [selectedInvoiceKey, setSelectedInvoiceKey] = useState<string>('');

  const openCardDetails = (card: CardProps) => {
    const now = new Date();
    const cardTxs = transactions.filter(t => t.creditCardId === card.id);
    const defaultDueDate = getInvoiceDueDateForDate(now, Number(card.closingDay), Number(card.dueDay));
    const defaultKey = getInvoiceKey(defaultDueDate);

    const invMap = new Map<string, { purchases: number; payments: number }>();
    cardTxs.forEach(t => {
      const key = getInvoiceKey(getTxDueDate(t, Number(card.closingDay), Number(card.dueDay)));
      if (!invMap.has(key)) invMap.set(key, { purchases: 0, payments: 0 });
      const item = invMap.get(key)!;
      const val = parseFloat(t.amount);
      if (t.accountId) item.payments += val;
      else item.purchases += val;
    });


    let keyToSelect = defaultKey;
    const sortedKeys = Array.from(invMap.keys()).sort();
    for (const k of sortedKeys) {
      const inv = invMap.get(k)!;
      if (inv.purchases - inv.payments > 0.01 && k <= defaultKey) {
        keyToSelect = k;
        break;
      }
    }

    setSelectedInvoiceKey(keyToSelect);
    setViewingCardDetails(card);
  };


  // Pay Invoice State
  const [payingCard, setPayingCard] = useState<CardProps | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payTargetDueDate, setPayTargetDueDate] = useState<string | undefined>(undefined);

  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#10b981');
  const [formBrand, setFormBrand] = useState('mastercard');
  const [autoPayChecked, setAutoPayChecked] = useState(false);
  const [autoPayAccountId, setAutoPayAccountId] = useState('');

  // Import Invoice State
  const [isImporting, setIsImporting] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  
  const router = useRouter();

  const handlePayInvoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payingCard || !payAccountId || !payAmount) return;

    startTransition(() => {
      payCreditCardInvoice(
        payingCard.id, 
        payAccountId, 
        parseFloat(payAmount), 
        payDate,
        payTargetDueDate
      ).then(() => {
        setPayingCard(null);
        setPayAmount('');
        setPayAccountId('');
        setPayTargetDueDate(undefined);
        router.refresh();
      });
    });
  };

  const CARD_TEMPLATES = [
    { name: 'Nubank', color: '#8A05BE', brand: 'mastercard' },
    { name: 'Itaú', color: '#EC7000', brand: 'mastercard' },
    { name: 'Inter', color: '#FF7A00', brand: 'mastercard' },
    { name: 'C6 Bank', color: '#242424', brand: 'mastercard' },
    { name: 'Santander', color: '#CC0000', brand: 'visa' },
    { name: 'Bradesco', color: '#CC092F', brand: 'visa' },
    { name: 'Banco do Brasil', color: '#F8D117', brand: 'visa' },
    { name: 'Caixa', color: '#005CA9', brand: 'elo' },
  ];

  const handleTemplateClick = (template: typeof CARD_TEMPLATES[0]) => {
    setFormName(template.name);
    setFormColor(template.color);
    setFormBrand(template.brand);
  };

  const formatBRL = (val: string | number) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      addCreditCard(formData).then(() => {
        setIsAdding(false);
      });
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCard) return;
    
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      updateCreditCard(editingCard.id, formData).then(() => {
        setEditingCard(null);
      });
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir este cartão irá desvincular todas as transações e parcelamentos associados a ele. Continuar?')) {
      startTransition(() => {
        deleteCreditCard(id);
      });
    }
  };

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setImportLoading(true);
    setImportMessage('');
    setImportError('');
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch('/api/import-invoice', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        setImportError(data.error || 'Erro ao importar fatura.');
      } else {
        setImportMessage(data.message);
        router.refresh();
      }
    } catch {
      setImportError('Erro na conexão. Tente novamente.');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <p className="text-slate-400">Gerencie seus cartões de crédito para calcular vencimentos automaticamente.</p>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsImporting(true)}
            className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all border border-slate-700/50"
          >
            <Sparkles size={16} className="text-brand" />
            <span className="hidden sm:inline">Importar Fatura PDF</span>
          </button>
          
          <button 
            onClick={() => { setIsAdding(true); setAutoPayChecked(false); setAutoPayAccountId(''); setFormName(''); setFormColor('#10b981'); setFormBrand('mastercard'); }}
            className="flex items-center gap-2 bg-brand hover:bg-brand-light text-black font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md select-none text-sm shrink-0"
          >
            <Plus size={16} />
            Novo Cartão
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.length === 0 ? (
          <div className="col-span-full glass-panel p-12 text-center rounded-2xl">
            <CreditCard size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-400 mb-2">Nenhum cartão cadastrado.</p>
            <p className="text-sm text-slate-500">Cadastre seus cartões para lançar despesas diretamente neles.</p>
          </div>
        ) : (
          cards.map((card) => {
            const now = new Date();
            const closingDate = new Date(now.getFullYear(), now.getMonth() + 1, parseInt(card.closingDay));
            const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, parseInt(card.dueDay));
            const formatDayMonth = (d: Date) => {
              const day = d.getDate().toString().padStart(2, '0');
              const month = (d.getMonth() + 1).toString().padStart(2, '0');
              return `${day}/${month}`;
            };
            const closingFormatted = formatDayMonth(closingDate);
            const dueFormatted = formatDayMonth(dueDate);

            return (
              <div 
                key={card.id} 
                onClick={() => openCardDetails(card)}
                className="relative group overflow-hidden rounded-2xl aspect-[1.6/1] p-6 flex flex-col justify-between shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300" 
                style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 100%)` }}
              >
                {/* Efeito de Vidro por cima da cor para ficar premium */}
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-all group-hover:bg-black/30 z-0"></div>
                
                {/* Círculos decorativos estilo Mastercard / Layout de Cartão */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/20 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <CreditCard className="text-white/80" />
                    <span className="font-bold text-white tracking-wide">{card.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCard(card);
                        setFormName(card.name);
                        setFormColor(card.color);
                        setFormBrand(card.brand || 'mastercard');
                        setAutoPayChecked(card.autoPay || false);
                        setAutoPayAccountId(card.autoPayAccountId || '');
                      }}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-md cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(card.id);
                      }}
                      className="p-2 bg-rose-500/80 hover:bg-rose-500 text-white rounded-lg transition-colors backdrop-blur-md cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="relative z-10 mt-auto mb-4">
                   {/* Estilo de chip metálico simulado e número oculto */}
                   <div className="flex justify-between items-center opacity-70">
                      <div className="w-10 h-7 rounded bg-gradient-to-br from-slate-200 to-slate-400 border border-slate-100/50 opacity-90 shadow-sm"></div>
                      <div className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                      </div>
                   </div>
                </div>

                <div className="relative z-10 flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Fechamento</span>
                        <span className="text-white font-semibold text-sm flex items-center gap-1"><Calendar size={12}/> {closingFormatted}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Vencimento</span>
                        <span className="text-white font-semibold text-sm flex items-center gap-1"><Calendar size={12}/> {dueFormatted}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-end gap-4 mt-2">
                    {card.invoiceAmount && parseFloat(card.invoiceAmount) > 0 && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Fatura Atual</span>
                        <p className="text-white font-extrabold text-base leading-tight">{formatBRL(card.invoiceAmount)}</p>
                      </div>
                    )}
                    {Number(card.limitAmount) > 0 && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Limite</span>
                        <p className="text-white/90 font-semibold text-xs leading-tight">{formatBRL(card.limitAmount!)}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {card.autoPay && (
                     <div className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">
                        Auto-Pay
                     </div>
                  )}

                  {/* Brand Logo Text */}
                  <div className="text-white/80 font-bold italic tracking-wider text-xl uppercase opacity-90" style={{ fontFamily: 'sans-serif' }}>
                    {card.brand === 'mastercard' && (
                      <div className="flex">
                        <div className="w-6 h-6 rounded-full bg-white/40 -mr-2"></div>
                        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md"></div>
                      </div>
                    )}
                    {card.brand === 'visa' && <span>VISA</span>}
                    {card.brand === 'elo' && <span>elo</span>}
                    {card.brand === 'amex' && <span className="text-sm border border-white/50 px-1 rounded-sm">AMEX</span>}
                  </div>

                  {card.invoiceAmount && parseFloat(card.invoiceAmount) > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const defaultDueDate = getInvoiceDueDateForDate(now, Number(card.closingDay), Number(card.dueDay));
                        setPayingCard(card);
                        setPayAmount(card.invoiceAmount!);
                        setPayTargetDueDate(defaultDueDate.toISOString());
                        if (accounts.length > 0) setPayAccountId(accounts[0].id);
                      }}
                      className="bg-white hover:bg-white/90 text-black px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md select-none z-10"
                    >
                      Pagar Fatura
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }))
      }
      </div>

      {/* Modal Adicionar / Editar */}
      {(isAdding || editingCard) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => { setIsAdding(false); setEditingCard(null); setFormName(''); setFormColor('#10b981'); setFormBrand('mastercard'); setAutoPayChecked(false); setAutoPayAccountId(''); }} 
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20}/>
            </button>
            <h2 className="text-xl font-bold mb-6">{isAdding ? 'Adicionar Cartão' : 'Editar Cartão'}</h2>

            <form onSubmit={isAdding ? handleAdd : handleEdit} className="flex flex-col gap-4">
              {/* Templates */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Templates Rápidos</label>
                <div className="flex flex-wrap gap-2">
                  {CARD_TEMPLATES.map(t => (
                    <button 
                      type="button" 
                      key={t.name}
                      onClick={() => handleTemplateClick(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-transform hover:scale-105 active:scale-95"
                      style={{ backgroundColor: t.color, textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-[1fr,auto] gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nome do Cartão</label>
                  <input 
                    type="text" 
                    name="name" 
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Cor</label>
                  <input 
                    type="color" 
                    name="color" 
                    required
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-14 h-10 bg-slate-900/50 border border-slate-700/50 rounded-xl px-1 py-1 cursor-pointer focus:border-brand focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Bandeira do Cartão</label>
                <select 
                  name="brand" 
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                >
                  <option value="mastercard">Mastercard</option>
                  <option value="visa">Visa</option>
                  <option value="elo">Elo</option>
                  <option value="amex">American Express</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Dia de Fechamento</label>
                  <input 
                    type="number" 
                    name="closingDay"
                    min="1" max="31" 
                    required
                    defaultValue={editingCard?.closingDay || ''}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Dia de Vencimento</label>
                  <input 
                    type="number" 
                    name="dueDay" 
                    min="1" max="31"
                    required
                    defaultValue={editingCard?.dueDay || ''}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Limite (Opcional)</label>
                <input 
                  type="number" 
                  name="limitAmount" 
                  step="0.01"
                  defaultValue={editingCard?.limitAmount || ''}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  name="autoPay"
                  id="autoPay"
                  checked={autoPayChecked}
                  onChange={(e) => setAutoPayChecked(e.target.checked)}
                  className="rounded border-slate-700/50 bg-slate-900/50 text-brand focus:ring-brand focus:ring-offset-slate-900 cursor-pointer"
                />
                <label htmlFor="autoPay" className="text-sm text-slate-300 cursor-pointer select-none">
                  Pagar fatura automaticamente no vencimento
                </label>
              </div>

              {autoPayChecked && (
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Debitar da Conta / Carteira</label>
                  <select 
                    name="autoPayAccountId"
                    value={autoPayAccountId}
                    onChange={(e) => setAutoPayAccountId(e.target.value)}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                  >
                    <option value="">Selecione uma conta...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                type="submit"
                disabled={isPending}
                className="w-full mt-4 bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Salvando...' : 'Salvar Cartão'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Fatura */}
      {isImporting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => { setIsImporting(false); setImportMessage(''); setImportError(''); }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20}/>
            </button>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="text-brand" size={24} />
              Leitura Inteligente
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Faça upload do PDF da sua fatura e nossa Inteligência Artificial vai extrair e categorizar todas as suas compras automaticamente.
            </p>

            {importMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg text-sm mb-4">
                {importMessage}
              </div>
            )}

            {importError && (
              <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm mb-4">
                {importError}
              </div>
            )}

            <form onSubmit={handleImport} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Qual é o cartão?</label>
                <select name="creditCardId" required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors">
                  <option value="">Selecione o cartão...</option>
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Arquivo da Fatura (PDF)</label>
                <div className="relative">
                  <input type="file" name="file" accept="application/pdf" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="w-full bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-brand/50 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-slate-400 transition-colors">
                    <Upload size={24} />
                    <span className="text-sm font-medium">Clique ou arraste o PDF aqui</span>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={importLoading || cards.length === 0}
                className="w-full mt-2 bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl transition-all border border-brand/20 disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2"
              >
                {importLoading ? 'A IA está lendo o PDF...' : 'Extrair Transações'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pagamento de Fatura */}
      {payingCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => { setPayingCard(null); setPayAmount(''); setPayAccountId(''); setPayTargetDueDate(undefined); }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20}/>
            </button>
            <h2 className="text-xl font-bold mb-2">Pagar Fatura</h2>
            <p className="text-xs text-slate-400 mb-6">Pague a fatura do cartão {payingCard.name} com o saldo de uma conta bancária.</p>

            <form onSubmit={handlePayInvoice} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Valor do Pagamento (R$)</label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm" 
                  placeholder="0.00" 
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Conta de Origem (Pix/Débito)</label>
                <select 
                  required
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm"
                >
                  <option value="" disabled>Selecione a conta pagadora...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Data do Pagamento</label>
                <input 
                  required
                  type="date" 
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand transition-colors text-sm" 
                />
              </div>

              <button 
                type="submit" 
                disabled={isPending || accounts.length === 0}
                className="w-full bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl mt-4 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Cartão com Navegação de Faturas */}
      {viewingCardDetails && (() => {
        const now = new Date();
        const cardTxs = transactions.filter(t => t.creditCardId === viewingCardDetails.id);

        const closingDayNum = Number(viewingCardDetails.closingDay);
        const dueDayNum = Number(viewingCardDetails.dueDay);

        // Gerar lista de chaves de faturas para o seletor (transações + range de 6 meses atrás até 6 meses à frente)
        const invoiceKeysSet = new Set<string>();
        cardTxs.forEach(t => {
          const txDueDate = getTxDueDate(t, closingDayNum, dueDayNum);
          invoiceKeysSet.add(getInvoiceKey(txDueDate));
        });

        // Garantir range de meses ao redor da data atual
        for (let i = -6; i <= 6; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
          invoiceKeysSet.add(getInvoiceKey(d));
        }

        const allInvoiceKeys = Array.from(invoiceKeysSet).sort();
        const activeKey = selectedInvoiceKey || getInvoiceKey(getInvoiceDueDateForDate(now, closingDayNum, dueDayNum));
        const currentKeyIndex = allInvoiceKeys.indexOf(activeKey);

        const prevInvoiceKey = currentKeyIndex > 0 ? allInvoiceKeys[currentKeyIndex - 1] : null;
        const nextInvoiceKey = currentKeyIndex >= 0 && currentKeyIndex < allInvoiceKeys.length - 1 ? allInvoiceKeys[currentKeyIndex + 1] : null;

        // Dados da fatura selecionada
        const [selectedYearStr, selectedMonthStr] = activeKey.split('-');
        const selectedYear = parseInt(selectedYearStr);
        const selectedMonth = parseInt(selectedMonthStr) - 1; // 0-indexed

        const daysInDueMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const actualDueDay = Math.min(dueDayNum, daysInDueMonth);
        const invoiceDueDate = new Date(selectedYear, selectedMonth, actualDueDay, 12, 0, 0, 0);

        let closingMonth = selectedMonth;
        let closingYear = selectedYear;
        if (dueDayNum <= closingDayNum) {
          closingMonth -= 1;
          if (closingMonth < 0) {
            closingMonth = 11;
            closingYear -= 1;
          }
        }
        const daysInClosingMonth = new Date(closingYear, closingMonth + 1, 0).getDate();
        const actualClosingDay = Math.min(closingDayNum, daysInClosingMonth);
        const invoiceClosingDate = new Date(closingYear, closingMonth, actualClosingDay, 12, 0, 0, 0);

        const formatDayMonth = (d: Date) => {
          const day = d.getDate().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          return `${day}/${month}`;
        };

        const dueFormatted = formatDayMonth(invoiceDueDate);
        const closingFormatted = formatDayMonth(invoiceClosingDate);

        // Transações da fatura selecionada
        const selectedInvoiceTxs = cardTxs.filter(t => {
          const txDueDate = getTxDueDate(t, closingDayNum, dueDayNum);
          const k = getInvoiceKey(txDueDate);
          return k === activeKey;
        });


        const purchases = selectedInvoiceTxs.filter(t => !t.accountId).reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const payments = selectedInvoiceTxs.filter(t => t.accountId).reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const netBalance = purchases - payments;
        const outstandingBalance = netBalance > 0 ? netBalance : 0;

        // Status da fatura
        let statusBadge = { label: 'EM ABERTO', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
        if (outstandingBalance <= 0.01 && purchases > 0) {
          statusBadge = { label: 'PAGA', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
        } else if (outstandingBalance <= 0.01 && purchases === 0) {
          statusBadge = { label: 'SEM LANÇAMENTOS', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
        } else if (invoiceDueDate < now) {
          statusBadge = { label: 'VENCIDA', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
        } else if (invoiceClosingDate <= now) {
          statusBadge = { label: 'FECHADA / A VENCER', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
        }

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0b0c10] border border-slate-800 p-6 rounded-2xl w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
              <button 
                onClick={() => setViewingCardDetails(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer z-10"
              >
                <X size={20}/>
              </button>
              
              <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: viewingCardDetails.color }}></div>
                  <h2 className="text-2xl font-bold text-white">{viewingCardDetails.name}</h2>
                </div>
                <p className="text-sm text-slate-400">Detalhamento dos lançamentos e faturas deste cartão.</p>
              </div>

              {/* Navegação entre Faturas por Mês */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 mb-6 flex items-center justify-between gap-3 shrink-0">
                <button
                  disabled={!prevInvoiceKey}
                  onClick={() => prevInvoiceKey && setSelectedInvoiceKey(prevInvoiceKey)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Fatura Anterior"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex flex-col items-center flex-1">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <select
                      value={activeKey}
                      onChange={(e) => setSelectedInvoiceKey(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white text-sm font-bold rounded-lg px-3 py-1.5 focus:border-brand outline-none cursor-pointer"
                    >
                      {allInvoiceKeys.map(k => (
                        <option key={k} value={k}>
                          Fatura de {formatInvoiceMonthYear(k)}
                        </option>
                      ))}
                    </select>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1">
                    Fechamento: {closingFormatted} • Vencimento: {dueFormatted}
                  </span>
                </div>

                <button
                  disabled={!nextInvoiceKey}
                  onClick={() => nextInvoiceKey && setSelectedInvoiceKey(nextInvoiceKey)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Próxima Fatura"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="overflow-y-auto pr-1 flex-1 space-y-6">
                {/* Resumo da Fatura Selecionada */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">
                      Fatura de {formatInvoiceMonthYear(activeKey)}
                    </span>
                    <p className="text-3xl font-extrabold text-white mt-1">
                      {formatBRL(outstandingBalance)}
                    </p>
                    <div className="flex gap-3 text-xs text-slate-400 mt-1.5">
                      <span>Total de compras: <strong className="text-slate-200">{formatBRL(purchases)}</strong></span>
                      {payments > 0 && <span>Pagos: <strong className="text-emerald-400">{formatBRL(payments)}</strong></span>}
                    </div>
                    {viewingCardDetails.autoPay && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold mt-2 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 border-dashed">
                        Débito Automático Ativado ({accounts.find(a => a.id === viewingCardDetails.autoPayAccountId)?.name || 'Conta'})
                      </span>
                    )}
                  </div>
                  {outstandingBalance > 0 && (
                    <button
                      onClick={() => {
                        setPayingCard(viewingCardDetails);
                        setPayAmount(outstandingBalance.toString());
                        setPayDate(new Date().toISOString().split('T')[0]);
                        setPayTargetDueDate(invoiceDueDate.toISOString());
                        if (accounts.length > 0) setPayAccountId(accounts[0].id);
                        setViewingCardDetails(null);
                      }}
                      className="bg-white hover:bg-white/90 text-black px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md select-none shrink-0"
                    >
                      Pagar Fatura
                    </button>
                  )}
                </div>

                {/* Compras / Lançamentos na Fatura Selecionada */}
                <div>
                  <h3 className="text-base font-bold text-slate-200 mb-3 flex items-center justify-between">
                    <span>Lançamentos nesta Fatura</span>
                    <span className="text-xs text-slate-500 font-normal">{selectedInvoiceTxs.length} item(ns)</span>
                  </h3>
                  {selectedInvoiceTxs.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center italic border border-dashed border-slate-800/60 rounded-xl bg-slate-900/10">
                      Nenhum lançamento nesta fatura.
                    </p>
                  ) : (
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/10 divide-y divide-slate-800">
                      {selectedInvoiceTxs.map(t => {
                        return (
                          <div key={t.id} className="p-3.5 flex justify-between items-center text-sm group/item">
                            <div>
                              <p className="font-semibold text-slate-200">
                                {t.description}
                                <span className="text-[10px] text-slate-400 font-normal ml-2">
                                  ({new Date(t.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })})
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {t.category} {t.accountId ? '• Pagamento efetuado' : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`font-bold text-sm ${t.accountId ? 'text-emerald-400' : 'text-slate-100'}`}>
                                {t.accountId ? '+' : '-'}{formatBRL(t.amount)}
                              </span>
                              <button
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja excluir a transação "${t.description}"?`)) {
                                    startTransition(() => {
                                      deleteTransaction(t.id).then(() => {
                                        router.refresh();
                                        setViewingCardDetails(null);
                                      });
                                    });
                                  }
                                }}
                                disabled={isPending}
                                className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all opacity-0 group-hover/item:opacity-100 focus:opacity-100 cursor-pointer disabled:opacity-50"
                                title="Excluir Transação"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
