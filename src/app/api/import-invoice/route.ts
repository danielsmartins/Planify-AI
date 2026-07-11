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
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParseModule = await import('pdf-parse') as Record<string, unknown>;
  
  // Caso 1: Export clássico como função direta
  const mainExport = pdfParseModule.default || pdfParseModule;
  if (typeof mainExport === 'function') {
    const data = await (mainExport as (buf: Buffer) => Promise<{ text: string }>)(buffer);
    return data.text || '';
  }
  
  // Caso 2: Versão moderna com a classe PDFParse (Vercel/ESM)
  if (pdfParseModule.PDFParse) {
    const PDFParseClass = pdfParseModule.PDFParse as (new (data: Uint8Array) => {
      load: () => Promise<void>;
      getText: () => Promise<unknown>;
    }) & { setWorker: (worker: string) => void };

    try {
      const workerModule = await import('pdf-parse/worker') as { getData: () => string };
      if (workerModule && typeof workerModule.getData === 'function') {
        PDFParseClass.setWorker(workerModule.getData());
      }
    } catch (workerErr) {
      console.error("Falha ao configurar worker em memória para o PDFParse:", workerErr);
    }

    const uint8Array = new Uint8Array(buffer);
    const parser = new PDFParseClass(uint8Array);
    await parser.load();
    const result = await parser.getText();
    if (result && typeof result === 'object' && 'text' in result) {
      const obj = result as Record<string, unknown>;
      return typeof obj.text === 'string' ? obj.text : '';
    }
    if (typeof result === 'string') {
      return result;
    }
  }
  throw new Error("Não foi possível encontrar um método de parsing de PDF válido no módulo pdf-parse.");
}

export async function POST(req: NextRequest) {
  try {
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
      text = await extractTextFromPdf(buffer);
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
