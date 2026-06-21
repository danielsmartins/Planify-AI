import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractFinancialData } from "@/lib/gemini";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Validação do Webhook (Quando a Meta tenta verificar nosso servidor)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "meu_token_secreto_planify";

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
  }

  return new NextResponse('Bad Request', { status: 400 });
}

// Recebendo as mensagens do WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verificando se é um evento do WhatsApp
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === "text") {
        const fromPhone = message.from; // Número do usuário que enviou
        const textMessage = message.text.body;

        // 1. Procurar o usuário no banco pelo telefone
        // O WhatsApp envia o telefone no formato internacional (ex: 551199999999)
        const userRes = await db.select().from(users).where(eq(users.phone, fromPhone));
        const user = userRes[0];

        if (!user) {
          // Usuário não cadastrado, avisar via WhatsApp
          await sendWhatsAppMessage(fromPhone, "Olá! 🤖 Não encontrei o seu número no Planify AI. Por favor, acesse o painel web e crie sua conta com este número!");
          return NextResponse.json({ status: "User not found" });
        }

        // 2. Extrair dados via IA (Gemini)
        await sendWhatsAppMessage(fromPhone, "⏳ Analisando sua mensagem com Inteligência Artificial...");
        
        const extractedData = await extractFinancialData(textMessage);

        if (!extractedData) {
          await sendWhatsAppMessage(fromPhone, "🤔 Não consegui identificar um gasto ou ganho nessa mensagem. Pode tentar escrever de outra forma? Ex: 'Uber 25 reais'.");
          return NextResponse.json({ status: "Ignored text" });
        }

        // 3. Salvar no banco (Drizzle)
        await db.insert(transactions).values({
          userId: user.id,
          amount: extractedData.amount.toString(),
          description: extractedData.description,
          category: extractedData.category,
          type: extractedData.type as any,
        });

        // 4. Feedback final
        const tipo = extractedData.type === 'income' ? 'Entrada' : 'Saída';
        const icone = extractedData.type === 'income' ? '✅' : '💸';
        await sendWhatsAppMessage(fromPhone, `${icone} Sucesso!\n\n${tipo}: *${extractedData.description}*\nValor: *R$ ${extractedData.amount}*\nCategoria: *${extractedData.category}*\n\nJá atualizei o seu painel web!`);
      }
    }

    return NextResponse.json({ status: "Success" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
