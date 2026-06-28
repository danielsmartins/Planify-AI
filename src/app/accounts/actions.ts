'use server';

import { db } from '@/db';
import { accounts } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function addAccount(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const type = formData.get('type') as 'checking' | 'savings' | 'investment' | 'cash';
  const balance = formData.get('balance') as string || '0';

  if (!name || !color || !type) {
    return { error: 'Preencha os campos obrigatórios' };
  }

  await db.insert(accounts).values({
    userId: session.user.id,
    name,
    color,
    type,
    balance: parseFloat(balance).toString(),
  });

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
}

export async function updateAccount(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const type = formData.get('type') as 'checking' | 'savings' | 'investment' | 'cash';
  const balance = formData.get('balance') as string;

  const dataToUpdate: Record<string, string> = {};
  if (name) dataToUpdate.name = name;
  if (color) dataToUpdate.color = color;
  if (type) dataToUpdate.type = type;
  if (balance) dataToUpdate.balance = parseFloat(balance).toString();

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
