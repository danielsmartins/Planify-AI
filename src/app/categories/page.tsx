import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { categories, transactions } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { CategoryClient } from '@/components/categories/CategoryClient';
import { CategoryLimitChart } from '@/components/analytics/CategoryLimitChart';

export default async function CategoriesPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const userCategories = await db.select()
    .from(categories)
    .where(eq(categories.userId, session.user.id))
    .orderBy(desc(categories.createdAt));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Busca despesas do mês atual para o gráfico de limites
  const currentMonthTxs = await db.select().from(transactions).where(
    and(
      eq(transactions.userId, session.user.id),
      eq(transactions.status, 'confirmed'),
      eq(transactions.type, 'expense'),
      sql`${transactions.createdAt} >= ${startOfMonth}`,
      sql`${transactions.createdAt} <= ${endOfMonth}`
    )
  );

  const categoryStats: Record<string, { spent: number, limit: number, color: string }> = {};
  userCategories.forEach(c => {
    categoryStats[c.name] = { spent: 0, limit: parseFloat(c.monthlyLimit || '0'), color: c.color };
  });

  currentMonthTxs.forEach(tx => {
    if (categoryStats[tx.category]) {
      categoryStats[tx.category].spent += parseFloat(tx.amount);
    } else {
      categoryStats[tx.category] = { spent: parseFloat(tx.amount), limit: 0, color: '#64748b' };
    }
  });

  const limitsData = Object.entries(categoryStats)
    .filter(([, data]) => data.limit > 0 || data.spent > 0)
    .map(([name, data]) => ({
      name,
      spent: data.spent,
      limit: data.limit,
      color: data.color
    }))
    .sort((a, b) => b.spent - a.spent);

  return (
    <div className="py-2">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Categorias & <span className="text-gradient">Metas</span>
        </h1>
        <p className="text-slate-400 mt-2">
          Gerencie suas categorias de gastos e defina limites mensais. A IA do Telegram irá utilizar essas categorias para organizar suas finanças automaticamente.
        </p>
      </header>

      <div className="mb-8">
        <CategoryLimitChart data={limitsData} />
      </div>
      
      <CategoryClient categories={userCategories} />
    </div>
  );
}
