'use server';

import { db } from '@/db';
import { accounts, transactions } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { accountSchema, updateAccountSchema } from '@/lib/validations';

export async function addAccount(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = accountSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { name, color, type, balance } = validation.data;

  await db.insert(accounts).values({
    userId: session.user.id,
    name,
    color,
    type,
    balance: balance.toString(),
  });

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateAccount(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = updateAccountSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const validatedData = validation.data;

  // Verificar se a conta existe e pertence ao usuário autenticado
  const accRes = await db.select().from(accounts).where(
    and(eq(accounts.id, id), eq(accounts.userId, session.user.id))
  );
  if (accRes.length === 0) {
    return { error: 'Conta não encontrada ou não autorizada.' };
  }
  const acc = accRes[0];

  const dataToUpdate: Record<string, string> = {};
  if (validatedData.name) dataToUpdate.name = validatedData.name;
  if (validatedData.color) dataToUpdate.color = validatedData.color;
  if (validatedData.type) dataToUpdate.type = validatedData.type;

  if (validatedData.balance !== undefined) {
    const oldBalance = parseFloat(acc.balance);
    const newBalance = validatedData.balance;
    const diff = newBalance - oldBalance;
    dataToUpdate.balance = newBalance.toString();

    // Se houve ajuste no saldo, registrar transação auditável de reconciliação
    if (Math.abs(diff) > 0.001) {
      await db.insert(transactions).values({
        userId: session.user.id,
        amount: Math.abs(diff).toString(),
        description: `Ajuste de Saldo - ${acc.name}`,
        category: 'Ajuste de Saldo',
        type: diff > 0 ? 'income' : 'expense',
        accountId: id,
        createdAt: new Date(),
      });
    }
  }

  await db.update(accounts)
    .set(dataToUpdate)
    .where(and(eq(accounts.id, id), eq(accounts.userId, session.user.id)));

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteAccount(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  await db.delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, session.user.id)));

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return { success: true };
}
