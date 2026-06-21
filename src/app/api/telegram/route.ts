import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractFinancialData } from "@/lib/gemini";
import { sendTelegramMessage, answerCallbackQuery } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("=== WEBHOOK RECEBIDO ===", JSON.stringify(body, null, 2));

    // Lidar com cliques nos botões (callback_query)
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const callbackData = callbackQuery.data; // ex: confirm_123, cancel_123
      const chatId = callbackQuery.message.chat.id.toString();

      if (callbackData.startsWith('confirm_')) {
        const txId = callbackData.split('_')[1];
        await db.update(transactions).set({ status: 'confirmed' }).where(eq(transactions.id, txId));
        await sendTelegramMessage(chatId, "✅ Transação confirmada e salva com sucesso!");
      } else if (callbackData.startsWith('cancel_')) {
        const txId = callbackData.split('_')[1];
        await db.delete(transactions).where(eq(transactions.id, txId));
        await sendTelegramMessage(chatId, "❌ Transação cancelada.");
      }

      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ status: "Callback processed" });
    }

    // As mensagens de texto vêm dentro de 'message'
    const message = body.message;
    if (!message || !message.text || !message.chat) {
      return NextResponse.json({ status: "Ignored" });
    }

    const chatId = message.chat.id.toString();
    const textMessage = message.text.trim();

    // 1. Comando de /start para vincular a conta
    // O usuário clica no botão do site: t.me/bot?start=USER_ID
    if (textMessage.startsWith("/start")) {
      const parts = textMessage.split(" ");
      if (parts.length > 1) {
        const userId = parts[1];
        try {
          // Atualiza o usuário com o telegramChatId
          await db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, userId));
          await sendTelegramMessage(chatId, "🎉 *Conta vinculada com sucesso!*\n\nAgora você pode me enviar seus gastos ou ganhos diretamente por aqui.\n\nExemplo: `Comprei pão por 15 reais no débito`");
          return NextResponse.json({ status: "Linked" });
        } catch {
          await sendTelegramMessage(chatId, "❌ Erro ao vincular sua conta. Tente novamente pelo site.");
          return NextResponse.json({ status: "Error linking" });
        }
      } else {
        await sendTelegramMessage(chatId, "👋 Olá! Para começar, acesse o painel web do Planify AI e clique em *Conectar Telegram*.");
        return NextResponse.json({ status: "Welcome" });
      }
    }

    // 2. Procurar o usuário pelo Chat ID do Telegram
    const userRes = await db.select().from(users).where(eq(users.telegramChatId, chatId));
    const user = userRes[0];

    if (!user) {
      await sendTelegramMessage(chatId, "🔒 Você precisa conectar sua conta do Planify AI primeiro! Acesse o site e clique em *Conectar Telegram*.");
      return NextResponse.json({ status: "Not linked" });
    }

    // 3. Extrair dados via IA (Gemini)
    await sendTelegramMessage(chatId, "⏳ Analisando sua mensagem...");
    
    let extractedData;
    try {
      extractedData = await extractFinancialData(textMessage);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'RATE_LIMIT') {
          await sendTelegramMessage(chatId, "⚠️ *Alerta*: Limite grátis de Inteligência Artificial atingido! A cota expirou por enquanto. Tente novamente mais tarde.");
          return NextResponse.json({ status: "Rate limited" });
      }
      throw e;
    }

    if (!extractedData) {
      await sendTelegramMessage(chatId, "🤔 Não consegui identificar um gasto ou ganho nessa mensagem. Pode tentar escrever de outra forma?\n\nExemplo: `Uber 25 reais`");
      return NextResponse.json({ status: "Ignored text" });
    }

    // 4. Salvar no banco (Drizzle) como 'pending'
    const [newTx] = await db.insert(transactions).values({
      userId: user.id,
      amount: extractedData.amount.toString(),
      description: extractedData.description,
      category: extractedData.category,
      type: extractedData.type as "income" | "expense",
      status: 'pending', // Fica aguardando confirmação
    }).returning();

    // 5. Feedback final com botões
    const tipo = extractedData.type === 'income' ? 'Entrada' : 'Saída';
    const icone = extractedData.type === 'income' ? '✅' : '💸';
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "✅ Confirmar", callback_data: `confirm_${newTx.id}` },
          { text: "❌ Cancelar", callback_data: `cancel_${newTx.id}` }
        ]
      ]
    };

    await sendTelegramMessage(chatId, `${icone} *Revisão de Transação*\n\nTipo: *${tipo}*\nDescrição: *${extractedData.description}*\nValor: *R$ ${extractedData.amount}*\nCategoria: *${extractedData.category}*\n\nVocê confirma esta transação?`, replyMarkup);

    return NextResponse.json({ status: "Success" });

  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
