'use server';

import { db } from '@/db';
import { subscriptions, accounts, creditCards } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { subscriptionSchema } from '@/lib/validations';

export async function addSubscription(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = subscriptionSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { name, amount, category, billingCycle, nextBillingDate, accountId, creditCardId, color } = validation.data;

  // Validar se a conta informada pertence ao usuário autenticado
  if (accountId) {
    const accRes = await db.select().from(accounts).where(
      and(eq(accounts.id, accountId), eq(accounts.userId, session.user.id))
    );
    if (accRes.length === 0) {
      return { error: 'Conta selecionada não encontrada ou não autorizada.' };
    }
  }

  // Validar se o cartão de crédito informado pertence ao usuário autenticado
  if (creditCardId) {
    const cardRes = await db.select().from(creditCards).where(
      and(eq(creditCards.id, creditCardId), eq(creditCards.userId, session.user.id))
    );
    if (cardRes.length === 0) {
      return { error: 'Cartão de crédito selecionado não encontrado ou não autorizado.' };
    }
  }

  await db.insert(subscriptions).values({
    userId: session.user.id,
    name,
    amount: amount.toString(),
    category,
    billingCycle,
    nextBillingDate,
    accountId: accountId || null,
    creditCardId: creditCardId || null,
    color,
    status: 'active'
  });

  revalidatePath('/subscriptions');
  return { success: true };
}

export async function deleteSubscription(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  await db.delete(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, session.user.id)));

  revalidatePath('/subscriptions');
  return { success: true };
}

export async function toggleSubscriptionStatus(id: string, currentStatus: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const newStatus = currentStatus === 'active' ? 'canceled' : 'active';

  await db.update(subscriptions)
    .set({ status: newStatus })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, session.user.id)));

  revalidatePath('/subscriptions');
  return { success: true };
}
