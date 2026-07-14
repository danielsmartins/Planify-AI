'use server';

import { db } from '@/db';
import { creditCards, transactions, installments, accounts } from '@/db/schema';
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
  const brand = formData.get('brand') as string;
  const autoPay = formData.get('autoPay') === 'on';
  const autoPayAccountId = formData.get('autoPayAccountId') as string || null;

  if (!name || !color || !closingDay || !dueDay || !brand) throw new Error('Invalid data');

  await db.insert(creditCards).values({
    userId: session.user.id,
    name,
    color,
    closingDay,
    dueDay,
    limitAmount: limitAmount ? parseFloat(limitAmount).toString() : '0',
    brand,
    autoPay,
    autoPayAccountId: autoPayAccountId || null,
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
  const brand = formData.get('brand') as string;
  const autoPay = formData.get('autoPay') === 'on';
  const autoPayAccountId = formData.get('autoPayAccountId') as string || null;

  if (!name || !color || !closingDay || !dueDay || !brand) throw new Error('Invalid data');

  await db.update(creditCards).set({
    name,
    color,
    closingDay,
    dueDay,
    limitAmount: limitAmount ? parseFloat(limitAmount).toString() : '0',
    brand,
    autoPay,
    autoPayAccountId: autoPayAccountId || null,
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
