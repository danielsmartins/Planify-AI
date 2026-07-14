import { db } from '@/db';
import { creditCards, transactions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { payCreditCardInvoice } from '@/app/cards/actions';

export async function processAutoPayments(userId: string) {
  try {
    // 1. Busca cartões do usuário com débito automático ativado
    const cards = await db.select()
      .from(creditCards)
      .where(and(
        eq(creditCards.userId, userId),
        eq(creditCards.autoPay, true)
      ));

    if (cards.length === 0) return;

    const now = new Date();

    for (const card of cards) {
      if (!card.autoPayAccountId) continue;

      const dueDayNum = parseInt(card.dueDay);
      if (isNaN(dueDayNum)) continue;

      // Vamos verificar os meses a partir da data de criação do cartão até o mês atual
      const cardCreatedAt = new Date(card.createdAt);
      const startYear = cardCreatedAt.getFullYear();
      const startMonth = cardCreatedAt.getMonth();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      for (let y = startYear; y <= currentYear; y++) {
        const mStart = (y === startYear) ? startMonth : 0;
        const mEnd = (y === currentYear) ? currentMonth : 11;

        for (let m = mStart; m <= mEnd; m++) {
          // Data de vencimento correspondente para este mês e ano
          // Ajustamos para o final do dia
          const dueDate = new Date(y, m, dueDayNum, 23, 59, 59, 999);

          // Se a data de vencimento ainda está no futuro, não fazemos o pagamento automático
          if (dueDate > now) continue;

          // Verifica se já existe um pagamento de fatura cadastrado para este cartão neste mês de vencimento
          const startOfInvoiceMonth = new Date(y, m, 1);
          const endOfInvoiceMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);

          const existingPayments = await db.select()
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.creditCardId, card.id),
              sql`account_id IS NOT NULL`,
              eq(transactions.category, 'Pagamento de Fatura'),
              sql`created_at >= ${startOfInvoiceMonth}`,
              sql`created_at <= ${endOfInvoiceMonth}`
            ));

          if (existingPayments.length > 0) {
            // Fatura já foi paga!
            continue;
          }

          // Caso não esteja paga, calcula as despesas vinculadas a este cartão naquele mês de fechamento/faturamento
          // Note: compras de cartão têm accountId = null
          const invoicePurchases = await db.select()
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.creditCardId, card.id),
              sql`account_id IS NULL`,
              eq(transactions.status, 'confirmed'),
              sql`created_at >= ${startOfInvoiceMonth}`,
              sql`created_at <= ${endOfInvoiceMonth}`
            ));

          const totalPurchases = invoicePurchases.reduce((sum, t) => sum + parseFloat(t.amount), 0);

          if (totalPurchases > 0) {
            console.log(`[AUTO-PAY] Liquidando fatura do cartão "${card.name}" de ${dueDate.toLocaleDateString()} no valor de R$ ${totalPurchases}`);
            
            // Realiza o pagamento da fatura utilizando a action existente
            await payCreditCardInvoice(
              card.id,
              card.autoPayAccountId,
              totalPurchases,
              dueDate.toISOString().split('T')[0]
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('[AUTO-PAY] Erro ao processar pagamentos automáticos:', error);
  }
}
