'use server';

import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function addSubscription(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const name = formData.get('name') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const category = formData.get('category') as string;
  const billingCycle = formData.get('billingCycle') as 'monthly' | 'yearly';
  const nextBillingDateStr = formData.get('nextBillingDate') as string;
  const accountId = formData.get('accountId') as string | null;
  const creditCardId = formData.get('creditCardId') as string | null;
  const color = formData.get('color') as string || '#8b5cf6';

  if (!name || isNaN(amount) || !category || !nextBillingDateStr) {
    return { error: 'Preencha todos os campos obrigatórios corretamente' };
  }

  // Se a data for inserida no fuso local do usuário, no servidor pode ter offset
  // Como é apenas uma data YYYY-MM-DD, vamos forçar T00:00:00 para evitar que vire o dia anterior no banco.
  const nextBillingDate = new Date(`${nextBillingDateStr}T12:00:00Z`);

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
}

export async function deleteSubscription(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  await db.delete(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, session.user.id)));

  revalidatePath('/subscriptions');
}

export async function toggleSubscriptionStatus(id: string, currentStatus: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const newStatus = currentStatus === 'active' ? 'canceled' : 'active';

  await db.update(subscriptions)
    .set({ status: newStatus })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, session.user.id)));

  revalidatePath('/subscriptions');
}
