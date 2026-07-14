import { db } from '@/db';
import { subscriptions, transactions, creditCards, accounts } from '@/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { calculateCreditCardDate } from '@/app/actions';

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
      const createdAtDate = new Date(sub.nextBillingDate);
      let dueDateDate = new Date(sub.nextBillingDate);

      // 2. Se for cartão de crédito, calcula a data de vencimento da fatura correspondente
      if (sub.creditCardId) {
        const cardRes = await db.select().from(creditCards).where(eq(creditCards.id, sub.creditCardId));
        if (cardRes.length > 0) {
          const card = cardRes[0];
          dueDateDate = await calculateCreditCardDate(dueDateDate, Number(card.closingDay), Number(card.dueDay));
        }
      } else if (sub.accountId) {
        // Se for débito em conta, deduz do saldo da conta
        const accRes = await db.select().from(accounts).where(eq(accounts.id, sub.accountId));
        if (accRes.length > 0) {
          const acc = accRes[0];
          const newBalance = parseFloat(acc.balance) - parseFloat(sub.amount);
          await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, acc.id));
        }
      }

      // 3. Inserir a transação real (com a data de ocorrência e vencimento correspondentes)
      await db.insert(transactions).values({
        userId: sub.userId,
        amount: sub.amount,
        description: sub.name,
        category: sub.category,
        type: 'expense',
        creditCardId: sub.creditCardId,
        accountId: sub.accountId,
        createdAt: createdAtDate,
        dueDate: dueDateDate,
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
