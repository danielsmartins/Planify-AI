import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { categories, transactions } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { CategoryClient } from '@/components/categories/CategoryClient';

export default async function CategoriesPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const userCategories = await db.select()
    .from(categories)
    .where(eq(categories.userId, session.user.id))
    .orderBy(desc(categories.createdAt));

  const budgetData = userCategories
    .filter(c => parseFloat(c.monthlyLimit || '0') > 0)
    .map(c => ({
      name: c.name,
      value: parseFloat(c.monthlyLimit || '0'),
      color: c.color
    }))
    .sort((a, b) => b.value - a.value);

  // Buscar despesas confirmadas do mês atual para o gráfico de progresso
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const userExpenses = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      eq(transactions.type, 'expense'),
      eq(transactions.status, 'confirmed'),
      sql`${transactions.createdAt} >= ${startOfMonth}`,
      sql`${transactions.createdAt} <= ${endOfMonth}`
    ));

  const spentByCategory: Record<string, number> = {};

  userExpenses.forEach(tx => {
    const isCardPayment = tx.accountId && tx.creditCardId;
    if (!isCardPayment) {
      const amountVal = parseFloat(tx.amount);
      spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + amountVal;
    }
  });

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

      <CategoryClient 
        categories={userCategories} 
        budgetData={budgetData} 
        spentByCategory={spentByCategory}
      />
    </div>
  );
}
