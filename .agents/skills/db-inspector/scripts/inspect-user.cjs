const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('ERRO: DATABASE_URL não encontrada no ambiente. Certifique-se de executar com --env-file=.env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

function calculateCreditCardDate(baseDate, closingDay, dueDay) {
  const resultDate = new Date(baseDate);
  const day = resultDate.getDate();
  
  let closingMonth = resultDate.getMonth();
  let closingYear = resultDate.getFullYear();

  if (day >= closingDay) {
    closingMonth += 1;
    if (closingMonth > 11) {
      closingMonth = 0;
      closingYear += 1;
    }
  }

  let dueMonth = closingMonth;
  let dueYear = closingYear;

  if (dueDay <= closingDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }

  const daysInDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
  const actualDueDay = Math.min(dueDay, daysInDueMonth);

  return new Date(dueYear, dueMonth, actualDueDay, 12, 0, 0, 0);
}

function getTxDueDate(t, closingDay, dueDay) {
  if (t.due_date || t.dueDate) {
    return new Date(t.due_date || t.dueDate);
  }
  return calculateCreditCardDate(new Date(t.created_at || t.createdAt), closingDay, dueDay);
}

function getInvoiceKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

async function main() {
  const target = process.argv[2]; // email or userId (optional)

  let user;
  if (target) {
    const users = await sql`SELECT * FROM users WHERE email = ${target} OR id = ${target}`;
    if (users.length === 0) {
      console.error(`Usuário não encontrado para: "${target}"`);
      process.exit(1);
    }
    user = users[0];
  } else {
    const users = await sql`SELECT * FROM users LIMIT 1`;
    if (users.length === 0) {
      console.error('Nenhum usuário encontrado no banco.');
      process.exit(1);
    }
    user = users[0];
  }

  console.log(`\n======================================================`);
  console.log(`📊 DIAGNÓSTICO DO USUÁRIO: ${user.name} (${user.email})`);
  console.log(`🆔 ID: ${user.id}`);
  console.log(`======================================================\n`);

  // 1. Contas
  const accounts = await sql`SELECT * FROM accounts WHERE user_id = ${user.id}`;
  console.log(`🏦 Contas Bancárias (${accounts.length}):`);
  console.table(accounts.map(a => ({ id: a.id.slice(0, 8), name: a.name, type: a.type, balance: `R$ ${parseFloat(a.balance).toFixed(2)}` })));

  // 2. Cartões
  const cards = await sql`SELECT * FROM credit_cards WHERE user_id = ${user.id}`;
  console.log(`\n💳 Cartões de Crédito (${cards.length}):`);
  console.table(cards.map(c => ({ id: c.id.slice(0, 8), name: c.name, closingDay: c.closing_day, dueDay: c.due_day, limit: c.limit_amount, autoPay: c.auto_pay })));

  // 3. Assinaturas
  const subs = await sql`SELECT * FROM subscriptions WHERE user_id = ${user.id}`;
  console.log(`\n🔄 Assinaturas (${subs.length}):`);
  console.table(subs.map(s => ({
    id: s.id.slice(0, 8),
    name: s.name,
    amount: `R$ ${parseFloat(s.amount).toFixed(2)}`,
    cycle: s.billing_cycle,
    status: s.status,
    nextBilling: s.next_billing_date ? new Date(s.next_billing_date).toISOString().slice(0, 10) : null
  })));

  // 4. Transações
  const txs = await sql`SELECT * FROM transactions WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 30`;
  const invoicePayments = txs.filter(t => t.status === 'confirmed' && t.account_id && t.credit_card_id);

  console.log(`\n📝 Últimas Transações (${txs.length}):`);
  console.table(txs.map(t => {
    let cardInfo = '-';
    let cardKey = '-';
    let isUnpaid = t.status === 'pending';

    if (t.credit_card_id && !t.account_id) {
      const card = cards.find(c => c.id === t.credit_card_id);
      if (card) {
        cardInfo = card.name;
        const closingDay = Number(card.closing_day);
        const dueDay = Number(card.due_day);
        const txDueDate = getTxDueDate(t, closingDay, dueDay);
        cardKey = getInvoiceKey(txDueDate);

        const hasPayment = invoicePayments.some(p => {
          if (p.credit_card_id !== t.credit_card_id) return false;
          const pDueDate = getTxDueDate(p, closingDay, dueDay);
          return getInvoiceKey(pDueDate) === cardKey;
        });
        isUnpaid = !hasPayment;
      }
    }

    return {
      id: t.id.slice(0, 8),
      desc: t.description,
      amount: `R$ ${parseFloat(t.amount).toFixed(2)}`,
      type: t.type,
      status: t.status,
      cat: t.category,
      card: cardInfo,
      invoiceKey: cardKey,
      unpaid: isUnpaid ? '⚠️ SIM' : '✅ NÃO',
      created: t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : '-'
    };
  }));
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
