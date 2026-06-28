import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { accounts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { AccountClient } from '@/components/accounts/AccountClient';

export default async function AccountsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const userAccounts = await db.select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .orderBy(desc(accounts.createdAt));

  return (
    <div className="py-2">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Minhas <span className="text-gradient">Contas e Carteiras</span>
        </h1>
        <p className="text-slate-400 mt-2">
          Gerencie suas contas correntes, poupanças, carteiras de investimento e dinheiro físico.
        </p>
      </header>
      
      <AccountClient accounts={userAccounts} />
    </div>
  );
}
