import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
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
      
      <CategoryClient categories={userCategories} />
    </div>
  );
}
