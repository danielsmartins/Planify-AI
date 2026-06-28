'use client';

import { useState, useTransition } from 'react';
import { deleteCreditCard, updateCreditCard, addCreditCard } from '@/app/cards/actions';
import { CreditCard, Trash2, Edit2, Plus, Calendar, X, Upload, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CardProps {
  id: string;
  name: string;
  color: string;
  closingDay: string;
  dueDay: string;
  limitAmount: string | null;
  brand: string;
}

export function CardClient({ cards }: { cards: CardProps[] }) {
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCard, setEditingCard] = useState<CardProps | null>(null);

  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#8b5cf6');
  const [formBrand, setFormBrand] = useState('mastercard');

  // Import Invoice State
  const [isImporting, setIsImporting] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  
  const router = useRouter();

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
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Adicionar Cartão</span>
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
          cards.map((card) => (
            <div key={card.id} className="relative group overflow-hidden rounded-2xl aspect-[1.6/1] p-6 flex flex-col justify-between shadow-xl" style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 100%)` }}>
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
                    onClick={() => {
                      setEditingCard(card);
                      setFormName(card.name);
                      setFormColor(card.color);
                      setFormBrand(card.brand || 'mastercard');
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-md"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(card.id)}
                    className="p-2 bg-rose-500/80 hover:bg-rose-500 text-white rounded-lg transition-colors backdrop-blur-md"
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

              <div className="relative z-10 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/60 uppercase tracking-wider">Fechamento</span>
                      <span className="text-white font-medium text-sm flex items-center gap-1"><Calendar size={12}/> Dia {card.closingDay}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/60 uppercase tracking-wider">Vencimento</span>
                      <span className="text-white font-medium text-sm flex items-center gap-1"><Calendar size={12}/> Dia {card.dueDay}</span>
                    </div>
                  </div>
                  {Number(card.limitAmount) > 0 && (
                    <div className="mt-2">
                       <span className="text-[10px] text-white/60 uppercase tracking-wider">Limite</span>
                       <p className="text-white font-semibold">{formatBRL(card.limitAmount!)}</p>
                    </div>
                  )}
                </div>
                
                {/* Brand Logo Text */}
                <div className="text-white/70 font-bold italic tracking-wider text-xl uppercase opacity-80" style={{ fontFamily: 'sans-serif' }}>
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
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Adicionar / Editar */}
      {(isAdding || editingCard) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => { setIsAdding(false); setEditingCard(null); setFormName(''); setFormColor('#8b5cf6'); setFormBrand('mastercard'); }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
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

              <button 
                type="submit"
                disabled={isPending}
                className="w-full mt-4 bg-brand hover:bg-brand-dark text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
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
                className="w-full mt-2 bg-gradient-to-r from-purple-500 to-brand hover:from-purple-600 hover:to-brand-dark text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
              >
                {importLoading ? 'A IA está lendo o PDF...' : 'Extrair Transações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
