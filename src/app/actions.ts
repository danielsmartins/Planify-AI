'use server';

import { db } from '@/db';
import { transactions, installments } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { extractFinancialData } from '@/lib/gemini';

export async function createTransaction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const description = formData.get('description') as string;
  const amount = formData.get('amount') as string;
  const category = formData.get('category') as string;
  const type = formData.get('type') as 'income' | 'expense';

  if (!description || !amount || !category) {
    return { error: 'Preencha todos os campos.' };
  }

  await db.insert(transactions).values({
    userId: session.user.id,
    amount: amount,
    description: description,
    category: category,
    type: type
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

  await db.delete(transactions).where(
    and(
      eq(transactions.id, id),
      eq(transactions.userId, session.user.id)
    )
  );

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
  }).returning({ id: installments.id });

  // Generate transactions for the remaining installments
  const txValues = [];
  const now = new Date();
  
  for (let i = currentInstallment; i <= installmentsCount; i++) {
    const txDate = new Date(now);
    txDate.setMonth(now.getMonth() + (i - currentInstallment));
    
    txValues.push({
      userId: session.user.id,
      amount: installmentAmount.toString(),
      description: `${description} (${i}/${installmentsCount})`,
      category: category,
      type: 'expense' as const,
      installmentId: installment.id,
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
