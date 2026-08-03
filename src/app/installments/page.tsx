import { db } from '@/db';
import { installments, transactions, categories, creditCards, accounts } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, sql, desc, and } from 'drizzle-orm';
import { InstallmentClient } from '@/components/installments/InstallmentClient';

import { calculateInstallmentDetails } from '@/lib/installments';

export default async function InstallmentsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Busca todos os parcelamentos do usuário
  const userInstallments = await db.select().from(installments)
    .where(eq(installments.userId, session.user.id))
    .orderBy(desc(installments.createdAt));

  const now = new Date();
  
  const allInstallmentTx = await db.select().from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      sql`installment_id IS NOT NULL`
    ));

  // Buscar todos os pagamentos de fatura para saber se a parcela de cartão foi efetivamente quitada
  const invoicePayments = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      eq(transactions.status, 'confirmed'),
      sql`account_id IS NOT NULL AND credit_card_id IS NOT NULL`
    ));

  // Monta a estrutura para o client utilizando calculateInstallmentDetails
  const installmentsData = userInstallments.map(inst => {
    return calculateInstallmentDetails(inst, allInstallmentTx, invoicePayments, now);
  });

  const userCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));
  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
      
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Compras <span className="text-gradient">Parceladas</span>
        </h1>
        <p className="text-slate-400">
          Gerencie seus parcelamentos e saiba o quanto do seu orçamento futuro está comprometido.
        </p>
      </div>

      <InstallmentClient 
        installments={installmentsData} 
        categories={userCategories} 
        creditCards={userCards} 
        accounts={userAccounts}
      />
    </div>
  );
}
