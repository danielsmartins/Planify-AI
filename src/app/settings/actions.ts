'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Não autorizado' };
  }

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const ageStr = formData.get('age') as string;
  const incomeRange = formData.get('incomeRange') as string;
  const financialGoal = formData.get('financialGoal') as string;

  if (!name || name.trim() === '') {
    return { error: 'O nome não pode ser vazio' };
  }

  let age: number | null = null;
  if (ageStr) {
    age = parseInt(ageStr, 10);
    if (isNaN(age) || age <= 0) {
      return { error: 'A idade deve ser um número inteiro válido' };
    }
  }

  try {
    await db
      .update(users)
      .set({
        name,
        phone: phone ? phone.trim() : null,
        age,
        incomeRange: incomeRange || null,
        financialGoal: financialGoal || null,
      })
      .where(eq(users.id, session.user.id));

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err.code === '23505' || err.message?.includes('users_phone_unique')) {
      return { error: 'O telefone informado já está cadastrado por outro usuário' };
    }
    return { error: 'Erro ao atualizar perfil. Tente novamente mais tarde' };
  }
}
