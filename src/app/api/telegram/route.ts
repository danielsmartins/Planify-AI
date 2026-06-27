import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, categories, installments } from "@/db/schema";
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
      const callbackData = callbackQuery.data; // ex: confirm_123, cancel_123, confirm_inst_123
      const chatId = callbackQuery.message.chat.id.toString();

      if (callbackData.startsWith('confirm_inst_')) {
        const instId = callbackData.replace('confirm_inst_', '');
        await db.update(transactions).set({ status: 'confirmed' }).where(eq(transactions.installmentId, instId));
        await sendTelegramMessage(chatId, "✅ Compra parcelada confirmada com sucesso!");
      } else if (callbackData.startsWith('cancel_inst_')) {
        const instId = callbackData.replace('cancel_inst_', '');
        await db.delete(transactions).where(eq(transactions.installmentId, instId));
        await db.delete(installments).where(eq(installments.id, instId));
        await sendTelegramMessage(chatId, "❌ Compra parcelada cancelada.");
      } else if (callbackData.startsWith('confirm_')) {
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

    // Comando /help
    if (textMessage.toLowerCase().startsWith("/help")) {
      const helpMsg = `
🤖 *Planify AI - Ajuda*

Você pode registrar despesas, ganhos e até compras parceladas apenas me mandando mensagens! Veja alguns exemplos:

💸 *Despesas:*
- "Gastei 25 reais de Uber"
- "Almocei no restaurante, deu R$ 45,90"

💰 *Ganhos:*
- "Recebi 5000 do meu salário"
- "Vendi uma bicicleta por 300 reais"

💳 *Compras Parceladas:*
- "Comprei uma geladeira de 3000 em 10 vezes no crédito"
- "Passei uma viagem de 1500 em 5x, já paguei a primeira parcela"

O bot irá entender, categorizar automaticamente e pedir para você confirmar antes de salvar!
      `;
      await sendTelegramMessage(chatId, helpMsg);
      return NextResponse.json({ status: "Help" });
    }

    // Comando de /start para vincular a conta
    if (textMessage.startsWith("/start")) {
      const parts = textMessage.split(" ");
      if (parts.length > 1) {
        const userId = parts[1];
        try {
          // Atualiza o usuário com o telegramChatId
          await db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, userId));
          await sendTelegramMessage(chatId, "🎉 *Conta vinculada com sucesso!*\n\nAgora você pode me enviar seus gastos ou ganhos diretamente por aqui.\n\nExemplo: `Comprei pão por 15 reais no débito`\n\nDigite /help para ver mais exemplos.");
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

    // Procurar o usuário pelo Chat ID do Telegram
    const userRes = await db.select().from(users).where(eq(users.telegramChatId, chatId));
    const user = userRes[0];

    if (!user) {
      await sendTelegramMessage(chatId, "🔒 Você precisa conectar sua conta do Planify AI primeiro! Acesse o site e clique em *Conectar Telegram*.");
      return NextResponse.json({ status: "Not linked" });
    }

    // Extrair dados via IA (Gemini)
    await sendTelegramMessage(chatId, "⏳ Analisando sua mensagem...");
    
    const userCategoriesObj = await db.select().from(categories).where(eq(categories.userId, user.id));
    const userCategories = userCategoriesObj.map(c => c.name);

    let extractedData;
    try {
      extractedData = await extractFinancialData(textMessage, userCategories);
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

    // Se a IA criou uma categoria nova, salvamos no banco!
    if (!userCategories.includes(extractedData.category) && extractedData.type === 'expense') {
      const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      await db.insert(categories).values({
        userId: user.id,
        name: extractedData.category,
        color: randomColor,
        monthlyLimit: '0'
      });
    }

    // Se for uma compra parcelada
    if (extractedData.isInstallment && extractedData.installmentsCount) {
      const installmentsCount = extractedData.installmentsCount;
      const currentInst = extractedData.currentInstallment || 1;
      const installmentAmount = extractedData.amount;
      const totalAmount = installmentAmount * installmentsCount;

      const [newInst] = await db.insert(installments).values({
        userId: user.id,
        description: extractedData.description,
        category: extractedData.category,
        totalAmount: totalAmount.toString(),
        installmentsCount: installmentsCount.toString(),
      }).returning();

      const txValues = [];
      const now = new Date();
      for (let i = currentInst; i <= installmentsCount; i++) {
        const txDate = new Date(now);
        txDate.setMonth(now.getMonth() + (i - currentInst));
        txValues.push({
          userId: user.id,
          amount: installmentAmount.toString(),
          description: `${extractedData.description} (${i}/${installmentsCount})`,
          category: extractedData.category,
          type: 'expense' as const,
          installmentId: newInst.id,
          createdAt: txDate,
          status: 'pending' as const,
        });
      }

      if (txValues.length > 0) {
        await db.insert(transactions).values(txValues);
      }

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "✅ Confirmar", callback_data: `confirm_inst_${newInst.id}` },
            { text: "❌ Cancelar", callback_data: `cancel_inst_${newInst.id}` }
          ]
        ]
      };

      await sendTelegramMessage(
        chatId, 
        `💳 *Revisão de Compra Parcelada*\n\nDescrição: *${extractedData.description}*\nValor da Parcela: *R$ ${installmentAmount}*\nParcelas: *${installmentsCount}x*\nTotal: *R$ ${totalAmount}*\nCategoria: *${extractedData.category}*\n\nVocê confirma este parcelamento?`, 
        replyMarkup
      );
      
      return NextResponse.json({ status: "Success Installment" });
    }

    // Se for transação normal (não parcelada)
    const [newTx] = await db.insert(transactions).values({
      userId: user.id,
      amount: extractedData.amount.toString(),
      description: extractedData.description,
      category: extractedData.category,
      type: extractedData.type as "income" | "expense",
      status: 'pending', // Fica aguardando confirmação
    }).returning();

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
