import { db } from '@/db';
import { installments, transactions } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, sql, desc, and } from 'drizzle-orm';
import { InstallmentClient } from '@/components/installments/InstallmentClient';
import { TopNav } from '@/components/layout/TopNav';

export default async function InstallmentsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Busca todos os parcelamentos do usuário
  const userInstallments = await db.select().from(installments)
    .where(eq(installments.userId, session.user.id))
    .orderBy(desc(installments.createdAt));

  // Para cada parcelamento, precisamos saber quantas parcelas já passaram e qual a soma
  // Pra simplificar, vamos buscar todas as transações vinculadas a parcelamentos que são <= data de hoje
  const now = new Date();
  
  const allInstallmentTx = await db.select().from(transactions)
    .where(and(
      eq(transactions.userId, session.user.id),
      sql`installment_id IS NOT NULL`
    ));

  // Monta a estrutura para o client:
  const installmentsData = userInstallments.map(inst => {
    // Quantas parcelas foram geradas? (Isso pode ser menor que inst.installmentsCount se o usuario já cadastrou a partir da 3ª)
    const generatedTxs = allInstallmentTx.filter(t => t.installmentId === inst.id);
    const paidTxs = generatedTxs.filter(t => new Date(t.createdAt) <= now);
    
    // A parcela atual seria (Total - (Qtd. Geradas)) + Pagas
    // Ex: Comprou em 10x, mas cadastrou na 4ª (Gerou 7). 10 - 7 = 3. Já tinha pago 3 antes do app.
    // Pagas no app = 2. Total pago = 3 + 2 = 5 de 10.
    const notRegisteredButPaid = Number(inst.installmentsCount) - generatedTxs.length;
    const totalPaid = notRegisteredButPaid + paidTxs.length;
    
    // Calcula montante
    const installmentValue = Number(inst.totalAmount) / Number(inst.installmentsCount);
    const remainingAmount = Number(inst.totalAmount) - (totalPaid * installmentValue);

    return {
      id: inst.id,
      description: inst.description,
      category: inst.category,
      totalAmount: inst.totalAmount,
      installmentsCount: Number(inst.installmentsCount),
      paidCount: totalPaid,
      installmentValue: installmentValue.toString(),
      remainingAmount: remainingAmount.toString(),
      createdAt: inst.createdAt
    };
  });

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
      <TopNav />
      
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Compras <span className="text-gradient">Parceladas</span>
        </h1>
        <p className="text-slate-400">
          Gerencie seus parcelamentos e saiba o quanto do seu orçamento futuro está comprometido.
        </p>
      </div>

      <InstallmentClient installments={installmentsData} />
    </div>
  );
}
