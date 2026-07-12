'use server';

import { db } from '@/db';
import { transactions, installments, creditCards, accounts, users } from '@/db/schema';
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

  // Validações obrigatórias impostas a partir de contas e carteiras
  if (type === 'income') {
    if (!accountId) {
      return { error: 'Uma receita (ganho) deve sempre estar atrelada a uma conta.' };
    }
    if (creditCardId) {
      return { error: 'Uma receita não pode ser lançada em um cartão de crédito.' };
    }
  } else if (type === 'expense') {
    if (!accountId && !creditCardId) {
      return { error: 'Uma despesa (gasto) deve estar atrelada a uma conta ou a um cartão de crédito.' };
    }
  }

  let txDate = new Date();
  const parsedAmount = parseFloat(amount);

  // Se for despesa no cartão de crédito E não tiver conta vinculada (gasto normal no crédito)
  if (creditCardId && !accountId) {
    const cardRes = await db.select().from(creditCards).where(eq(creditCards.id, creditCardId));
    if (cardRes.length > 0) {
      const card = cardRes[0];
      txDate = calculateCreditCardDate(txDate, Number(card.closingDay), Number(card.dueDay));
    }
  }

  // Se houver conta associada (Receita, Despesa direta ou Pagamento de fatura de cartão)
  if (accountId) {
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
    accountId: accountId || null,
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

    // Buscar contas e cartões para associação automática
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));
    const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));

    let accountId: string | null = null;
    let creditCardId: string | null = null;
    const parsedAmount = extractedData.amount;

    if (extractedData.type === 'income') {
      if (userAccounts.length === 0) {
        return { error: 'Você precisa ter pelo menos uma conta cadastrada para registrar receitas.' };
      }
      accountId = userAccounts[0].id;
    } else {
      // É despesa
      const isCredit = text.toLowerCase().includes('crédito') || text.toLowerCase().includes('cartão') || extractedData.isInstallment;
      if (isCredit && userCards.length > 0) {
        creditCardId = userCards[0].id;
      } else if (userAccounts.length > 0) {
        accountId = userAccounts[0].id;
      } else if (userCards.length > 0) {
        creditCardId = userCards[0].id;
      } else {
        return { error: 'Você precisa cadastrar pelo menos uma conta ou cartão de crédito para registrar despesas.' };
      }
    }

    // Se associou a uma conta, atualiza o saldo
    if (accountId) {
      const acc = userAccounts.find(a => a.id === accountId);
      if (acc) {
        const currentBalance = parseFloat(acc.balance);
        const newBalance = extractedData.type === 'income' ? currentBalance + parsedAmount : currentBalance - parsedAmount;
        await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, accountId));
      }
    }

    let txDate = new Date();
    if (creditCardId && !accountId) {
      const card = userCards.find(c => c.id === creditCardId);
      if (card) {
        txDate = calculateCreditCardDate(txDate, Number(card.closingDay), Number(card.dueDay));
      }
    }

    await db.insert(transactions).values({
      userId: session.user.id,
      amount: extractedData.amount.toString(),
      description: extractedData.description,
      category: extractedData.category,
      type: extractedData.type as "income" | "expense",
      accountId,
      creditCardId,
      createdAt: txDate
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
  const accountId = formData.get('accountId') as string | null;

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

  // Se houver conta associada, desconta o valor da parcela atual do saldo da conta
  if (accountId) {
    const accRes = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, session.user.id)));
    if (accRes.length > 0) {
      const acc = accRes[0];
      const currentBalance = parseFloat(acc.balance);
      const newBalance = currentBalance - installmentAmount;
      await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, acc.id));
    }
  }

  // Generate transactions for the remaining installments
  const txValues = [];
  const now = new Date();
  
  for (let i = currentInstallment; i <= installmentsCount; i++) {
    // Calculo basico de meses a frente
    const baseDate = new Date(now);
    baseDate.setMonth(now.getMonth() + (i - currentInstallment));
    
    let txDate = baseDate;
    if (cardClosingDay > 0 && cardDueDay > 0) {
      // Para parcelamentos em andamento, o primeiro item (i = currentInstallment) deve cair no vencimento do mês atual
      // Os itens subsequentes caem nos meses subsequentes
      const targetDate = new Date(now);
      targetDate.setMonth(now.getMonth() + (i - currentInstallment));
      targetDate.setDate(cardDueDay);
      txDate = targetDate;
    }
    
    txValues.push({
      userId: session.user.id,
      amount: installmentAmount.toString(),
      description: `${description} (${i}/${installmentsCount})`,
      category: category,
      type: 'expense' as const,
      installmentId: installment.id,
      creditCardId: creditCardId || null,
      accountId: accountId || null,
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

export async function completeOnboarding(
  formData: FormData,
  expensesList: Array<{ description: string; amount: number; category: string; date: string }>
) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const accountName = formData.get('accountName') as string;
  const accountType = formData.get('accountType') as 'checking' | 'savings' | 'investment' | 'cash';
  const accountColor = formData.get('accountColor') as string;
  const accountBalance = formData.get('accountBalance') as string;

  if (!accountName || !accountType || !accountColor || !accountBalance) {
    return { error: 'Preencha todos os campos obrigatórios da conta bancária.' };
  }

  try {
    // 1. Criar a conta bancária inicial com o saldo informado
    const [newAccount] = await db.insert(accounts).values({
      userId: session.user.id,
      name: accountName,
      type: accountType,
      color: accountColor,
      balance: parseFloat(accountBalance).toString(),
    }).returning();

    // 2. Criar os gastos listados (se houver)
    if (expensesList && expensesList.length > 0) {
      const txValues = expensesList.map(exp => {
        const dateObj = exp.date ? new Date(exp.date) : new Date();
        const finalDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
        
        return {
          userId: session.user.id,
          amount: exp.amount.toString(),
          description: exp.description,
          category: exp.category || 'Outros',
          type: 'expense' as const,
          accountId: newAccount.id,
          createdAt: finalDate,
        };
      });
      await db.insert(transactions).values(txValues);
    }

    // 3. Atualizar o status de onboardingCompleted do usuário
    await db.update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, session.user.id));

    revalidatePath('/');
    revalidatePath('/accounts');
    revalidatePath('/transactions');
    return { success: true };
  } catch (e) {
    console.error('Erro no onboarding:', e);
    return { error: 'Erro ao salvar os dados iniciais. Tente novamente.' };
  }
}

export async function skipOnboarding() {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  try {
    await db.update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, session.user.id));

    revalidatePath('/');
    return { success: true };
  } catch (e) {
    console.error('Erro ao pular o onboarding:', e);
    return { error: 'Erro ao pular o passo a passo.' };
  }
}

