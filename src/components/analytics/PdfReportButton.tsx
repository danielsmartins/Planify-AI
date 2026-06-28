'use client';

import { useState } from 'react';
import { Download, Sparkles, X, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function PdfReportButton() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [showModal, setShowModal] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-report');
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setShowModal(true);
      } else {
        alert(data.error || 'Erro ao gerar relatório');
      }
    } catch {
      alert('Erro na conexão com a IA.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <button 
        onClick={generateReport}
        disabled={loading}
        className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all border border-slate-700/50 disabled:opacity-50 print:hidden"
      >
        {loading ? (
          <Sparkles size={16} className="text-brand animate-pulse" />
        ) : (
          <Download size={16} className="text-brand" />
        )}
        <span className="hidden sm:inline">
          {loading ? 'Analisando com IA...' : 'Gerar Relatório Inteligente (PDF)'}
        </span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:bg-white print:fixed print:inset-0 print:p-0">
          <div className="glass-panel p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200 print:bg-white print:text-black print:shadow-none print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible">
            
            <div className="flex justify-between items-start mb-6 print:hidden">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="text-brand" size={24} />
                Relatório Planify AI
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="p-2 bg-brand/20 text-brand hover:bg-brand/30 rounded-lg transition-colors">
                  <Printer size={20} />
                </button>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Cabeçalho exclusivo para impressão */}
            <div className="hidden print:block mb-8 border-b pb-4">
              <h1 className="text-3xl font-bold text-black mb-1">Planify AI - Relatório Mensal</h1>
              <p className="text-gray-500 text-sm">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="prose prose-invert max-w-none print:prose-p:text-black print:prose-headings:text-black print:prose-strong:text-black">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>

            {/* Rodapé para impressão */}
            <div className="hidden print:block mt-12 pt-4 border-t text-center text-sm text-gray-500">
              Gerado por Planify AI - Inteligência Financeira
            </div>
          </div>
        </div>
      )}
    </>
  );
}
