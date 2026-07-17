'use server';

import { db } from '@/db';
import { creditCards, transactions, installments, accounts } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { creditCardSchema } from '@/lib/validations';

export async function addCreditCard(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = creditCardSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { name, color, closingDay, dueDay, limitAmount, brand, autoPay, autoPayAccountId } = validation.data;

  await db.insert(creditCards).values({
    userId: session.user.id,
    name,
    color,
    closingDay: closingDay.toString(),
    dueDay: dueDay.toString(),
    limitAmount: limitAmount.toString(),
    brand,
    autoPay,
    autoPayAccountId,
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
  if (!session) return { error: 'Não autorizado' };

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = creditCardSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { name, color, closingDay, dueDay, limitAmount, brand, autoPay, autoPayAccountId } = validation.data;

  await db.update(creditCards).set({
    name,
    color,
    closingDay: closingDay.toString(),
    dueDay: dueDay.toString(),
    limitAmount: limitAmount.toString(),
    brand,
    autoPay,
    autoPayAccountId,
  }).where(
    and(
      eq(creditCards.id, id),
      eq(creditCards.userId, session.user.id)
    )
  );

  revalidatePath('/cards');
  return { success: true };
}

export async function payCreditCardInvoice(cardId: string, accountId: string, amount: number, dateStr: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const parsedAmount = parseFloat(amount.toString());
  const txDate = new Date(dateStr);

  // Descontar do saldo da conta
  const accRes = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, session.user.id)));
  if (accRes.length === 0) throw new Error('Account not found');
  const acc = accRes[0];
  const currentBalance = parseFloat(acc.balance);
  const newBalance = currentBalance - parsedAmount;
  await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, acc.id));

  // Buscar nome do cartão para a descrição
  const cardRes = await db.select().from(creditCards).where(and(eq(creditCards.id, cardId), eq(creditCards.userId, session.user.id)));
  const cardName = cardRes.length > 0 ? cardRes[0].name : 'Cartão';

  // Inserir transação de pagamento de fatura
  await db.insert(transactions).values({
    userId: session.user.id,
    amount: parsedAmount.toString(),
    description: `Pagamento de Fatura - ${cardName}`,
    category: 'Pagamento de Fatura',
    type: 'expense',
    creditCardId: cardId,
    accountId: accountId,
    createdAt: txDate
  });

  revalidatePath('/cards');
  revalidatePath('/');
  return { success: true };
}
