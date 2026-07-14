'use client';

import { useActionState } from 'react';
import { updateProfile } from './actions';

interface SettingsFormProps {
  user: {
    name: string;
    email: string;
    phone: string | null;
    age: number | null;
    incomeRange: string | null;
    financialGoal: string | null;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prevState: { error?: string; success?: boolean }, formData: FormData) => {
      const res = await updateProfile(formData);
      if (res?.error) {
        return { error: res.error, success: false };
      }
      return { success: true };
    },
    { success: false }
  );

  return (
    <div className="glass-panel w-full max-w-2xl p-8 rounded-2xl border border-neutral-800 bg-[#050505]">
      {state.success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-sm mb-6 transition-all duration-300">
          Perfil atualizado com sucesso!
        </div>
      )}

      {state.error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm mb-6 transition-all duration-300">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome Completo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Nome Completo</label>
            <input
              type="text"
              name="name"
              defaultValue={user.name}
              placeholder="Seu nome"
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors focus:ring-1 focus:ring-neutral-500 text-sm"
              required
            />
          </div>

          {/* Email (Leitura Apenas) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-500">Email (Não pode ser alterado)</label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full bg-[#0a0a0a]/40 border border-neutral-900 rounded-xl px-4 py-3 text-neutral-500 focus:outline-none cursor-not-allowed text-sm"
            />
          </div>

          {/* Telefone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Telefone</label>
            <input
              type="tel"
              name="phone"
              defaultValue={user.phone || ''}
              placeholder="ex: 11999999999"
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors focus:ring-1 focus:ring-neutral-500 text-sm"
            />
          </div>

          {/* Idade */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Idade</label>
            <input
              type="number"
              name="age"
              defaultValue={user.age ?? ''}
              placeholder="Sua idade"
              min="0"
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors focus:ring-1 focus:ring-neutral-500 text-sm"
            />
          </div>
        </div>

        {/* Faixa de Renda */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Faixa de Renda Mensal</label>
          <div className="relative">
            <select
              name="incomeRange"
              defaultValue={user.incomeRange || ''}
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 focus:outline-none focus:border-neutral-500 transition-colors text-sm appearance-none cursor-pointer"
            >
              <option value="" disabled className="text-neutral-600">Selecione sua faixa de renda</option>
              <option value="Até R$ 2.000">Até R$ 2.000</option>
              <option value="R$ 2.000 a R$ 5.000">R$ 2.000 a R$ 5.000</option>
              <option value="R$ 5.000 a R$ 10.000">R$ 5.000 a R$ 10.000</option>
              <option value="R$ 10.000 a R$ 20.000">R$ 10.000 a R$ 20.000</option>
              <option value="Acima de R$ 20.000">Acima de R$ 20.000</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Objetivo Financeiro */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Objetivo Financeiro</label>
          <textarea
            name="financialGoal"
            defaultValue={user.financialGoal || ''}
            placeholder="Qual a sua principal meta financeira hoje? (ex: comprar uma casa, investir para aposentadoria, juntar reserva de emergência)"
            className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors focus:ring-1 focus:ring-neutral-500 text-sm resize-none h-28"
          />
        </div>

        {/* Botão de Envio */}
        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black font-semibold px-8 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer text-sm"
          >
            {pending ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
