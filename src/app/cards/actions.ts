'use server';

import { db } from '@/db';
import { creditCards, transactions, installments } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';

export async function addCreditCard(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const closingDay = formData.get('closingDay') as string;
  const dueDay = formData.get('dueDay') as string;
  const limitAmount = formData.get('limitAmount') as string;

  if (!name || !color || !closingDay || !dueDay) throw new Error('Invalid data');

  await db.insert(creditCards).values({
    userId: session.user.id,
    name,
    color,
    closingDay,
    dueDay,
    limitAmount: limitAmount ? parseFloat(limitAmount).toString() : '0',
  });

  revalidatePath('/cards');
  return { success: true };
}

export async function deleteCreditCard(id: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  // Primeiro remove a referência do cartao nas transacoes e parcelamentos
  await db.update(transactions).set({ creditCardId: null }).where(
    and(
      eq(transactions.creditCardId, id),
      eq(transactions.userId, session.user.id)
    )
  );

  await db.update(installments).set({ creditCardId: null }).where(
    and(
      eq(installments.creditCardId, id),
      eq(installments.userId, session.user.id)
    )
  );

  await db.delete(creditCards).where(
    and(
      eq(creditCards.id, id),
      eq(creditCards.userId, session.user.id)
    )
  );

  revalidatePath('/cards');
  return { success: true };
}

export async function updateCreditCard(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const closingDay = formData.get('closingDay') as string;
  const dueDay = formData.get('dueDay') as string;
  const limitAmount = formData.get('limitAmount') as string;

  if (!name || !color || !closingDay || !dueDay) throw new Error('Invalid data');

  await db.update(creditCards).set({
    name,
    color,
    closingDay,
    dueDay,
    limitAmount: limitAmount ? parseFloat(limitAmount).toString() : '0',
  }).where(
    and(
      eq(creditCards.id, id),
      eq(creditCards.userId, session.user.id)
    )
  );

  // Idealmente as futuras transacoes de crédito atreladas teriam a data recalculada
  // Mas para simplificar, a atualização só afetará os próximos cadastros.
  
  revalidatePath('/cards');
  return { success: true };
}
