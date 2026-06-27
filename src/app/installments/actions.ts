'use server';

import { db } from '@/db';
import { installments, transactions } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';

export async function deleteInstallment(id: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  // Primeiro deleta todas as transações vinculadas a este installment que ainda estao pendentes/confirmadas
  await db.delete(transactions).where(
    and(
      eq(transactions.installmentId, id),
      eq(transactions.userId, session.user.id)
    )
  );

  // Depois deleta o installment master
  await db.delete(installments).where(
    and(
      eq(installments.id, id),
      eq(installments.userId, session.user.id)
    )
  );

  revalidatePath('/installments');
  revalidatePath('/');
  return { success: true };
}

export async function updateInstallment(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const description = formData.get('description') as string;
  const category = formData.get('category') as string;

  if (!description || !category) {
    throw new Error('Invalid data');
  }

  // Update only description and category for simplicity right now
  await db.update(installments).set({
    description,
    category
  }).where(
    and(
      eq(installments.id, id),
      eq(installments.userId, session.user.id)
    )
  );

  // Sync description and category on linked transactions
  await db.execute(sql`
    UPDATE transactions 
    SET description = regexp_replace(description, '^.* (\\(\\d+/\\d+\\))$', ${description} || ' \\1'),
        category = ${category}
    WHERE installment_id = ${id} AND user_id = ${session.user.id}
  `);

  revalidatePath('/installments');
  revalidatePath('/');
  return { success: true };
}
