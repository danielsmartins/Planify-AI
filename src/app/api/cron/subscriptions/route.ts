import { db } from '@/db';
import { subscriptions, transactions, creditCards, accounts } from '@/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';

function calculateCreditCardDate(baseDate: Date, closingDay: number, dueDay: number): Date {
  const resultDate = new Date(baseDate);
  const currentDay = resultDate.getDate();
  if (currentDay >= closingDay) {
    resultDate.setMonth(resultDate.getMonth() + 1);
  }
  resultDate.setDate(dueDay);
  return resultDate;
}

export async function GET(req: Request) {
  // Autenticação básica para o Cron Job (padrão Vercel)
  const authHeader = req.headers.get('authorization');
  
  // Em produção, você deve configurar a variável CRON_SECRET na Vercel
  if (
    process.env.NODE_ENV === 'production' && 
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  try {
    // 1. Buscar assinaturas ativas que já passaram da data de cobrança
    const pendingSubs = await db.select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.status, 'active'),
        lte(subscriptions.nextBillingDate, now)
      ));

    if (pendingSubs.length === 0) {
      return NextResponse.json({ message: 'Nenhuma assinatura pendente de cobrança.' });
    }

    let processedCount = 0;

    // 2. Processar cada assinatura
    for (const sub of pendingSubs) {
      // 2.1 Calcular a data exata da transação
      let txDate = new Date(sub.nextBillingDate);
      
      if (sub.creditCardId) {
        const cardRes = await db.select().from(creditCards).where(eq(creditCards.id, sub.creditCardId));
        if (cardRes.length > 0) {
          const card = cardRes[0];
          txDate = calculateCreditCardDate(txDate, Number(card.closingDay), Number(card.dueDay));
        }
      } else if (sub.accountId) {
        // 2.2 Debitar o saldo da conta
        const accRes = await db.select().from(accounts).where(eq(accounts.id, sub.accountId));
        if (accRes.length > 0) {
          const acc = accRes[0];
          const newBalance = parseFloat(acc.balance) - parseFloat(sub.amount);
          await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, acc.id));
        }
      }

      // 2.3 Inserir a transação
      await db.insert(transactions).values({
        userId: sub.userId,
        amount: sub.amount,
        description: sub.name,
        category: sub.category,
        type: 'expense',
        creditCardId: sub.creditCardId,
        accountId: sub.accountId,
        createdAt: txDate
      });

      // 2.4 Calcular próxima data de cobrança
      const nextDate = new Date(sub.nextBillingDate);
      if (sub.billingCycle === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // 2.5 Atualizar a assinatura
      await db.update(subscriptions)
        .set({ nextBillingDate: nextDate })
        .where(eq(subscriptions.id, sub.id));
        
      processedCount++;
    }

    return NextResponse.json({ 
      message: `Sucesso. ${processedCount} assinaturas processadas.`,
      processedIds: pendingSubs.map(s => s.id)
    });

  } catch (error) {
    console.error('Error processing subscriptions cron:', error);
    return NextResponse.json({ error: 'Erro interno ao processar assinaturas' }, { status: 500 });
  }
}
