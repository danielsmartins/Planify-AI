import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { transactions, categories } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { TransactionRow, TransactionType } from '@/components/dashboard/TransactionRow';
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
  const limit = 20;
  const offset = (page - 1) * limit;

  // Busca categorias
  const userCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Count total for pagination (apenas até o final do mês atual)
  const allTxs = await db.select({ id: transactions.id })
    .from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      eq(transactions.status, 'confirmed'),
      sql`${transactions.createdAt} <= ${endOfMonth}`
    ));
    
  const totalItems = allTxs.length;
  const totalPages = Math.ceil(totalItems / limit);

  // Busca página atual
  const paginatedTransactions = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      eq(transactions.status, 'confirmed'),
      sql`${transactions.createdAt} <= ${endOfMonth}`
    ))
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

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

      <section className="glass-panel rounded-2xl p-6 md:p-8">
        {paginatedTransactions.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Nenhuma transação encontrada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {paginatedTransactions.map((tx) => (
              <TransactionRow 
                key={tx.id} 
                id={tx.id}
                description={tx.description}
                amount={parseFloat(tx.amount)}
                type={tx.type as TransactionType}
                category={tx.category}
                date={new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                categoriesList={userCategories}
              />
            ))}
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
                <Link href={`/transactions?page=${page - 1}`} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">
                  Anterior
                </Link>
              ) : (
                <button disabled className="px-4 py-2 bg-slate-800/50 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed">
                  Anterior
                </button>
              )}
              
              {page < totalPages ? (
                <Link href={`/transactions?page=${page + 1}`} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">
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
