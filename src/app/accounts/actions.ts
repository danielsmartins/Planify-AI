'use server';

import { db } from '@/db';
import { accounts } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { accountSchema } from '@/lib/validations';

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
}

export async function updateAccount(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = accountSchema.partial().safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const validatedData = validation.data;

  const dataToUpdate: Record<string, string> = {};
  if (validatedData.name) dataToUpdate.name = validatedData.name;
  if (validatedData.color) dataToUpdate.color = validatedData.color;
  if (validatedData.type) dataToUpdate.type = validatedData.type;
  if (validatedData.balance !== undefined) dataToUpdate.balance = validatedData.balance.toString();

  await db.update(accounts)
    .set(dataToUpdate)
    .where(and(eq(accounts.id, id), eq(accounts.userId, session.user.id)));

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
}

export async function deleteAccount(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  // Note: Transactions linked to this account might need handling.
  // In a real SaaS, we might block deletion if transactions exist, or set accountId to null.
  await db.delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, session.user.id)));

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
}
