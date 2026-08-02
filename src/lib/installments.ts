export interface InstallmentInput {
  id: string;
  description: string;
  category: string;
  totalAmount: string;
  installmentsCount: number | string;
  creditCardId?: string | null;
  createdAt: Date | string;
}

export interface TransactionInput {
  id: string;
  installmentId?: string | null;
  creditCardId?: string | null;
  accountId?: string | null;
  amount: string;
  status: string;
  createdAt: Date | string;
  dueDate?: Date | string | null;
}

export interface InvoicePaymentInput {
  creditCardId?: string | null;
  accountId?: string | null;
  status: string;
  createdAt: Date | string;
}

export interface ProcessedInstallment {
  id: string;
  description: string;
  category: string;
  totalAmount: string;
  installmentsCount: number;
  paidCount: number;
  installmentValue: string;
  remainingAmount: string;
  accountId: string | null;
  creditCardId: string | null;
  createdAt: string;
  isFinished: boolean;
}

/**
 * Verifica se uma transação gerada de um parcelamento está efetivamente paga.
 */
export function isTransactionPaid(
  tx: TransactionInput,
  invoicePayments: InvoicePaymentInput[],
  now: Date = new Date()
): boolean {
  // Transação no cartão de crédito (sem conta debitada diretamente)
  if (tx.creditCardId && !tx.accountId) {
    const txDueDate = new Date(tx.dueDate || tx.createdAt);
    const txMonth = txDueDate.getMonth();
    const txYear = txDueDate.getFullYear();

    // Uma transação de cartão só é paga se a fatura do mês correspondente tiver sido quitada
    return invoicePayments.some((p) => {
      if (p.creditCardId !== tx.creditCardId || !p.accountId || p.status !== 'confirmed') {
        return false;
      }
      const paymentDate = new Date(p.createdAt);
      return paymentDate.getMonth() === txMonth && paymentDate.getFullYear() === txYear;
    });
  }

  // Transação via conta / débito direto
  if (tx.accountId && !tx.creditCardId) {
    return tx.status === 'confirmed' && new Date(tx.createdAt) <= now;
  }

  // Se tiver ambos ou nenhum, considera confirmed até a data atual
  return tx.status === 'confirmed' && new Date(tx.createdAt) <= now;
}

/**
 * Calcula o progresso, parcelas pagas, valor restante e status de finalização de um parcelamento.
 */
export function calculateInstallmentDetails(
  inst: InstallmentInput,
  userTransactions: TransactionInput[],
  invoicePayments: InvoicePaymentInput[],
  now: Date = new Date()
): ProcessedInstallment {
  const installmentsCount = Number(inst.installmentsCount);
  const totalAmountNum = Number(inst.totalAmount);
  const installmentValueNum = totalAmountNum / installmentsCount;

  // Transações geradas atreladas a este parcelamento mestre
  const generatedTxs = userTransactions.filter((t) => t.installmentId === inst.id);

  // Parcelas que não foram registradas no sistema (cadastradas a partir da parcela N)
  const notRegisteredButPaid = Math.max(0, installmentsCount - generatedTxs.length);

  // Contar quantas transações geradas já foram pagas
  const paidGeneratedCount = generatedTxs.filter((tx) =>
    isTransactionPaid(tx, invoicePayments, now)
  ).length;

  const paidCount = Math.min(installmentsCount, notRegisteredButPaid + paidGeneratedCount);
  const remainingCount = Math.max(0, installmentsCount - paidCount);
  const remainingAmountNum = remainingCount * installmentValueNum;

  const firstTx = generatedTxs[0];
  const accountId = firstTx?.accountId || null;
  const creditCardId = inst.creditCardId || null;

  return {
    id: inst.id,
    description: inst.description,
    category: inst.category,
    totalAmount: totalAmountNum.toFixed(2),
    installmentsCount,
    paidCount,
    installmentValue: installmentValueNum.toFixed(2),
    remainingAmount: remainingAmountNum.toFixed(2),
    accountId,
    creditCardId,
    createdAt: typeof inst.createdAt === 'string' ? inst.createdAt : inst.createdAt.toISOString(),
    isFinished: paidCount >= installmentsCount,
  };
}
