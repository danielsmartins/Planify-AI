import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, categories, installments, accounts, creditCards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractFinancialData, extractInvoiceTransactions } from "@/lib/gemini";
import { sendTelegramMessage, answerCallbackQuery } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  let chatId: string | undefined = undefined;

  try {
    const body = await req.json();
    console.log("=== WEBHOOK RECEBIDO ===", JSON.stringify(body, null, 2));

    if (body.message?.chat?.id) {
      chatId = body.message.chat.id.toString();
    } else if (body.callback_query?.message?.chat?.id) {
      chatId = body.callback_query.message.chat.id.toString();
    }

    if (!chatId) {
      return NextResponse.json({ status: "Ignored" });
    }

    // Lidar com cliques nos botões (callback_query)
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const callbackData = callbackQuery.data; // ex: confirm_123, cancel_123, confirm_inst_123
      
      try {
        if (callbackData.startsWith('confirm_inst_')) {
          const rest = callbackData.replace('confirm_inst_', '');
          
          if (rest.includes('_card_')) {
            const parts = rest.split('_card_');
            const instId = parts[0];
            const cardId = parts[1];
            
            await db.update(installments).set({ creditCardId: cardId }).where(eq(installments.id, instId));
            await db.update(transactions).set({ status: 'confirmed', creditCardId: cardId, accountId: null }).where(eq(transactions.installmentId, instId));
            await sendTelegramMessage(chatId, "✅ Compra parcelada no cartão confirmada com sucesso!");
          } else if (rest.includes('_acc_')) {
            const parts = rest.split('_acc_');
            const instId = parts[0];
            const accountId = parts[1];
            
            await db.update(installments).set({ creditCardId: null }).where(eq(installments.id, instId));
            await db.update(transactions).set({ status: 'confirmed', accountId: accountId, creditCardId: null }).where(eq(transactions.installmentId, instId));
            
            // Debitar a primeira parcela do saldo
            const currentTx = await db.select().from(transactions)
              .where(eq(transactions.installmentId, instId))
              .orderBy(transactions.createdAt);
            
            if (currentTx.length > 0) {
              const accRes = await db.select().from(accounts).where(eq(accounts.id, accountId));
              if (accRes.length > 0) {
                const acc = accRes[0];
                const currentBalance = parseFloat(acc.balance);
                const val = parseFloat(currentTx[0].amount);
                const newBalance = currentBalance - val;
                await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, accountId));
              }
            }
            await sendTelegramMessage(chatId, "✅ Compra parcelada na conta confirmada com sucesso!");
          } else {
            // Fallback antigo
            const instId = rest;
            await db.update(transactions).set({ status: 'confirmed' }).where(eq(transactions.installmentId, instId));
            await sendTelegramMessage(chatId, "✅ Compra parcelada confirmada com sucesso!");
          }

        } else if (callbackData.startsWith('cancel_inst_')) {
          const instId = callbackData.replace('cancel_inst_', '');
          await db.delete(transactions).where(eq(transactions.installmentId, instId));
          await db.delete(installments).where(eq(installments.id, instId));
          await sendTelegramMessage(chatId, "❌ Compra parcelada cancelada.");

        } else if (callbackData.startsWith('confirm_')) {
          const rest = callbackData.replace('confirm_', '');
          
          if (rest.includes('_card_')) {
            const parts = rest.split('_card_');
            const txId = parts[0];
            const cardId = parts[1];

            await db.update(transactions).set({ 
              status: 'confirmed', 
              creditCardId: cardId, 
              accountId: null 
            }).where(eq(transactions.id, txId));

            await sendTelegramMessage(chatId, "✅ Transação confirmada no cartão com sucesso!");
          } else if (rest.includes('_acc_')) {
            const parts = rest.split('_acc_');
            const txId = parts[0];
            const accountId = parts[1];

            const txRes = await db.select().from(transactions).where(eq(transactions.id, txId));
            if (txRes.length > 0 && txRes[0].status === 'pending') {
              const tx = txRes[0];
              const accRes = await db.select().from(accounts).where(eq(accounts.id, accountId));
              if (accRes.length > 0) {
                const acc = accRes[0];
                const currentBalance = parseFloat(acc.balance);
                const val = parseFloat(tx.amount);
                const newBalance = tx.type === 'income' ? currentBalance + val : currentBalance - val;
                await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, accountId));
              }
              await db.update(transactions).set({ 
                status: 'confirmed', 
                accountId: accountId, 
                creditCardId: null 
              }).where(eq(transactions.id, txId));
              await sendTelegramMessage(chatId, "✅ Transação confirmada na conta com sucesso!");
            } else {
              await sendTelegramMessage(chatId, "⚠️ Transação já processada ou não encontrada.");
            }
          } else {
            // Fallback antigo
            const txId = rest;
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
          }

        } else if (callbackData.startsWith('cancel_')) {
          const txId = callbackData.split('_')[1];
          await db.delete(transactions).where(eq(transactions.id, txId));
          await sendTelegramMessage(chatId, "❌ Transação cancelada.");

        } else if (callbackData.startsWith('import_pdf_')) {
          const cardId = callbackData.replace('import_pdf_', '');
          const replyTo = callbackQuery.message.reply_to_message;
          
          if (!replyTo || !replyTo.document) {
            await sendTelegramMessage(chatId, "⚠️ Erro: Não foi possível localizar a fatura PDF original. Por favor, envie o arquivo novamente.");
            await answerCallbackQuery(callbackQuery.id);
            return NextResponse.json({ status: "Original PDF not found" });
          }

          const doc = replyTo.document;
          const fileId = doc.file_id;

          const userRes = await db.select().from(users).where(eq(users.telegramChatId, chatId));
          const user = userRes[0];
          if (!user) {
            await sendTelegramMessage(chatId, "🔒 Usuário não encontrado ou não conectado.");
            await answerCallbackQuery(callbackQuery.id);
            return NextResponse.json({ status: "User not found" });
          }

          await sendTelegramMessage(chatId, "⏳ Baixando e processando sua fatura PDF...");

          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
          const fileInfo = await fileInfoRes.json();
          
          if (!fileInfo.ok || !fileInfo.result.file_path) {
            await sendTelegramMessage(chatId, "⚠️ Erro ao obter informações do arquivo no Telegram.");
            await answerCallbackQuery(callbackQuery.id);
            return NextResponse.json({ status: "Error getting file path" });
          }

          const filePath = fileInfo.result.file_path;
          const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
          const arrayBuffer = await fileRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const pdfParseModule = await import('pdf-parse');
          const pdfParse = pdfParseModule.default || pdfParseModule;
          const pdfData = await pdfParse(buffer);
          const text = pdfData.text;

          if (!text || text.trim().length === 0) {
            await sendTelegramMessage(chatId, "⚠️ Não consegui extrair texto do PDF.");
            await answerCallbackQuery(callbackQuery.id);
            return NextResponse.json({ status: "Empty PDF text" });
          }

          // Calcular data baseada no cartão
          let txDate = new Date();
          const cardRes = await db.select().from(creditCards).where(eq(creditCards.id, cardId));
          let cardName = "Cartão";
          
          if (cardRes.length > 0) {
            const card = cardRes[0];
            cardName = card.name;
            const resultDate = new Date();
            const currentDay = resultDate.getDate();
            if (currentDay >= Number(card.closingDay)) {
              resultDate.setMonth(resultDate.getMonth() + 1);
            }
            resultDate.setDate(Number(card.dueDay));
            txDate = resultDate;
          }

          const referenceDateStr = txDate.toISOString().split('T')[0];

          const userCats = await db.select().from(categories).where(eq(categories.userId, user.id));
          const catNames = userCats.map(c => c.name);

          const extractedData = await extractInvoiceTransactions(text, catNames, referenceDateStr);

          if (extractedData.length === 0) {
            await sendTelegramMessage(chatId, "⚠️ Não foi possível encontrar nenhuma compra na fatura.");
            await answerCallbackQuery(callbackQuery.id);
            return NextResponse.json({ status: "No transactions extracted" });
          }

          const txToInsert = extractedData.map(tx => ({
            userId: user.id,
            amount: tx.amount.toString(),
            description: tx.description,
            category: tx.category,
            type: 'expense' as const,
            creditCardId: cardId,
            createdAt: tx.date ? new Date(tx.date) : txDate,
            status: 'confirmed' as const,
          }));

          await db.insert(transactions).values(txToInsert);

          const summary = extractedData.slice(0, 5).map(tx => {
            const formattedDate = tx.date ? new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
            const dateStr = formattedDate ? `[${formattedDate}] ` : '';
            return `• ${dateStr}R$ ${tx.amount} - ${tx.description} (${tx.category})`;
          }).join('\n');
          
          const restCount = extractedData.length - 5;
          const extraText = restCount > 0 ? `\n• e mais ${restCount} transações...` : '';

          await sendTelegramMessage(
            chatId, 
            `✅ *Importação concluída!*\n\nImportadas *${extractedData.length} compras* para o cartão *${cardName}*:\n\n${summary}${extraText}`
          );

        } else if (callbackData === 'cancel_pdf') {
          await sendTelegramMessage(chatId, "❌ Importação de fatura cancelada.");
        }
      } catch (callbackError) {
        console.error("Callback internal processing error:", callbackError);
        await sendTelegramMessage(chatId, "⚠️ Desculpe, ocorreu um erro ao processar sua ação.");
      }

      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ status: "Callback processed" });
    }

    // As mensagens de texto, voz ou documento vêm dentro de 'message'
    const message = body.message;
    if (!message || (!message.text && !message.voice && !message.document) || !message.chat) {
      return NextResponse.json({ status: "Ignored" });
    }

    // Tratar envio de documentos (como faturas em PDF)
    const isDocument = !!message.document;
    if (isDocument && message.document) {
      const doc = message.document;
      const isPdf = doc.mime_type === "application/pdf" || doc.file_name?.toLowerCase().endsWith(".pdf");
      
      if (!isPdf) {
        await sendTelegramMessage(chatId, "⚠️ Por favor, envie o arquivo de fatura no formato PDF.");
        return NextResponse.json({ status: "Ignored document type" });
      }

      // Procurar o usuário pelo Chat ID do Telegram
      const userRes = await db.select().from(users).where(eq(users.telegramChatId, chatId));
      const user = userRes[0];

      if (!user) {
        await sendTelegramMessage(chatId, "🔒 Você precisa conectar sua conta do Planify AI primeiro! Acesse o site e clique em *Conectar Telegram*.");
        return NextResponse.json({ status: "Not linked" });
      }

      await sendTelegramMessage(chatId, "⏳ Recebi seu arquivo. Baixando e analisando a fatura PDF...");

      const fileId = doc.file_id;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const fileInfo = await fileInfoRes.json();
      
      if (!fileInfo.ok || !fileInfo.result.file_path) {
        await sendTelegramMessage(chatId, "⚠️ Não foi possível obter o arquivo do Telegram. Tente novamente.");
        return NextResponse.json({ status: "Error getting file info" });
      }

      const filePath = fileInfo.result.file_path;
      const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
      const arrayBuffer = await fileRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const pdfParseModule = await import('pdf-parse');
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text;

      if (!text || text.trim().length === 0) {
        await sendTelegramMessage(chatId, "⚠️ Não consegui extrair nenhum texto do PDF. O arquivo pode estar protegido por senha ou conter apenas imagens.");
        return NextResponse.json({ status: "Empty text in PDF" });
      }

      // Buscar categorias do usuário
      const userCats = await db.select().from(categories).where(eq(categories.userId, user.id));
      const catNames = userCats.map(c => c.name);

      // Chamar Gemini para extrair transações da fatura
      const extractedData = await extractInvoiceTransactions(text, catNames);

      if (extractedData.length === 0) {
        await sendTelegramMessage(chatId, "⚠️ Não consegui encontrar nenhuma transação de compras na fatura enviada.");
        return NextResponse.json({ status: "No transactions extracted" });
      }

      // Buscar cartões de crédito do usuário
      const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, user.id));
      
      if (userCards.length === 0) {
        await sendTelegramMessage(chatId, "⚠️ Você não possui cartões de crédito cadastrados. Acesse o site do Planify AI para cadastrar um cartão primeiro.");
        return NextResponse.json({ status: "No credit cards" });
      }

      // Tentar identificar e sugerir o cartão com base no texto do PDF
      let suggestedCardId: string | null = null;
      for (const card of userCards) {
        if (text.toLowerCase().includes(card.name.toLowerCase()) || 
            (card.name.toLowerCase() === 'nubank' && text.toLowerCase().includes('nu '))) {
          suggestedCardId = card.id;
          break;
        }
      }

      // Criar botões para selecionar o cartão
      const inlineKeyboard = [];
      for (const card of userCards) {
        const isSuggested = card.id === suggestedCardId;
        const prefix = isSuggested ? "✨ 💳 " : "💳 ";
        inlineKeyboard.push([
          { text: `${prefix}Importar para: ${card.name}`, callback_data: `import_pdf_${card.id}` }
        ]);
      }
      inlineKeyboard.push([{ text: "❌ Cancelar", callback_data: "cancel_pdf" }]);

      const replyMarkup = { inline_keyboard: inlineKeyboard };

      let suggestionMsg = "";
      if (suggestedCardId) {
        const cardName = userCards.find(c => c.id === suggestedCardId)?.name;
        suggestionMsg = `\n\nSugestão de Cartão: *✨ ${cardName}* (identificado no PDF)`;
      }

      await sendTelegramMessage(
        chatId, 
        `📄 *Fatura PDF analisada!*${suggestionMsg}\n\nEncontrei *${extractedData.length} compras* na fatura.\n\nPara qual cartão de crédito deseja importar estas transações?`,
        replyMarkup,
        message.message_id
      );

      return NextResponse.json({ status: "PDF processed, awaiting card selection" });
    }

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

📄 *Importação de Faturas:*
- Envie a fatura do seu cartão em PDF diretamente pelo chat e eu farei a importação automática das transações para você!

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

    // Determinar sugestão de cartão ou conta
    const { cardId: suggestedCardId, accountId: suggestedAccountId } = getPaymentMethodSuggestion(
      textMessage,
      userCards,
      userAccounts,
      extractedData.paymentMethodSuggestion,
      extractedData.isInstallment
    );

    // Se for uma compra parcelada
    if (extractedData.isInstallment && extractedData.installmentsCount) {
      const defaultCardId = suggestedCardId || (userCards.length > 0 ? userCards[0].id : null);
      
      if (!defaultCardId && userAccounts.length === 0) {
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
        creditCardId: defaultCardId || null,
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
          creditCardId: defaultCardId || null,
          accountId: defaultCardId ? null : userAccounts[0].id,
          createdAt: txDate,
          status: 'pending' as const,
        });
      }

      if (txValues.length > 0) {
        await db.insert(transactions).values(txValues);
      }

      const inlineKeyboard = [];
      
      for (const card of userCards) {
        const isSuggested = card.id === defaultCardId;
        const prefix = isSuggested ? "✨ 💳 " : "💳 ";
        inlineKeyboard.push([
          { text: `${prefix}${card.name}`, callback_data: `confirm_inst_${newInst.id}_card_${card.id}` }
        ]);
      }

      for (const acc of userAccounts) {
        const isSuggested = acc.id === suggestedAccountId;
        const prefix = isSuggested ? "✨ 🏦 " : "🏦 ";
        inlineKeyboard.push([
          { text: `${prefix}${acc.name}`, callback_data: `confirm_inst_${newInst.id}_acc_${acc.id}` }
        ]);
      }

      inlineKeyboard.push([{ text: "❌ Cancelar", callback_data: `cancel_inst_${newInst.id}` }]);

      const replyMarkup = { inline_keyboard: inlineKeyboard };

      let suggestionText = "";
      if (defaultCardId) {
        const cardName = userCards.find(c => c.id === defaultCardId)?.name;
        suggestionText = `\nSugestão de Cartão: *💳 ${cardName}*`;
      }

      await sendTelegramMessage(
        chatId, 
        `💳 *Revisão de Compra Parcelada*\n\nDescrição: *${extractedData.description}*\nValor da Parcela: *R$ ${installmentAmount}*\nParcelas: *${installmentsCount}x*\nTotal: *R$ ${totalAmount}*\nCategoria: *${extractedData.category}*${suggestionText}\n\nSelecione onde foi feito o parcelamento para confirmar:`, 
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
      accountId: suggestedAccountId,
      creditCardId: suggestedCardId,
      status: 'pending',
    }).returning();

    const tipo = extractedData.type === 'income' ? 'Entrada' : 'Saída';
    const icone = extractedData.type === 'income' ? '✅' : '💸';

    const inlineKeyboard = [];

    if (extractedData.type === 'expense') {
      for (const card of userCards) {
        const isSuggested = card.id === suggestedCardId;
        const prefix = isSuggested ? "✨ 💳 " : "💳 ";
        inlineKeyboard.push([
          { text: `${prefix}${card.name}`, callback_data: `confirm_${newTx.id}_card_${card.id}` }
        ]);
      }
      
      for (const acc of userAccounts) {
        const isSuggested = acc.id === suggestedAccountId;
        const prefix = isSuggested ? "✨ 🏦 " : "🏦 ";
        inlineKeyboard.push([
          { text: `${prefix}${acc.name}`, callback_data: `confirm_${newTx.id}_acc_${acc.id}` }
        ]);
      }
    } else {
      for (const acc of userAccounts) {
        const isSuggested = acc.id === suggestedAccountId;
        const prefix = isSuggested ? "✨ 🏦 " : "🏦 ";
        inlineKeyboard.push([
          { text: `${prefix}${acc.name}`, callback_data: `confirm_${newTx.id}_acc_${acc.id}` }
        ]);
      }
    }

    inlineKeyboard.push([{ text: "❌ Cancelar", callback_data: `cancel_${newTx.id}` }]);

    const replyMarkup = { inline_keyboard: inlineKeyboard };

    let suggestionText = "";
    if (extractedData.type === 'expense' && suggestedCardId) {
      const cardName = userCards.find(c => c.id === suggestedCardId)?.name;
      suggestionText = `\nSugestão de Pagamento: *💳 ${cardName}*`;
    } else if (suggestedAccountId) {
      const accName = userAccounts.find(a => a.id === suggestedAccountId)?.name;
      suggestionText = `\nSugestão de Conta: *🏦 ${accName}*`;
    }

    await sendTelegramMessage(
      chatId, 
      `${icone} *Revisão de Transação*\n\nTipo: *${tipo}*\nDescrição: *${extractedData.description}*\nValor: *R$ ${extractedData.amount}*\nCategoria: *${extractedData.category}*${suggestionText}\n\nSelecione onde foi feito o pagamento/recebimento para confirmar:`, 
      replyMarkup
    );

    return NextResponse.json({ status: "Success awaiting selection" });

  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    if (chatId) {
      try {
        await sendTelegramMessage(chatId, "⚠️ Desculpe, ocorreu um erro inesperado ao processar sua solicitação.");
      } catch (sendError) {
        console.error("Failed to send error message to Telegram:", sendError);
      }
    }
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export function getPaymentMethodSuggestion(
  textMessage: string,
  userCards: { id: string; name: string }[],
  userAccounts: { id: string; name: string }[],
  aiSuggestion?: string,
  isInstallment?: boolean
): { cardId: string | null; accountId: string | null } {
  let suggestedCardId: string | null = null;
  let suggestedAccountId: string | null = null;

  if (aiSuggestion) {
    const suggestionLower = aiSuggestion.toLowerCase();
    for (const card of userCards) {
      if (suggestionLower.includes(card.name.toLowerCase()) || card.name.toLowerCase().includes(suggestionLower)) {
        suggestedCardId = card.id;
        break;
      }
    }
    if (!suggestedCardId) {
      for (const acc of userAccounts) {
        if (suggestionLower.includes(acc.name.toLowerCase()) || acc.name.toLowerCase().includes(suggestionLower)) {
          suggestedAccountId = acc.id;
          break;
        }
      }
    }
  }

  if (!suggestedCardId && !suggestedAccountId) {
    const targetText = textMessage.toLowerCase();
    for (const card of userCards) {
      if (targetText.includes(card.name.toLowerCase())) {
        suggestedCardId = card.id;
        break;
      }
    }
    if (!suggestedCardId) {
      for (const acc of userAccounts) {
        if (targetText.includes(acc.name.toLowerCase())) {
          suggestedAccountId = acc.id;
          break;
        }
      }
    }
  }

  if (!suggestedCardId && !suggestedAccountId) {
    const isCredit = textMessage.toLowerCase().includes('crédito') || textMessage.toLowerCase().includes('cartão') || !!isInstallment;
    if (isCredit && userCards.length > 0) {
      suggestedCardId = userCards[0].id;
    } else if (userAccounts.length > 0) {
      suggestedAccountId = userAccounts[0].id;
    } else if (userCards.length > 0) {
      suggestedCardId = userCards[0].id;
    }
  }

  return { cardId: suggestedCardId, accountId: suggestedAccountId };
}
