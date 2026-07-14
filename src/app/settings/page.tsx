import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { SettingsForm } from './SettingsForm';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const [dbUser] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      age: users.age,
      incomeRange: users.incomeRange,
      financialGoal: users.financialGoal,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!dbUser) {
    redirect('/login');
  }

  return (
    <div className="py-2 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Minhas <span className="text-gradient">Configurações</span>
        </h1>
        <p className="text-slate-400 mt-2">
          Atualize suas informações pessoais e metas financeiras para calibrar as sugestões da nossa inteligência artificial.
        </p>
      </header>

      <SettingsForm user={dbUser} />
    </div>
  );
}
