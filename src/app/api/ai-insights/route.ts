import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
    }

    // Fetch user's recent transactions (last 30 for context)
    const userTransactions = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, session.user.id),
        eq(transactions.status, 'confirmed')
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(30);

    if (userTransactions.length === 0) {
      return NextResponse.json({ 
        insight: "Você ainda não tem transações registradas. Adicione algumas receitas ou despesas para que eu possa analisar sua saúde financeira!" 
      });
    }

    // Aggregate data for the prompt
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: Record<string, number> = {};

    userTransactions.forEach((tx) => {
      const val = parseFloat(tx.amount);
      if (tx.type === 'income') {
        totalIncome += val;
      } else {
        totalExpense += val;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + val;
      }
    });

    const balance = totalIncome - totalExpense;
    
    // Sort categories by highest expense
    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, val]) => `${cat}: R$ ${val.toFixed(2)}`)
      .join(', ');

    const prompt = `Você é um consultor financeiro pessoal amigável, inteligente e direto ao ponto (estilo Nubank). 
Seu cliente se chama ${session.user.name}.
Aqui estão os dados recentes dele (baseado nas últimas 30 transações):
- Entradas totais: R$ ${totalIncome.toFixed(2)}
- Saídas totais: R$ ${totalExpense.toFixed(2)}
- Saldo atual: R$ ${balance.toFixed(2)}
- Maiores categorias de gasto: ${topCategories}

Escreva UM ÚNICO PARÁGRAFO (máximo de 3 frases curtas) dando um conselho financeiro personalizado ou um "insight" interessante sobre esses dados.
Fale diretamente com o cliente usando o primeiro nome dele. Não use formatações Markdown pesadas (apenas texto). Seja encorajador mas realista.
Exemplo: "Daniel, notei que grande parte dos seus gastos estão em Alimentação. Seu saldo está positivo, o que é ótimo, mas que tal tentar segurar os pedidos de delivery no fim de semana para economizar mais?"`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ insight: responseText });

  } catch (error) {
    console.error("AI Insight Error:", error);
    return NextResponse.json({ error: "Failed to generate insight" }, { status: 500 });
  }
}
