import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const userTxs = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, session.user.id),
        sql`${transactions.createdAt} >= ${startOfMonth}`,
        sql`${transactions.createdAt} <= ${endOfMonth}`
      ));

    if (userTxs.length === 0) {
      return NextResponse.json({ 
        report: "Você ainda não possui transações neste mês para gerar um relatório inteligente." 
      });
    }

    const txsSummary = userTxs.map(t => `${t.type === 'income' ? 'RECEITA' : 'DESPESA'} | ${t.category} | R$ ${t.amount} | ${t.description}`).join('\n');

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Você é o "Planify AI", um consultor financeiro de alto nível.
Analise as transações deste mês do usuário e escreva um relatório gerencial em português.

Transações do mês:
${txsSummary}

Instruções para o relatório:
1. Resuma como está o balanço do mês (gastou mais que ganhou?).
2. Destaque em quais categorias o usuário mais gastou.
3. Dê 2 dicas práticas e encorajadoras baseadas no comportamento de gastos dele.
4. O tom deve ser profissional, empático e sofisticado.
5. Formate o texto em Markdown, utilizando negritos e listas para facilitar a leitura.
6. Seja direto ao ponto, não escreva uma bíblia. Limite a uns 3 ou 4 parágrafos.
`;

    const result = await model.generateContent(prompt);
    const reportText = result.response.text();

    return NextResponse.json({ report: reportText });

  } catch (error) {
    console.error('API AI Report Error:', error);
    return NextResponse.json({ error: 'Erro ao gerar o relatório inteligente.' }, { status: 500 });
  }
}
