import { db } from '@/db';
import { creditCards } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { CardClient } from '@/components/cards/CardClient';

export default async function CardsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Meus <span className="text-gradient">Cartões</span>
        </h1>
      </div>

      <CardClient cards={userCards} />
    </div>
  );
}
