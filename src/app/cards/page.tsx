import { db } from '@/db';
import { creditCards, accounts, transactions } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, sql } from 'drizzle-orm';
import { CardClient } from '@/components/cards/CardClient';
import { processAutoPayments } from '@/lib/auto-pay';
import { processPendingSubscriptions } from '@/lib/subscriptions-billing';

import { getInvoiceDueDateForDate, getInvoiceKey } from '@/lib/credit-card-helpers';


export async function CardsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Processa faturas com pagamento automático vencidas e faturamento de assinaturas
  await processPendingSubscriptions(session.user.id);
  await processAutoPayments(session.user.id);

  const now = new Date();

  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));
  const cardTransactions = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      eq(transactions.status, 'confirmed'),
      sql`credit_card_id IS NOT NULL`
    ));

  // Calcular valor devedor de cada cartão do mês atual/pendente (compras - pagamentos de fatura)
  const cardsWithBalances = userCards.map(card => {
    const cardTxs = cardTransactions.filter(t => t.creditCardId === card.id);
    const defaultDueDate = getInvoiceDueDateForDate(now, Number(card.closingDay), Number(card.dueDay));
    const defaultKey = getInvoiceKey(defaultDueDate);
    
    // Mapear saldo por chave de fatura YYYY-MM
    const invoicesMap = new Map<string, { purchases: number; payments: number }>();
    cardTxs.forEach(t => {
      const key = getInvoiceKey(new Date(t.dueDate || t.createdAt));
      if (!invoicesMap.has(key)) {
        invoicesMap.set(key, { purchases: 0, payments: 0 });
      }
      const item = invoicesMap.get(key)!;
      const amt = parseFloat(t.amount);
      if (t.accountId) {
        item.payments += amt;
      } else {
        item.purchases += amt;
      }
    });

    // Encontrar a fatura mais antiga não paga (anterior ou igual à fatura padrão)
    let selectedKey = defaultKey;
    const sortedKeys = Array.from(invoicesMap.keys()).sort();
    for (const key of sortedKeys) {
      const inv = invoicesMap.get(key)!;
      const net = inv.purchases - inv.payments;
      if (net > 0.01 && key <= defaultKey) {
        selectedKey = key;
        break;
      }
    }

    const targetInv = invoicesMap.get(selectedKey) || { purchases: 0, payments: 0 };
    const outstanding = targetInv.purchases - targetInv.payments;
    
    return {
      id: card.id,
      name: card.name,
      color: card.color,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      limitAmount: card.limitAmount,
      brand: card.brand,
      invoiceAmount: (outstanding > 0 ? outstanding : 0).toString(),
      activeInvoiceKey: selectedKey,
      autoPay: card.autoPay,
      autoPayAccountId: card.autoPayAccountId
    };
  });


  const serializedTxs = cardTransactions.map(t => ({
    id: t.id,
    amount: t.amount,
    description: t.description,
    category: t.category,
    type: t.type,
    creditCardId: t.creditCardId,
    accountId: t.accountId,
    createdAt: t.createdAt.toISOString(),
    dueDate: t.dueDate ? t.dueDate.toISOString() : null
  }));

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Meus <span className="text-gradient">Cartões</span>
        </h1>
      </div>

      <CardClient cards={cardsWithBalances} accounts={userAccounts} transactions={serializedTxs} />
    </div>
  );
}

export default CardsPage;
