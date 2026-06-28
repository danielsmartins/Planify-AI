import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, transactions } from '@/db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { sendTelegramMessage } from '@/lib/telegram';

export async function GET(req: Request) {
  // Autenticação básica para o Cron Job
  const authHeader = req.headers.get('authorization');
  
  if (
    process.env.NODE_ENV === 'production' && 
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca usuários que possuem o Telegram vinculado
    const activeUsers = await db.select()
      .from(users)
      .where(isNotNull(users.telegramChatId));

    if (activeUsers.length === 0) {
      return NextResponse.json({ message: 'Nenhum usuário com Telegram vinculado.' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let sentCount = 0;

    for (const user of activeUsers) {
      if (!user.telegramChatId) continue;

      // Calcular o saldo e gastos do mês para o usuário
      const userTxs = await db.select()
        .from(transactions)
        .where(and(
          eq(transactions.userId, user.id),
          eq(transactions.status, 'confirmed'),
          sql`${transactions.createdAt} >= ${startOfMonth}`,
          sql`${transactions.createdAt} <= ${endOfMonth}`
        ));

      let totalIncome = 0;
      let totalExpense = 0;

      userTxs.forEach((tx) => {
        const val = parseFloat(tx.amount);
        if (tx.type === 'income') totalIncome += val;
        else totalExpense += val;
      });

      const balance = totalIncome - totalExpense;
      const balanceStr = balance.toFixed(2).replace('.', ',');
      const expenseStr = totalExpense.toFixed(2).replace('.', ',');

      let statusMsg = '';
      if (balance > 0) {
        statusMsg = 'Seu mês está positivo! Parabéns! 🚀';
      } else if (balance < 0) {
        statusMsg = 'Atenção: Seu mês está no vermelho. Segure os gastos! ⚠️';
      } else {
        statusMsg = 'Tudo equilibrado por enquanto. ⚖️';
      }

      const message = `
🌅 *Bom dia, ${user.name.split(' ')[0]}!*

Aqui está o seu resumo financeiro parcial deste mês:

📉 *Gastos Totais:* R$ ${expenseStr}
💰 *Saldo Atual:* R$ ${balanceStr}

${statusMsg}

Lembre-se que você pode me enviar qualquer gasto novo por aqui mesmo!
      `;

      await sendTelegramMessage(user.telegramChatId, message);
      sentCount++;
    }

    return NextResponse.json({ message: `Resumo diário enviado para ${sentCount} usuários.` });
  } catch (error) {
    console.error('Error sending daily reports:', error);
    return NextResponse.json({ error: 'Erro interno ao enviar relatórios diários' }, { status: 500 });
  }
}
