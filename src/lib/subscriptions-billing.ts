import { db } from '@/db';
import { subscriptions, transactions, accounts } from '@/db/schema';
import { eq, and, lte } from 'drizzle-orm';

export async function processPendingSubscriptions(userId: string) {
  try {
    const now = new Date();
    
    // 1. Buscar assinaturas ativas do usuário que já venceram
    const pendingSubs = await db.select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        lte(subscriptions.nextBillingDate, now)
      ));

    if (pendingSubs.length === 0) return;

    for (const sub of pendingSubs) {
      const txDate = new Date(sub.nextBillingDate);

      // 2. Se for débito em conta (sem cartão de crédito), deduz do saldo da conta
      if (!sub.creditCardId && sub.accountId) {
        const accRes = await db.select().from(accounts).where(eq(accounts.id, sub.accountId));
        if (accRes.length > 0) {
          const acc = accRes[0];
          const newBalance = parseFloat(acc.balance) - parseFloat(sub.amount);
          await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, acc.id));
        }
      }

      // 3. Inserir a transação real (com a data do vencimento da assinatura)
      await db.insert(transactions).values({
        userId: sub.userId,
        amount: sub.amount,
        description: sub.name,
        category: sub.category,
        type: 'expense',
        creditCardId: sub.creditCardId,
        accountId: sub.accountId,
        createdAt: txDate,
        status: 'confirmed'
      });

      // 4. Calcular a próxima data de cobrança (mensal ou anual)
      const nextDate = new Date(sub.nextBillingDate);
      if (sub.billingCycle === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // 5. Atualizar a assinatura com a próxima data de vencimento
      await db.update(subscriptions)
        .set({ nextBillingDate: nextDate })
        .where(eq(subscriptions.id, sub.id));
    }
  } catch (error) {
    console.error('[SUBSCRIPTIONS] Erro ao processar assinaturas pendentes:', error);
  }
}
