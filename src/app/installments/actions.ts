'use server';

import { db } from '@/db';
import { installments, transactions, creditCards } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { calculateCreditCardDate } from '@/app/actions';

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
  const installmentAmount = parseFloat(formData.get('amount') as string);
  const installmentsCount = parseInt(formData.get('installmentsCount') as string);
  const paidCount = parseInt(formData.get('paidCount') as string);
  const creditCardId = formData.get('creditCardId') as string | null;
  const accountId = formData.get('accountId') as string | null;

  if (!description || !category || isNaN(installmentAmount) || isNaN(installmentsCount) || isNaN(paidCount)) {
    throw new Error('Preencha todos os campos corretamente.');
  }

  if (paidCount > installmentsCount) {
    throw new Error('A quantidade de parcelas pagas não pode ser maior que o total de parcelas.');
  }

  const totalAmount = installmentAmount * installmentsCount;

  // Atualizar o registro mestre de installments
  await db.update(installments).set({
    description,
    category,
    totalAmount: totalAmount.toString(),
    installmentsCount: installmentsCount.toString(),
    creditCardId: creditCardId || null,
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
  const now = new Date();
  const currentInstallment = paidCount + 1;

  let firstTxDate = new Date(now);
  if (cardClosingDay > 0 && cardDueDay > 0) {
    firstTxDate = await calculateCreditCardDate(now, cardClosingDay, cardDueDay);
  }

  for (let i = currentInstallment; i <= installmentsCount; i++) {
    const createdAtDate = new Date(now);
    createdAtDate.setMonth(now.getMonth() + (i - currentInstallment));

    const dueDateDate = new Date(firstTxDate);
    dueDateDate.setMonth(firstTxDate.getMonth() + (i - currentInstallment));

    txValues.push({
      userId: session.user.id,
      amount: installmentAmount.toString(),
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
