'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, 
  CreditCard, 
  MessageSquare, 
  ShieldCheck, 
  Wallet, 
  Zap 
} from 'lucide-react';
import { GlowCard } from './GlowCard';
import { MiniCardsStack } from './MiniCardsStack';
import { RecentActivityTicker } from './RecentActivityTicker';

export function LandingPage() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; isVoice?: boolean; card?: { title: string; amount: string; category: string; type: string } | null }>>([
    { sender: 'bot', text: '👋 Olá! Sou o assistente do Planify AI. Clique em uma das opções rápidas abaixo para ver como eu funciono na prática!' }
  ]);
  const [typing, setTyping] = useState(false);

  const startScenario = (scenario: 'lunch' | 'salary' | 'installment') => {
    if (typing) return;
    setTyping(true);

    let userText = '';
    let isVoice = false;
    let botResponseText = '';
    let responseCard: { title: string; amount: string; category: string; type: string } | null = null;

    if (scenario === 'lunch') {
      userText = 'Mensagem de áudio 🎤';
      isVoice = true;
      botResponseText = '⏳ Escutando e analisando seu áudio...';
      responseCard = {
        title: 'Almoço Restaurante',
        amount: 'R$ 45,90',
        category: 'Alimentação',
        type: 'Despesa'
      };
    } else if (scenario === 'salary') {
      userText = 'Recebi 5000 do meu salário';
      botResponseText = '⏳ Analisando sua mensagem...';
      responseCard = {
        title: 'Salário',
        amount: 'R$ 5.000,00',
        category: 'Salário',
        type: 'Receita'
      };
    } else if (scenario === 'installment') {
      userText = 'Comprei uma geladeira de 3000 em 10 vezes no crédito';
      botResponseText = '⏳ Analisando sua compra...';
      responseCard = {
        title: 'Geladeira',
        amount: 'R$ 3.000,00 (10x R$ 300,00)',
        category: 'Eletrodomésticos',
        type: 'Despesa (Parcelada)'
      };
    }

    setMessages(prev => [...prev, { sender: 'user', text: userText, isVoice }]);

    setTimeout(() => {
      setMessages(prev => [...prev, { sender: 'bot', text: botResponseText }]);
      
      setTimeout(() => {
        setTyping(false);
        setMessages(prev => [...prev, { sender: 'bot', text: '', card: responseCard }]);
      }, 1200);
    }, 800);
  };

  const handleConfirm = (cardTitle: string, amount: string) => {
    setMessages(prev => [...prev, { sender: 'bot', text: `🎉 Transação "${cardTitle}" de ${amount} confirmada e salva no banco de dados!` }]);
  };
  return (
    <div className="min-h-screen bg-[#000000] text-[#ededed] font-sans selection:bg-neutral-800 selection:text-white pb-24 relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161618_1px,transparent_1px),linear-gradient(to_bottom,#161618_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-neutral-900 bg-[#000000]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image 
              src="/images/logo_icon_v2.png" 
              alt="Planify AI" 
              width={34} 
              height={34} 
              className="rounded-xl border border-neutral-800"
            />
            <span className="font-semibold text-lg tracking-tight text-white">Planify AI</span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Acessar
            </Link>
            <Link 
              href="/register" 
              className="bg-white hover:bg-neutral-200 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className={`inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-1.5 text-xs text-neutral-400 mb-8 backdrop-blur-sm transition-all duration-1000 transform ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Zap size={12} className="text-white" />
          <span>A evolução do controle financeiro inteligente</span>
        </div>

        <h1 className={`text-4xl sm:text-6xl font-semibold tracking-tight text-white mb-6 leading-[1.1] text-gradient transition-all duration-1000 delay-100 transform ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          Suas finanças simplificadas <br className="hidden sm:block" />
          por IA & Telegram
        </h1>

        <p className={`text-lg text-neutral-400 max-w-xl mx-auto mb-10 leading-relaxed transition-all duration-1000 delay-300 transform ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          Esqueça planilhas complexas. Mande áudios ou textos no Telegram, envie PDFs de faturas, e veja a inteligência artificial organizar tudo em um dashboard impecável.
        </p>

        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-1000 delay-500 transform ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Link 
            href="/register" 
            className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black font-semibold px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm group"
          >
            <span>Criar Conta Grátis</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold px-6 py-3.5 rounded-xl hover:bg-neutral-800 hover:text-white transition-colors text-sm flex items-center justify-center"
          >
            Acessar Plataforma
          </Link>
        </div>
      </section>

      {/* Real App Screenshot Mockup - outside hero section for wider display */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 -mt-2 mb-16 flex flex-col items-center">
        {/* Pulsating Glowing Background Orb */}
        <div className="absolute top-[40%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[600px] h-[300px] bg-gradient-to-tr from-violet-600/10 via-indigo-600/5 to-transparent rounded-full filter blur-[80px] pointer-events-none opacity-80 animate-pulse-slow" />
        
        <div 
          className={`relative rounded-2xl border border-neutral-800 bg-[#09090b]/50 p-2 overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.03)] mx-auto transition-all duration-[1200ms] ease-out transform hover:scale-[1.015] hover:shadow-[0_0_80px_rgba(255,255,255,0.06)] hover:border-neutral-700/80 cursor-pointer ${
            loaded ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/images/dashboard_mockup_pt.png" 
            alt="Planify AI Dashboard Mockup" 
            width={1200}
            height={675}
            className="w-full h-auto rounded-xl border border-neutral-900"
          />
        </div>

        {/* Infinite Activity Ticker under mockup */}
        <div className="w-full mt-12 relative z-20">
          <RecentActivityTicker />
        </div>
      </div>

      {/* Bento Grid Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Telegram com Simulador Interativo */}
          <GlowCard className="md:col-span-2">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 w-full h-full">
              <div className="flex-1 text-left flex flex-col justify-between h-full">
                <div>
                  <div className="bg-neutral-900 p-3 rounded-2xl border border-neutral-800 text-white w-fit mb-6 group-hover:border-[#0088cc]/30 group-hover:text-[#0088cc] transition-all duration-300">
                    <MessageSquare size={24} />
                  </div>
                  <span className="text-neutral-400 text-xs uppercase tracking-wider font-semibold block mb-2">Interface Proativa</span>
                  <h3 className="text-2xl font-semibold text-white mb-3">Conexão Real com Telegram</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                    Adicione despesas enviando uma mensagem rápida ou áudio no Telegram. Nossa IA transcreve, interpreta e categoriza a transação em tempo real no banco de dados.
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  <span className="text-xs text-neutral-500 font-semibold mb-1">Simule o envio de uma mensagem:</span>
                  <div className="flex flex-col gap-1.5">
                    <button 
                      onClick={() => startScenario('lunch')}
                      disabled={typing}
                      className="w-full text-left bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 text-neutral-300 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                    >
                      <span>🎤 Áudio: &quot;Gastei R$ 45,90 no almoço&quot;</span>
                      <ArrowRight size={14} className="text-neutral-600" />
                    </button>
                    <button 
                      onClick={() => startScenario('salary')}
                      disabled={typing}
                      className="w-full text-left bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 text-neutral-300 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                    >
                      <span>✍️ Texto: &quot;Recebi R$ 5.000 de salário&quot;</span>
                      <ArrowRight size={14} className="text-neutral-600" />
                    </button>
                    <button 
                      onClick={() => startScenario('installment')}
                      disabled={typing}
                      className="w-full text-left bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 text-neutral-300 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                    >
                      <span>💳 Texto: &quot;Comprei geladeira de 3000 em 10x&quot;</span>
                      <ArrowRight size={14} className="text-neutral-600" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-80 flex-shrink-0 relative rounded-3xl border border-neutral-800 p-4 bg-[#050507] shadow-2xl flex flex-col h-[340px] justify-between">
                {/* Top bar bot */}
                <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-900">
                  <div className="w-7 h-7 rounded-full bg-[#0088cc] flex items-center justify-center text-xs font-bold text-white">P</div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Planify AI Bot</h4>
                    <span className="text-[9px] text-emerald-400 font-medium block">online</span>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 py-3 pr-1 text-xs select-none scrollbar-none scroll-smooth">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                      {msg.text && (
                        <div className={`p-2.5 rounded-2xl leading-relaxed ${msg.sender === 'user' ? 'bg-[#0088cc] text-white rounded-tr-none' : 'bg-neutral-900 text-neutral-300 rounded-tl-none border border-neutral-800'}`}>
                          {msg.text}
                        </div>
                      )}
                      {msg.card && (() => {
                        const card = msg.card;
                        return (
                          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-3 w-full flex flex-col gap-2 shadow-lg animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                              <span className="text-[10px] uppercase font-bold text-neutral-500">Revisão de Transação</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${card.type.includes('Receita') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{card.type}</span>
                            </div>
                            <div className="text-xs flex flex-col gap-1 text-neutral-400">
                              <div><strong className="text-white">Descrição:</strong> {card.title}</div>
                              <div><strong className="text-white">Valor:</strong> {card.amount}</div>
                              <div><strong className="text-white">Categoria:</strong> {card.category}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <button onClick={() => handleConfirm(card.title, card.amount)} className="bg-white hover:bg-neutral-200 text-black text-[10px] font-bold py-1 px-2 rounded-lg transition-colors cursor-pointer text-center">Confirmar</button>
                              <button onClick={() => setMessages(prev => [...prev, { sender: 'bot', text: '❌ Operação cancelada.' }])} className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-[10px] font-semibold py-1 px-2 rounded-lg transition-colors cursor-pointer text-center">Cancelar</button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                  {typing && (
                    <div className="self-start bg-neutral-900 text-neutral-500 p-2.5 rounded-2xl rounded-tl-none border border-neutral-800 flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Card 2: Segurança */}
          <GlowCard className="flex flex-col justify-between text-left">
            <div className="bg-neutral-900 p-3 rounded-2xl border border-neutral-800 text-white w-fit mb-6 group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-all duration-300">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-neutral-400 text-xs uppercase tracking-wider font-semibold block mb-2">Privacidade</span>
              <h3 className="text-xl font-semibold text-white mb-3">Seguro & Criptografado</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Suas informações protegidas com criptografia moderna e segurança de ponta a ponta. Seus dados financeiros pertencem apenas a você.
              </p>
            </div>
          </GlowCard>

          {/* Card 3: Contas */}
          <GlowCard className="flex flex-col justify-between text-left">
            <div className="flex flex-col justify-between h-full">
              <div className="bg-neutral-900 p-3 rounded-2xl border border-neutral-800 text-white w-fit mb-4 group-hover:border-amber-500/30 group-hover:text-amber-400 transition-all duration-300">
                <Wallet size={24} />
              </div>
              
              <MiniCardsStack />
              
              <div className="mt-2">
                <span className="text-neutral-400 text-xs uppercase tracking-wider font-semibold block mb-2">Multicarteiras</span>
                <h3 className="text-xl font-semibold text-white mb-3">Múltiplas Contas</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Gerencie saldos de dinheiro em espécie, Nubank, Itaú e outros bancos em um único lugar unificado e minimalista.
                </p>
              </div>
            </div>
          </GlowCard>

          {/* Card 4: Faturas */}
          <GlowCard className="md:col-span-2 flex flex-col justify-between text-left">
            <div className="bg-neutral-900 p-3 rounded-2xl border border-neutral-800 text-white w-fit mb-6 group-hover:border-violet-500/30 group-hover:text-violet-400 transition-all duration-300">
              <CreditCard size={24} />
            </div>
            <div>
              <span className="text-neutral-400 text-xs uppercase tracking-wider font-semibold block mb-2">Extração Inteligente</span>
              <h3 className="text-2xl font-semibold text-white mb-3">Importação de Faturas por IA</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Suba o PDF da fatura do seu cartão de crédito. Nossa IA processa o documento, separa cada compra realizada e gera os lançamentos automaticamente para você sem preenchimento manual.
              </p>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-neutral-900">
        <h2 className="text-3xl font-semibold text-white text-center mb-16">
          Controle simplificado em 3 passos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
          {/* Step 1 */}
          <div>
            <div className="text-sm font-semibold font-mono text-white mb-4">01</div>
            <h4 className="text-lg font-semibold text-white mb-2">Crie sua conta</h4>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Cadastre-se na plataforma em menos de um minuto. Nenhuma informação de cartão é necessária para começar.
            </p>
          </div>

          {/* Step 2 */}
          <div>
            <div className="text-sm font-semibold font-mono text-white mb-4">02</div>
            <h4 className="text-lg font-semibold text-white mb-2">Sincronize o Telegram</h4>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Conecte com nosso bot em poucos cliques. Ele passará a registrar despesas e alertar sobre orçamentos proativamente.
            </p>
          </div>

          {/* Step 3 */}
          <div>
            <div className="text-sm font-semibold font-mono text-white mb-4">03</div>
            <h4 className="text-lg font-semibold text-white mb-2">Veja os insights da IA</h4>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Acesse o dashboard minimalista para acompanhar gastos, faturas, gráficos e receber recomendações financeiras de IA.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="bg-[#09090b]/40 border border-neutral-900 rounded-3xl p-12 md:p-16">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4">
            Pronto para dominar suas finanças?
          </h2>
          <p className="text-neutral-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Junte-se à evolução financeira inteligente. Comece grátis agora mesmo e conecte seu Telegram.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center gap-2 bg-white hover:bg-neutral-200 text-black font-semibold px-6 py-3.5 rounded-xl transition-all text-sm group"
          >
            <span>Iniciar agora</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
