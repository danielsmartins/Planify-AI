'use client';
import { useActionState } from 'react';
import { register } from '@/lib/auth';
import Link from 'next/link';

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(async (prevState: { error: string }, formData: FormData) => {
    const res = await register(formData);
    if (res?.error) return { error: res.error };
    if (res?.success) window.location.href = '/login';
    return prevState;
  }, { error: '' });

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative overflow-hidden">
        <h2 className="text-3xl font-bold mb-2">Crie sua conta</h2>
        <p className="text-slate-400 mb-8">Junte-se ao Planify AI.</p>
        
        {state.error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm mb-6">
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
            <input 
              type="text" 
              name="name" 
              placeholder="Como quer ser chamado"
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand transition-colors"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input 
              type="email" 
              name="email" 
              placeholder="seu@email.com"
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand transition-colors"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Telefone (Opcional)</label>
            <input 
              type="text" 
              name="phone" 
              placeholder="(xx) xxxxx-xxxx"
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Idade (Opcional)</label>
              <input 
                type="number" 
                name="age" 
                placeholder="Sua idade"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Faixa de Renda</label>
              <select 
                name="incomeRange" 
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-brand transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-slate-950 text-slate-400">Não informado</option>
                <option value="Até R$ 2.000" className="bg-slate-950">Até R$ 2.000</option>
                <option value="R$ 2.000 a R$ 5.000" className="bg-slate-950">R$ 2.000 a R$ 5.000</option>
                <option value="R$ 5.000 a R$ 10.000" className="bg-slate-950">R$ 5.000 a R$ 10.000</option>
                <option value="Mais de R$ 10.000" className="bg-slate-950">Mais de R$ 10.000</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Objetivo Financeiro</label>
            <select 
              name="financialGoal" 
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-brand transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-slate-950 text-slate-400">Não informado</option>
              <option value="Economizar Dinheiro" className="bg-slate-950">Economizar Dinheiro</option>
              <option value="Sair das Dívidas" className="bg-slate-950">Sair das Dívidas</option>
              <option value="Começar a Investir" className="bg-slate-950">Começar a Investir</option>
              <option value="Organizar Gastos Mensais" className="bg-slate-950">Organizar Gastos Mensais</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
            <input 
              type="password" 
              name="password" 
              placeholder="Sua senha secreta"
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand transition-colors"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={pending}
            className="w-full bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl mt-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {pending ? 'Cadastrando...' : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Já tem conta? <Link href="/login" className="text-white font-semibold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
