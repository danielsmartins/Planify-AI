'use client';
import { useActionState } from 'react';
import { login } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(async (prevState: { error: string }, formData: FormData) => {
    const res = await login(formData);
    if (res?.error) return { error: res.error };
    if (res?.success) window.location.href = '/';
    return prevState;
  }, { error: '' });

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative overflow-hidden">
        <h2 className="text-3xl font-bold mb-2">Bem-vindo de volta</h2>
        <p className="text-slate-400 mb-8">Acesse o Planify AI para gerenciar suas finanças.</p>
        
        {state.error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm mb-6">
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email ou Telefone</label>
            <input 
              type="text" 
              name="identifier" 
              placeholder="ex: seu@email.com ou 11999999999"
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
            className="w-full bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl mt-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Não tem uma conta? <Link href="/register" className="text-white font-semibold hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
