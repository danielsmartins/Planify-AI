'use server';

import { db } from '@/db';
import { transactions } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
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
