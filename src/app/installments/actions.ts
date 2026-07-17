'use server';

import { db } from '@/db';
import { installments, transactions, creditCards } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { calculateCreditCardDate } from '@/app/actions';
import { updateInstallmentSchema } from '@/lib/validations';

export async function deleteInstallment(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

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
  if (!session) return { error: 'Não autorizado' };

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = updateInstallmentSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { description, category, amount, installmentsCount, paidCount, creditCardId, createdAt } = validation.data;

  const accountId = formData.get('accountId') as string | null;

  if (paidCount > installmentsCount) {
    return { error: 'A quantidade de parcelas pagas não pode ser maior que o total de parcelas.' };
  }

  const totalAmount = amount * installmentsCount;

  // Atualizar o registro mestre de installments
  await db.update(installments).set({
    description,
    category,
    totalAmount: totalAmount.toString(),
    installmentsCount: installmentsCount.toString(),
    creditCardId: creditCardId || null,
    createdAt: createdAt,
  }).where(
    and(
      eq(installments.id, id),
      eq(installments.userId, session.user.id)
    )
  );

  // Apagar as transações anteriores vinculadas a esse installmentId
  await db.delete(transactions).where(
    and(
      eq(transactions.installmentId, id),
      eq(transactions.userId, session.user.id)
    )
  );

  let cardClosingDay = 0;
  let cardDueDay = 0;

  if (creditCardId) {
    const cardRes = await db.select().from(creditCards).where(eq(creditCards.id, creditCardId));
    if (cardRes.length > 0) {
      cardClosingDay = Number(cardRes[0].closingDay);
      cardDueDay = Number(cardRes[0].dueDay);
    }
  }

  // Recriar as transações futuras baseadas na parcela atual
  const txValues = [];
  const now = new Date(createdAt);
  now.setMonth(now.getMonth() - paidCount);
  const currentInstallment = paidCount + 1;

  let firstTxDate = new Date(now);
  if (cardClosingDay > 0 && cardDueDay > 0) {
    firstTxDate = await calculateCreditCardDate(now, cardClosingDay, cardDueDay);
  }

  for (let i = currentInstallment; i <= installmentsCount; i++) {
    const createdAtDate = new Date(now);
    createdAtDate.setMonth(now.getMonth() + (i - 1));

    const dueDateDate = new Date(firstTxDate);
    dueDateDate.setMonth(firstTxDate.getMonth() + (i - 1));

    txValues.push({
      userId: session.user.id,
      amount: amount.toString(),
      description: `${description} (${i}/${installmentsCount})`,
      category: category,
      type: 'expense' as const,
      installmentId: id,
      creditCardId: creditCardId || null,
      accountId: accountId || null,
      createdAt: createdAtDate,
      dueDate: dueDateDate,
    });
  }

  if (txValues.length > 0) {
    await db.insert(transactions).values(txValues);
  }

  revalidatePath('/installments');
  revalidatePath('/');
  return { success: true };
}
