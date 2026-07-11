import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { extractInvoiceTransactions } from '@/lib/gemini';
import { db } from '@/db';
import { transactions, categories, creditCards } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Polyfill DOMMatrix for Node.js environments (used by pdfjs-dist inside pdf-parse)
if (typeof global !== 'undefined' && !('DOMMatrix' in global)) {
  Object.defineProperty(global, 'DOMMatrix', {
    value: class DOMMatrix {},
    writable: true,
    configurable: true
  });
}
export async function POST(req: NextRequest) {
  try {
    // Importação dinâmica para evitar o erro DOMMatrix is not defined no build do Next.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const creditCardId = formData.get('creditCardId') as string;

    if (!file || !creditCardId) {
      return NextResponse.json({ error: 'Arquivo e Cartão de Crédito são obrigatórios.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ler texto do PDF
    let text = '';
    try {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } catch (e) {
      console.error('Erro ao ler PDF:', e);
      return NextResponse.json({ error: 'Erro ao extrair texto do PDF. O arquivo pode estar corrompido ou protegido por senha.' }, { status: 400 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Não foi possível encontrar texto no PDF.' }, { status: 400 });
    }

    // Calcular data baseada no cartão de crédito
    let txDate = new Date();
    const cardRes = await db.select().from(creditCards).where(eq(creditCards.id, creditCardId));
    
    if (cardRes.length > 0) {
      const card = cardRes[0];
      const resultDate = new Date();
      const currentDay = resultDate.getDate();
      if (currentDay >= Number(card.closingDay)) {
        resultDate.setMonth(resultDate.getMonth() + 1);
      }
      resultDate.setDate(Number(card.dueDay));
      txDate = resultDate;
    }

    const referenceDateStr = txDate.toISOString().split('T')[0];

    // Buscar categorias do usuário para melhor classificação
    const userCats = await db.select().from(categories).where(eq(categories.userId, session.user.id));
    const catNames = userCats.map(c => c.name);

    // Enviar para o Gemini
    const extractedData = await extractInvoiceTransactions(text, catNames, referenceDateStr);

    if (extractedData.length === 0) {
      return NextResponse.json({ error: 'Não foi possível encontrar transações na fatura ou a IA não conseguiu processar.' }, { status: 400 });
    }

    // Preparar inserção no banco
    const txToInsert = extractedData.map(tx => ({
      userId: session.user.id,
      amount: tx.amount.toString(),
      description: tx.description,
      category: tx.category,
      type: 'expense' as const,
      creditCardId: creditCardId,
      createdAt: tx.date ? new Date(tx.date) : txDate
    }));

    await db.insert(transactions).values(txToInsert);

    return NextResponse.json({ 
      success: true, 
      message: `${txToInsert.length} transações importadas com sucesso!`,
      count: txToInsert.length
    });

  } catch (error) {
    console.error('API Import Invoice Error:', error);
    return NextResponse.json({ error: 'Erro interno ao processar a importação.' }, { status: 500 });
  }
}
