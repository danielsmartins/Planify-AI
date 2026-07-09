import { db } from '@/db';
import { creditCards, accounts, transactions } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, sql } from 'drizzle-orm';
import { CardClient } from '@/components/cards/CardClient';

export default async function CardsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));
  const cardTransactions = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      eq(transactions.status, 'confirmed'),
      sql`credit_card_id IS NOT NULL`
    ));

  // Calcular valor devedor de cada cartão do mês atual (compras - pagamentos de fatura)
  const cardsWithBalances = userCards.map(card => {
    const cardTxs = cardTransactions.filter(t => t.creditCardId === card.id);
    const currentMonthTxs = cardTxs.filter(t => t.createdAt >= startOfMonth && t.createdAt <= endOfMonth);
    
    const purchases = currentMonthTxs.filter(t => !t.accountId).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const payments = currentMonthTxs.filter(t => t.accountId).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const outstanding = purchases - payments;
    
    return {
      id: card.id,
      name: card.name,
      color: card.color,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      limitAmount: card.limitAmount,
      brand: card.brand,
      invoiceAmount: outstanding.toString()
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
    createdAt: t.createdAt.toISOString()
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
