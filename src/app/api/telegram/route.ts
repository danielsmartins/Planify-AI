import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, categories, installments, accounts, creditCards } from "@/db/schema";
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
        const txRes = await db.select().from(transactions).where(eq(transactions.id, txId));
        if (txRes.length > 0 && txRes[0].status === 'pending') {
          const tx = txRes[0];
          if (tx.accountId) {
            const accRes = await db.select().from(accounts).where(eq(accounts.id, tx.accountId));
            if (accRes.length > 0) {
              const acc = accRes[0];
              const currentBalance = parseFloat(acc.balance);
              const val = parseFloat(tx.amount);
              const newBalance = tx.type === 'income' ? currentBalance + val : currentBalance - val;
              await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, tx.accountId));
            }
          }
          await db.update(transactions).set({ status: 'confirmed' }).where(eq(transactions.id, txId));
          await sendTelegramMessage(chatId, "✅ Transação confirmada e salva com sucesso!");
        } else {
          await sendTelegramMessage(chatId, "⚠️ Transação já processada ou não encontrada.");
        }
      } else if (callbackData.startsWith('cancel_')) {
        const txId = callbackData.split('_')[1];
        await db.delete(transactions).where(eq(transactions.id, txId));
        await sendTelegramMessage(chatId, "❌ Transação cancelada.");
      }

      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ status: "Callback processed" });
    }

    // As mensagens de texto ou voz vêm dentro de 'message'
    const message = body.message;
    if (!message || (!message.text && !message.voice) || !message.chat) {
      return NextResponse.json({ status: "Ignored" });
    }

    const chatId = message.chat.id.toString();
    const textMessage = message.text ? message.text.trim() : "";
    let audioData: { base64: string; mimeType: string } | undefined = undefined;

    // Se for mensagem de voz, baixamos do Telegram
    if (message.voice) {
      try {
        const voice = message.voice;
        const fileId = voice.file_id;
        const mimeType = voice.mime_type || "audio/ogg";
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        
        const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileInfo = await fileInfoRes.json();
        
        if (fileInfo.ok && fileInfo.result.file_path) {
          const filePath = fileInfo.result.file_path;
          const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
          const arrayBuffer = await fileRes.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          audioData = { base64, mimeType };
        }
      } catch (voiceError) {
        console.error("Erro ao processar mensagem de voz do Telegram:", voiceError);
        await sendTelegramMessage(chatId, "⚠️ Erro ao tentar processar o áudio. Tente enviar como texto.");
        return NextResponse.json({ status: "Error processing voice" });
      }
    }

    // Comando /help
    if (textMessage && textMessage.toLowerCase().startsWith("/help")) {
      const helpMsg = `
🤖 *Planify AI - Ajuda*

Você pode registrar despesas, ganhos e até compras parceladas apenas me mandando mensagens de texto ou voz! Veja alguns exemplos:

💸 *Despesas:*
- "Gastei 25 reais de Uber"
- Enviar áudio: "Almocei no restaurante, deu R$ 45,90"

💰 *Ganhos:*
- "Recebi 5000 do meu salário"
- Enviar áudio: "Vendi uma bicicleta por 300 reais"

💳 *Compras Parceladas:*
- "Comprei uma geladeira de 3000 em 10 vezes no crédito"

O bot irá entender, categorizar automaticamente e pedir para você confirmar antes de salvar!
      `;
      await sendTelegramMessage(chatId, helpMsg);
      return NextResponse.json({ status: "Help" });
    }

    // Comando de /start para vincular a conta
    if (textMessage && textMessage.startsWith("/start")) {
      const parts = textMessage.split(" ");
      if (parts.length > 1) {
        const userId = parts[1];
        try {
          // Atualiza o usuário com o telegramChatId
          await db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, userId));
          await sendTelegramMessage(chatId, "🎉 *Conta vinculada com sucesso!*\n\nAgora você pode me enviar seus gastos ou ganhos diretamente por aqui, digitando ou por áudio.\n\nExemplo: `Comprei pão por 15 reais no débito`\n\nDigite /help para ver mais exemplos.");
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
    await sendTelegramMessage(chatId, message.voice ? "⏳ Escutando e analisando seu áudio..." : "⏳ Analisando sua mensagem...");
    
    const userCategoriesObj = await db.select().from(categories).where(eq(categories.userId, user.id));
    const userCategories = userCategoriesObj.map(c => c.name);

    let extractedData;
    try {
      extractedData = await extractFinancialData(textMessage, userCategories, audioData);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'RATE_LIMIT') {
          await sendTelegramMessage(chatId, "⚠️ *Alerta*: Limite grátis de Inteligência Artificial atingido! A cota expirou por enquanto. Tente novamente mais tarde.");
          return NextResponse.json({ status: "Rate limited" });
      }
      throw e;
    }

    if (!extractedData) {
      await sendTelegramMessage(chatId, message.voice ? "🤔 Não consegui identificar um gasto ou ganho no seu áudio. Pode tentar falar mais claro ou mandar como texto?" : "🤔 Não consegui identificar um gasto ou ganho nessa mensagem. Pode tentar escrever de outra forma?\n\nExemplo: `Uber 25 reais`");
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

    // Buscar contas e cartões do usuário para vincular à transação
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, user.id));
    const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, user.id));

    // Se for uma compra parcelada
    if (extractedData.isInstallment && extractedData.installmentsCount) {
      // Parcelamento deve estar atrelado a um cartão ou conta
      const creditCardId: string | null = userCards.length > 0 ? userCards[0].id : null;
      let accountId: string | null = null;
      
      if (!creditCardId && userAccounts.length > 0) {
        accountId = userAccounts[0].id;
      }
      
      if (!creditCardId && !accountId) {
        await sendTelegramMessage(chatId, "⚠️ Você precisa cadastrar pelo menos uma conta ou cartão no site do Planify AI antes de registrar parcelamentos.");
        return NextResponse.json({ status: "No accounts or cards" });
      }

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
        creditCardId: creditCardId || null,
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
          creditCardId: creditCardId || null,
          accountId: accountId || null,
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
    let accountId: string | null = null;
    let creditCardId: string | null = null;

    if (extractedData.type === 'income') {
      if (userAccounts.length === 0) {
        await sendTelegramMessage(chatId, "⚠️ Você precisa ter pelo menos uma conta cadastrada no Planify AI para registrar receitas (ganhos).");
        return NextResponse.json({ status: "No accounts for income" });
      }
      accountId = userAccounts[0].id;
    } else {
      // É despesa
      const isCredit = textMessage.toLowerCase().includes('crédito') || textMessage.toLowerCase().includes('cartão');
      if (isCredit && userCards.length > 0) {
        creditCardId = userCards[0].id;
      } else if (userAccounts.length > 0) {
        accountId = userAccounts[0].id;
      } else if (userCards.length > 0) {
        creditCardId = userCards[0].id;
      } else {
        await sendTelegramMessage(chatId, "⚠️ Você precisa cadastrar pelo menos uma conta ou cartão no site do Planify AI antes de registrar despesas.");
        return NextResponse.json({ status: "No accounts or cards for expense" });
      }
    }

    const [newTx] = await db.insert(transactions).values({
      userId: user.id,
      amount: extractedData.amount.toString(),
      description: extractedData.description,
      category: extractedData.category,
      type: extractedData.type as "income" | "expense",
      accountId,
      creditCardId,
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
