'use server';

import { db } from '@/db';
import { subscriptions } from '@/db/schema';
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
