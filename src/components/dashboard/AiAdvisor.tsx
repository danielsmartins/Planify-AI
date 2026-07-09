'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Bot } from 'lucide-react';

export function AiAdvisor() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsight = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/ai-insights', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar insight');
      
      setInsight(data.insight);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-brand/10 blur-3xl rounded-full transition-all group-hover:bg-brand/20"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-brand/10 text-brand rounded-lg">
            <Bot size={20} />
          </div>
          <h3 className="text-lg font-bold">Consultor IA</h3>
        </div>

        {insight ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 p-4 rounded-xl border border-brand/10">
              &quot;{insight}&quot;
            </p>
            <button 
              onClick={generateInsight}
              disabled={loading}
              className="mt-4 text-xs font-medium text-brand hover:text-brand-light flex items-center gap-1 transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Gerar novo insight
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-400 mb-5">
              Receba um conselho financeiro personalizado baseado nos seus gastos recentes.
            </p>
            <button
              onClick={generateInsight}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-light text-black py-2.5 px-4 rounded-xl font-semibold transition-all border border-brand/20 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analisando dados...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Analisar minhas finanças
                </>
              )}
            </button>
            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
