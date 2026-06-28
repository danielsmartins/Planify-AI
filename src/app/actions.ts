'use server';

import { db } from '@/db';
import { transactions, installments, creditCards, accounts } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { extractFinancialData } from '@/lib/gemini';

function calculateCreditCardDate(baseDate: Date, closingDay: number, dueDay: number): Date {
  const resultDate = new Date(baseDate);
  const currentDay = resultDate.getDate();
  
  // O mês do vencimento será ajustado com base no dia de fechamento
  if (currentDay >= closingDay) {
    // Se a data já passou (ou é igual) ao dia de fechamento, a fatura só vem no mês subsequente
    resultDate.setMonth(resultDate.getMonth() + 1);
  }
  
  // E o dia exato será o dueDay (se o mes mudar e n tiver esse dia, o JS ajusta)
  resultDate.setDate(dueDay);

  // Tratando corner cases se dueDay for 31 e o mês cair em Fev, resultDate vai pro mes seguinte
  // Mas new Date(2026, 1, 31) vira Março 3, que geralmente as operadoras ajustam pro último dia util
  // Pra manter simples, vamos deixar o JS converter.
  return resultDate;
}

export async function createTransaction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const description = formData.get('description') as string;
  const amount = formData.get('amount') as string;
  const category = formData.get('category') as string;
  const type = formData.get('type') as 'income' | 'expense';
  const creditCardId = formData.get('creditCardId') as string | null;
  const accountId = formData.get('accountId') as string | null;

  if (!description || !amount || !category) {
    return { error: 'Preencha todos os campos.' };
  }

  let txDate = new Date();
  const parsedAmount = parseFloat(amount);

  if (creditCardId) {
    const cardRes = await db.select().from(creditCards).where(eq(creditCards.id, creditCardId));
    if (cardRes.length > 0) {
      const card = cardRes[0];
      txDate = calculateCreditCardDate(txDate, Number(card.closingDay), Number(card.dueDay));
    }
  } else if (accountId) {
    // Atualizar saldo da conta se não for cartão de crédito
    const accRes = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, session.user.id)));
    if (accRes.length > 0) {
      const acc = accRes[0];
      const currentBalance = parseFloat(acc.balance);
      const newBalance = type === 'income' ? currentBalance + parsedAmount : currentBalance - parsedAmount;
      
      await db.update(accounts)
        .set({ balance: newBalance.toString() })
        .where(eq(accounts.id, acc.id));
    }
  }

  await db.insert(transactions).values({
    userId: session.user.id,
    amount: amount,
    description: description,
    category: category,
    type: type,
    creditCardId: creditCardId || null,
    accountId: (!creditCardId && accountId) ? accountId : null,
    createdAt: txDate
  });

  revalidatePath('/');
  return { success: true };
}

export async function addTransactionViaAI(text: string) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  if (!text) return { error: 'Texto não pode ser vazio.' };

  try {
    const extractedData = await extractFinancialData(text);
    if (!extractedData) return { error: 'Não consegui entender a transação. Tente ser mais claro, ex: "Uber 25 reais".' };

    await db.insert(transactions).values({
      userId: session.user.id,
      amount: extractedData.amount.toString(),
      description: extractedData.description,
      category: extractedData.category,
      type: extractedData.type as "income" | "expense",
    });

    revalidatePath('/');
    return { success: true, data: extractedData };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'RATE_LIMIT') {
      return { error: 'Limite grátis de Inteligência Artificial atingido. Tente novamente mais tarde.' };
    }
    return { error: 'Erro interno ao processar com IA.' };
  }
}

export async function deleteTransaction(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const txRes = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)));
  
  if (txRes.length > 0) {
    const tx = txRes[0];
    
    // Se tinha uma conta atrelada, desfazer a operação no saldo
    if (tx.accountId) {
      const accRes = await db.select().from(accounts).where(eq(accounts.id, tx.accountId));
      if (accRes.length > 0) {
        const acc = accRes[0];
        const currentBalance = parseFloat(acc.balance);
        const parsedAmount = parseFloat(tx.amount);
        // Desfazer: se era despesa, soma de volta. Se era receita, subtrai de volta.
        const newBalance = tx.type === 'expense' ? currentBalance + parsedAmount : currentBalance - parsedAmount;
        
        await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, tx.accountId));
      }
    }

    await db.delete(transactions).where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, session.user.id)
      )
    );
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateTransaction(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const description = formData.get('description') as string;
  const amount = formData.get('amount') as string;
  const category = formData.get('category') as string;

  if (!description || !amount || !category) {
    return { error: 'Preencha todos os campos.' };
  }

  await db.update(transactions).set({
    amount: amount,
    description: description,
    category: category,
  }).where(
    and(
      eq(transactions.id, id),
      eq(transactions.userId, session.user.id)
    )
  );

  revalidatePath('/');
  return { success: true };
}

export async function createInstallmentPurchase(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const description = formData.get('description') as string;
  const installmentAmount = parseFloat(formData.get('amount') as string);
  const category = formData.get('category') as string;
  const installmentsCount = parseInt(formData.get('installmentsCount') as string);
  const currentInstallment = parseInt(formData.get('currentInstallment') as string);
  const creditCardId = formData.get('creditCardId') as string | null;

  if (!description || isNaN(installmentAmount) || !category || isNaN(installmentsCount) || isNaN(currentInstallment)) {
    return { error: 'Preencha todos os campos corretamente.' };
  }

  if (currentInstallment > installmentsCount) {
    return { error: 'A parcela atual não pode ser maior que o total de parcelas.' };
  }

  const totalAmount = installmentAmount * installmentsCount;

  // Insert master installment record
  const [installment] = await db.insert(installments).values({
    userId: session.user.id,
    description,
    category,
    totalAmount: totalAmount.toString(),
    installmentsCount: installmentsCount.toString(),
    creditCardId: creditCardId || null,
  }).returning({ id: installments.id });

  let cardClosingDay = 0;
  let cardDueDay = 0;

  if (creditCardId) {
    const cardRes = await db.select().from(creditCards).where(eq(creditCards.id, creditCardId));
    if (cardRes.length > 0) {
      cardClosingDay = Number(cardRes[0].closingDay);
      cardDueDay = Number(cardRes[0].dueDay);
    }
  }

  // Generate transactions for the remaining installments
  const txValues = [];
  const now = new Date();
  
  for (let i = currentInstallment; i <= installmentsCount; i++) {
    // Calculo basico de meses a frente
    const baseDate = new Date(now);
    baseDate.setMonth(now.getMonth() + (i - currentInstallment));
    
    // Se tiver cartao de credito, aplica a logica de vencimento
    let txDate = baseDate;
    if (cardClosingDay > 0 && cardDueDay > 0) {
      txDate = calculateCreditCardDate(baseDate, cardClosingDay, cardDueDay);
    }
    
    txValues.push({
      userId: session.user.id,
      amount: installmentAmount.toString(),
      description: `${description} (${i}/${installmentsCount})`,
      category: category,
      type: 'expense' as const,
      installmentId: installment.id,
      creditCardId: creditCardId || null,
      createdAt: txDate,
    });
  }

  if (txValues.length > 0) {
    await db.insert(transactions).values(txValues);
  }

  revalidatePath('/');
  revalidatePath('/installments');
  return { success: true };
}
