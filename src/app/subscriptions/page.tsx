import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { subscriptions, categories, accounts, creditCards } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { SubscriptionClient } from '@/components/subscriptions/SubscriptionClient';

export default async function SubscriptionsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const userSubscriptions = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .orderBy(desc(subscriptions.createdAt));

  const userCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));
  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));

  return (
    <div className="py-2">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Gestor de <span className="text-gradient">Assinaturas</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Controle seus gastos fixos com serviços recorrentes como Netflix, Spotify, Academia, etc.
          </p>
        </div>
      </header>
      
      <SubscriptionClient 
        subscriptions={userSubscriptions} 
        categories={userCategories}
        accounts={userAccounts}
        creditCards={userCards}
      />
    </div>
  );
}
