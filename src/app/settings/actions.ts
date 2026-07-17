'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { profileSchema } from '@/lib/validations';

export async function updateProfile(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Não autorizado' };
  }

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = profileSchema.omit({ email: true }).safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { name, phone, age, incomeRange, financialGoal } = validation.data;

  try {
    await db
      .update(users)
      .set({
        name,
        phone,
        age,
        incomeRange,
        financialGoal,
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
