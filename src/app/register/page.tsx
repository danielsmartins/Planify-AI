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
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-brand opacity-20 blur-3xl rounded-full" />
        
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Telefone (WhatsApp)</label>
            <input 
              type="text" 
              name="phone" 
              placeholder="11999999999"
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand transition-colors"
              required 
            />
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
            className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-3 rounded-xl mt-2 transition-all disabled:opacity-50"
          >
            {pending ? 'Cadastrando...' : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Já tem conta? <Link href="/login" className="text-brand-light hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
