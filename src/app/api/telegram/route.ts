import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, categories, installments, accounts, creditCards } from "@/db/schema";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { extractFinancialData, extractInvoiceTransactions } from "@/lib/gemini";
import { sendTelegramMessage, answerCallbackQuery } from "@/lib/telegram";
import { getPaymentMethodSuggestion } from "@/lib/telegram-utils";
import { rateLimit } from "@/lib/rate-limit";

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
  // Apply Rate Limiting (max 60 requests per minute from Telegram)
  const limiter = await rateLimit(60, 60000);
  if (!limiter.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let chatId: string | undefined = undefined;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || req.nextUrl.origin || 'http://localhost:3000';

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
          // rest: ${instId}_c${index} ou ${instId}_a${index} ou ${instId} (fallback)
          const parts = rest.split('_');
          const instId = parts[0];
          const typeAndIndex = parts[1]; // c0, a1, etc.
          
          const instRes = await db.select().from(installments).where(eq(installments.id, instId));
          if (instRes.length > 0) {
            const inst = instRes[0];
            const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, inst.userId));
            const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, inst.userId));
            
            if (typeAndIndex && typeAndIndex.startsWith('c')) {
              const index = parseInt(typeAndIndex.substring(1));
              const card = userCards[index];
              if (card) {
                await db.update(installments).set({ creditCardId: card.id }).where(eq(installments.id, instId));
                await db.update(transactions).set({ status: 'confirmed', creditCardId: card.id, accountId: null }).where(eq(transactions.installmentId, instId));
                await sendTelegramMessage(chatId, `✅ Compra parcelada no cartão *${card.name}* confirmada com sucesso!\n\n📊 [Ver no Dashboard](${appUrl})`);
              } else {
                await sendTelegramMessage(chatId, "⚠️ Cartão selecionado não encontrado.");
              }
            } else if (typeAndIndex && typeAndIndex.startsWith('a')) {
              const index = parseInt(typeAndIndex.substring(1));
              const acc = userAccounts[index];
              if (acc) {
                await db.update(installments).set({ creditCardId: null }).where(eq(installments.id, instId));
                await db.update(transactions).set({ status: 'confirmed', accountId: acc.id, creditCardId: null }).where(eq(transactions.installmentId, instId));
                
                // Debitar a primeira parcela do saldo
                const currentTx = await db.select().from(transactions)
                  .where(eq(transactions.installmentId, instId))
                  .orderBy(transactions.createdAt);
                
                if (currentTx.length > 0) {
                  const currentBalance = parseFloat(acc.balance);
                  const val = parseFloat(currentTx[0].amount);
                  const newBalance = currentBalance - val;
                  await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, acc.id));
                }
                await sendTelegramMessage(chatId, `✅ Compra parcelada na conta *${acc.name}* confirmada com sucesso!\n\n📊 [Ver no Dashboard](${appUrl})`);
              } else {
                await sendTelegramMessage(chatId, "⚠️ Conta selecionada não encontrada.");
              }
            } else {
              // Fallback antigo
              await db.update(transactions).set({ status: 'confirmed' }).where(eq(transactions.installmentId, instId));
              await sendTelegramMessage(chatId, `✅ Compra parcelada confirmada com sucesso!\n\n📊 [Ver no Dashboard](${appUrl})`);
            }
          } else {
            await sendTelegramMessage(chatId, "⚠️ Compra parcelada não encontrada.");
          }

        } else if (callbackData.startsWith('cancel_inst_')) {
          const instId = callbackData.replace('cancel_inst_', '');
          await db.delete(transactions).where(eq(transactions.installmentId, instId));
          await db.delete(installments).where(eq(installments.id, instId));
          await sendTelegramMessage(chatId, "❌ Compra parcelada cancelada.");

        } else if (callbackData.startsWith('confirm_')) {
          const rest = callbackData.replace('confirm_', '');
          // rest: ${txId}_c${index} ou ${txId}_a${index} ou ${txId} (fallback)
          const parts = rest.split('_');
          const txId = parts[0];
          const typeAndIndex = parts[1]; // c0, a1, etc.

          const txRes = await db.select().from(transactions).where(eq(transactions.id, txId));
          if (txRes.length > 0 && txRes[0].status === 'pending') {
            const tx = txRes[0];
            const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, tx.userId));
            const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, tx.userId));

            if (typeAndIndex && typeAndIndex.startsWith('c')) {
              const index = parseInt(typeAndIndex.substring(1));
              const card = userCards[index];
              if (card) {
                await db.update(transactions).set({ 
                  status: 'confirmed', 
                  creditCardId: card.id, 
                  accountId: null 
                }).where(eq(transactions.id, txId));
                await sendTelegramMessage(chatId, `✅ Transação confirmada no cartão *${card.name}* com sucesso!\n\n📊 [Ver no Dashboard](${appUrl})`);
              } else {
                await sendTelegramMessage(chatId, "⚠️ Cartão selecionado não encontrado.");
              }
            } else if (typeAndIndex && typeAndIndex.startsWith('a')) {
              const index = parseInt(typeAndIndex.substring(1));
              const acc = userAccounts[index];
              if (acc) {
                const currentBalance = parseFloat(acc.balance);
                const val = parseFloat(tx.amount);
                const newBalance = tx.type === 'income' ? currentBalance + val : currentBalance - val;
                await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, acc.id));

                await db.update(transactions).set({ 
                  status: 'confirmed', 
                  accountId: acc.id, 
                  creditCardId: null 
                }).where(eq(transactions.id, txId));
                await sendTelegramMessage(chatId, `✅ Transação confirmada na conta *${acc.name}* com sucesso!\n\n📊 [Ver no Dashboard](${appUrl})`);
              } else {
                await sendTelegramMessage(chatId, "⚠️ Conta selecionada não encontrada.");
              }
            } else {
              // Fallback antigo
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
              await sendTelegramMessage(chatId, `✅ Transação confirmada e salva com sucesso!\n\n📊 [Ver no Dashboard](${appUrl})`);
            }
          } else {
            await sendTelegramMessage(chatId, "⚠️ Transação já processada ou não encontrada.");
          }

        } else if (callbackData.startsWith('cancel_')) {
          const txId = callbackData.split('_')[1];
          await db.delete(transactions).where(eq(transactions.id, txId));
          await sendTelegramMessage(chatId, "❌ Transação cancelada.");

        } else if (callbackData.startsWith('import_pdf_')) {
          const rest = callbackData.replace('import_pdf_', '');
          // rest: c${cardIndex}_${importGroupId}
          const parts = rest.split('_');
          const cardPart = parts[0]; // c0, c1, etc.
          const importGroupId = parts[1];

          const userRes = await db.select().from(users).where(eq(users.telegramChatId, chatId));
          const user = userRes[0];
          if (!user) {
            await sendTelegramMessage(chatId, "🔒 Usuário não encontrado ou não conectado.");
            await answerCallbackQuery(callbackQuery.id);
            return NextResponse.json({ status: "User not found" });
          }

          const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, user.id));
          const cardIndex = parseInt(cardPart.substring(1));
          const card = userCards[cardIndex];

          if (!card) {
            await sendTelegramMessage(chatId, "⚠️ Cartão selecionado não encontrado.");
            await answerCallbackQuery(callbackQuery.id);
            return NextResponse.json({ status: "Card not found" });
          }

          // Confirmar todas as transações pendentes deste grupo
          const txs = await db.select().from(transactions).where(eq(transactions.installmentId, importGroupId));
          
          if (txs.length === 0) {
            await sendTelegramMessage(chatId, "⚠️ Nenhuma transação pendente encontrada para esta importação. O processo pode ter expirado ou sido cancelado.");
            await answerCallbackQuery(callbackQuery.id);
            return NextResponse.json({ status: "No pending txs found" });
          }

          await db.update(transactions).set({
            status: 'confirmed',
            creditCardId: card.id,
            installmentId: null // Limpar o agrupador
          }).where(eq(transactions.installmentId, importGroupId));

          const summary = txs.slice(0, 5).map(tx => {
            const formattedDate = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
            const dateStr = formattedDate ? `[${formattedDate}] ` : '';
            return `• ${dateStr}R$ ${tx.amount} - ${tx.description} (${tx.category})`;
          }).join('\n');
          
          const restCount = txs.length - 5;
          const extraText = restCount > 0 ? `\n• e mais ${restCount} transações...` : '';

          await sendTelegramMessage(
            chatId, 
            `✅ *Importação concluída!*\n\nImportadas *${txs.length} compras* para o cartão *${card.name}*:\n\n${summary}${extraText}\n\n📊 [Ver no Dashboard](${appUrl})`
          );

        } else if (callbackData.startsWith('cancel_pdf_')) {
          const importGroupId = callbackData.replace('cancel_pdf_', '');
          await db.delete(transactions).where(eq(transactions.installmentId, importGroupId));
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
      const text = await extractTextFromPdf(buffer);

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

      const importGroupId = crypto.randomUUID();

      const txValues = extractedData.map(tx => ({
        userId: user.id,
        amount: tx.amount.toString(),
        description: tx.description,
        category: tx.category,
        type: 'expense' as const,
        creditCardId: suggestedCardId,
        status: 'pending' as const,
        installmentId: importGroupId,
        createdAt: tx.date ? new Date(tx.date + 'T12:00:00') : new Date()
      }));

      if (txValues.length > 0) {
        await db.insert(transactions).values(txValues);
      }

      // Criar botões para selecionar o cartão
      const inlineKeyboard = [];
      for (let i = 0; i < userCards.length; i++) {
        const card = userCards[i];
        const isSuggested = card.id === suggestedCardId;
        const prefix = isSuggested ? "✨ 💳 " : "💳 ";
        inlineKeyboard.push([
          { text: `${prefix}Importar para: ${card.name}`, callback_data: `import_pdf_c${i}_${importGroupId}` }
        ]);
      }
      inlineKeyboard.push([{ text: "❌ Cancelar", callback_data: `cancel_pdf_${importGroupId}` }]);

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

🔗 *Acesse o Dashboard:*
📊 [Acessar Planify AI](${appUrl})
      `;
      await sendTelegramMessage(chatId, helpMsg);
      return NextResponse.json({ status: "Help" });
    }

    // Comando /link, !link ou /dashboard
    if (textMessage && (
      textMessage.toLowerCase().startsWith("/link") || 
      textMessage.toLowerCase().startsWith("!link") || 
      textMessage.toLowerCase().startsWith("/dashboard")
    )) {
      const linkMsg = `🔗 *Planify AI - Link de Acesso*\n\nAqui está o link para acessar o seu painel financeiro:\n\n📊 [Ver no Dashboard](${appUrl})`;
      await sendTelegramMessage(chatId, linkMsg);
      return NextResponse.json({ status: "Link sent" });
    }

    // Comando de /start para vincular a conta
    if (textMessage && textMessage.startsWith("/start")) {
      const parts = textMessage.split(" ");
      if (parts.length > 1) {
        const userId = parts[1];
        try {
          await db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, userId));
          await sendTelegramMessage(chatId, `🎉 *Conta vinculada com sucesso!*\n\nAgora você pode me enviar seus gastos ou ganhos diretamente por aqui, digitando ou por áudio.\n\nExemplo: \`Comprei pão por 15 reais no débito\`\n\nDigite /help para ver mais exemplos.\n\n📊 [Acessar o Dashboard](${appUrl})`);
          return NextResponse.json({ status: "Linked" });
        } catch {
          await sendTelegramMessage(chatId, "❌ Erro ao vincular sua conta. Tente novamente pelo site.");
          return NextResponse.json({ status: "Error linking" });
        }
      } else {
        await sendTelegramMessage(chatId, `👋 Olá! Para começar, acesse o painel web do Planify AI e clique em *Conectar Telegram*.\n\n📊 [Acessar o Dashboard](${appUrl})`);
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
      
      for (let i = 0; i < userCards.length; i++) {
        const card = userCards[i];
        const isSuggested = card.id === defaultCardId;
        const prefix = isSuggested ? "✨ 💳 " : "💳 ";
        inlineKeyboard.push([
          { text: `${prefix}${card.name}`, callback_data: `confirm_inst_${newInst.id}_c${i}` }
        ]);
      }

      for (let i = 0; i < userAccounts.length; i++) {
        const acc = userAccounts[i];
        const isSuggested = acc.id === suggestedAccountId;
        const prefix = isSuggested ? "✨ 🏦 " : "🏦 ";
        inlineKeyboard.push([
          { text: `${prefix}${acc.name}`, callback_data: `confirm_inst_${newInst.id}_a${i}` }
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
      for (let i = 0; i < userCards.length; i++) {
        const card = userCards[i];
        const isSuggested = card.id === suggestedCardId;
        const prefix = isSuggested ? "✨ 💳 " : "💳 ";
        inlineKeyboard.push([
          { text: `${prefix}${card.name}`, callback_data: `confirm_${newTx.id}_c${i}` }
        ]);
      }
      
      for (let i = 0; i < userAccounts.length; i++) {
        const acc = userAccounts[i];
        const isSuggested = acc.id === suggestedAccountId;
        const prefix = isSuggested ? "✨ 🏦 " : "🏦 ";
        inlineKeyboard.push([
          { text: `${prefix}${acc.name}`, callback_data: `confirm_${newTx.id}_a${i}` }
        ]);
      }
    } else {
      for (let i = 0; i < userAccounts.length; i++) {
        const acc = userAccounts[i];
        const isSuggested = acc.id === suggestedAccountId;
        const prefix = isSuggested ? "✨ 🏦 " : "🏦 ";
        inlineKeyboard.push([
          { text: `${prefix}${acc.name}`, callback_data: `confirm_${newTx.id}_a${i}` }
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
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error && error.stack ? error.stack.split("\n").slice(0, 3).join("\n") : "";
        await sendTelegramMessage(chatId, `⚠️ Desculpe, ocorreu um erro inesperado ao processar sua solicitação.\n\n*Erro:* \`${errMsg}\`\n\`\`\`\n${errStack}\n\`\`\``);
      } catch (sendError) {
        console.error("Failed to send error message to Telegram:", sendError);
      }
    }
    // Retornamos 200 (ok) para evitar que o Telegram envie a mesma mensagem em loop
    return NextResponse.json({ status: "Error handled" });
  }
}


