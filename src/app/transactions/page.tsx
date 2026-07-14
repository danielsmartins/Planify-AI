import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { transactions, categories, accounts, creditCards } from '@/db/schema';
import { eq, desc, and, lte, sql } from 'drizzle-orm';
import { TransactionRow, TransactionType } from '@/components/dashboard/TransactionRow';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import Link from 'next/link';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const monthStr = typeof params.month === 'string' ? params.month : 'all';
  const limit = 20;
  const offset = (page - 1) * limit;

  // Busca categorias, contas e cartões
  const userCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));
  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));

  const now = new Date();

  // Buscar todos os pagamentos de fatura para saber quais faturas estão pagas
  const invoicePayments = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      eq(transactions.status, 'confirmed'),
      sql`account_id IS NOT NULL AND credit_card_id IS NOT NULL`
    ));

  // Configurar condições de filtro
  const conditions = [
    eq(transactions.userId, session.user.id),
    eq(transactions.status, 'confirmed'),
    lte(transactions.createdAt, now)
  ];

  if (monthStr !== 'all') {
    const [yearStr, monthIndexStr] = monthStr.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthIndexStr) - 1;
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    
    conditions.push(
      sql`created_at >= ${startOfMonth}`,
      sql`created_at <= ${endOfMonth}`
    );
  }

  // Count total for pagination
  const allTxs = await db.select({ id: transactions.id })
    .from(transactions)
    .where(and(...conditions));
    
  const totalItems = allTxs.length;
  const totalPages = Math.ceil(totalItems / limit);

  // Busca página atual
  const paginatedTransactions = await db.select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

  const paginatedTransactionsWithStatus = paginatedTransactions.map(tx => {
    let isPendingPayment = false;
    if (tx.type === 'expense' && tx.creditCardId && !tx.accountId) {
      const txDueDate = new Date(tx.dueDate || tx.createdAt);
      const hasPayment = invoicePayments.some(p => 
        p.creditCardId === tx.creditCardId && 
        new Date(p.createdAt).getMonth() === txDueDate.getMonth() && 
        new Date(p.createdAt).getFullYear() === txDueDate.getFullYear()
      );
      isPendingPayment = !hasPayment;
    }
    return { ...tx, isPendingPayment };
  });

  return (
    <div className="py-2 pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Histórico de <span className="text-gradient">Transações</span>
        </h1>
        <p className="text-slate-400 mt-2">
          Visualize o histórico de suas movimentações passadas e do mês vigente.
        </p>
      </header>

      <TransactionFilters currentMonth={monthStr} />

      <section className="glass-panel rounded-2xl p-6 md:p-8">
        {paginatedTransactionsWithStatus.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Nenhuma transação encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                  <th className="pb-3 px-4">Data</th>
                  <th className="pb-3 px-4">Estabelecimento / Categoria</th>
                  <th className="pb-3 px-4">Origem</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactionsWithStatus.map((tx) => (
                  <TransactionRow 
                    key={tx.id} 
                    id={tx.id}
                    description={tx.description}
                    amount={parseFloat(tx.amount)}
                    type={tx.type as TransactionType}
                    category={tx.category}
                    date={new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                    createdAt={new Date(tx.createdAt).toISOString()}
                    accountId={tx.accountId}
                    creditCardId={tx.creditCardId}
                    accountName={tx.accountId ? (userAccounts.find(a => a.id === tx.accountId)?.name) : null}
                    creditCardName={tx.creditCardId ? (userCards.find(c => c.id === tx.creditCardId)?.name) : null}
                    categoriesList={userCategories}
                    isPendingPayment={tx.isPendingPayment}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-700/50">
            <div>
              <p className="text-sm text-slate-400">
                Mostrando página <span className="font-medium text-white">{page}</span> de <span className="font-medium text-white">{totalPages}</span>
              </p>
            </div>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={`/transactions?page=${page - 1}${monthStr !== 'all' ? `&month=${monthStr}` : ''}`} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">
                  Anterior
                </Link>
              ) : (
                <button disabled className="px-4 py-2 bg-slate-800/50 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed">
                  Anterior
                </button>
              )}
              
              {page < totalPages ? (
                <Link href={`/transactions?page=${page + 1}${monthStr !== 'all' ? `&month=${monthStr}` : ''}`} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">
                  Próxima
                </Link>
              ) : (
                <button disabled className="px-4 py-2 bg-slate-800/50 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed">
                  Próxima
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
