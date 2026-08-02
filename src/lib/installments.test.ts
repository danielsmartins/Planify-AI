import { describe, it, expect } from 'vitest';
import {
  isTransactionPaid,
  calculateInstallmentDetails,
  type InstallmentInput,
  type TransactionInput,
  type InvoicePaymentInput,
} from './installments';

describe('installments utility', () => {
  const cardId = 'card-nubank-123';
  const accountId = 'account-itau-123';
  const now = new Date('2026-08-02T12:00:00Z');

  describe('isTransactionPaid', () => {
    it('deve considerar parcela de cartão como NÃO paga se a fatura do mês não estiver quitada', () => {
      const tx: TransactionInput = {
        id: 'tx-1',
        installmentId: 'inst-creatina',
        creditCardId: cardId,
        accountId: null,
        amount: '20.67',
        status: 'confirmed',
        createdAt: '2026-07-12T10:00:00Z',
        dueDate: '2026-07-12T10:00:00Z',
      };

      const invoicePayments: InvoicePaymentInput[] = []; // Nenhuma fatura paga

      expect(isTransactionPaid(tx, invoicePayments, now)).toBe(false);
    });

    it('deve considerar parcela de cartão como PAGA se houver pagamento de fatura do mesmo mês e ano', () => {
      const tx: TransactionInput = {
        id: 'tx-1',
        installmentId: 'inst-creatina',
        creditCardId: cardId,
        accountId: null,
        amount: '20.67',
        status: 'confirmed',
        createdAt: '2026-07-12T10:00:00Z',
        dueDate: '2026-07-12T10:00:00Z',
      };

      const invoicePayments: InvoicePaymentInput[] = [
        {
          creditCardId: cardId,
          accountId: accountId,
          status: 'confirmed',
          createdAt: '2026-07-20T10:00:00Z', // Pagamento da fatura de Julho
        },
      ];

      expect(isTransactionPaid(tx, invoicePayments, now)).toBe(true);
    });

    it('deve considerar parcela por débito/conta como PAGA se status for confirmed e data <= hoje', () => {
      const tx: TransactionInput = {
        id: 'tx-debito',
        installmentId: 'inst-1',
        creditCardId: null,
        accountId: accountId,
        amount: '50.00',
        status: 'confirmed',
        createdAt: '2026-07-10T10:00:00Z',
      };

      expect(isTransactionPaid(tx, [], now)).toBe(true);
    });
  });

  describe('calculateInstallmentDetails', () => {
    it('caso Creatina (2/2): parcela 2 está em fatura prevista (não paga) => paidCount deve ser 1/2', () => {
      const inst: InstallmentInput = {
        id: 'inst-creatina',
        description: 'Creatina',
        category: 'Saúde',
        totalAmount: '41.34',
        installmentsCount: 2,
        creditCardId: cardId,
        createdAt: '2026-06-12T10:00:00Z',
      };

      const txs: TransactionInput[] = [
        {
          id: 'tx-c1',
          installmentId: 'inst-creatina',
          creditCardId: cardId,
          accountId: null,
          amount: '20.67',
          status: 'confirmed',
          createdAt: '2026-06-12T10:00:00Z',
          dueDate: '2026-06-12T10:00:00Z',
        },
        {
          id: 'tx-c2',
          installmentId: 'inst-creatina',
          creditCardId: cardId,
          accountId: null,
          amount: '20.67',
          status: 'confirmed',
          createdAt: '2026-07-12T10:00:00Z',
          dueDate: '2026-07-12T10:00:00Z',
        },
      ];

      // Apenas fatura de Junho foi paga
      const invoicePayments: InvoicePaymentInput[] = [
        {
          creditCardId: cardId,
          accountId: accountId,
          status: 'confirmed',
          createdAt: '2026-06-20T10:00:00Z',
        },
      ];

      const result = calculateInstallmentDetails(inst, txs, invoicePayments, now);

      expect(result.paidCount).toBe(1);
      expect(result.remainingAmount).toBe('20.67');
      expect(result.isFinished).toBe(false);
    });

    it('caso Notebook (10/12): cadastrado na 10ª parcela com fatura de julho prevista => paidCount deve ser 9/12', () => {
      const inst: InstallmentInput = {
        id: 'inst-notebook',
        description: 'Notebook',
        category: 'Compras',
        totalAmount: '4776.00',
        installmentsCount: 12,
        creditCardId: cardId,
        createdAt: '2026-07-12T10:00:00Z',
      };

      // Gerou apenas parcelas 10, 11 e 12 (9 já tinham sido pagas antes de usar o app)
      const txs: TransactionInput[] = [
        {
          id: 'tx-n10',
          installmentId: 'inst-notebook',
          creditCardId: cardId,
          accountId: null,
          amount: '398.00',
          status: 'confirmed',
          createdAt: '2026-07-12T10:00:00Z',
          dueDate: '2026-07-12T10:00:00Z',
        },
        {
          id: 'tx-n11',
          installmentId: 'inst-notebook',
          creditCardId: cardId,
          accountId: null,
          amount: '398.00',
          status: 'confirmed',
          createdAt: '2026-08-12T10:00:00Z',
          dueDate: '2026-08-12T10:00:00Z',
        },
        {
          id: 'tx-n12',
          installmentId: 'inst-notebook',
          creditCardId: cardId,
          accountId: null,
          amount: '398.00',
          status: 'confirmed',
          createdAt: '2026-09-12T10:00:00Z',
          dueDate: '2026-09-12T10:00:00Z',
        },
      ];

      // Fatura de Julho NÃO foi paga ainda
      const invoicePayments: InvoicePaymentInput[] = [];

      const result = calculateInstallmentDetails(inst, txs, invoicePayments, now);

      expect(result.paidCount).toBe(9);
      expect(result.remainingAmount).toBe('1194.00'); // 3 * 398.00
      expect(result.isFinished).toBe(false);
    });

    it('caso Notebook (10/12): quando a fatura de julho é paga => paidCount deve avançar para 10/12', () => {
      const inst: InstallmentInput = {
        id: 'inst-notebook',
        description: 'Notebook',
        category: 'Compras',
        totalAmount: '4776.00',
        installmentsCount: 12,
        creditCardId: cardId,
        createdAt: '2026-07-12T10:00:00Z',
      };

      const txs: TransactionInput[] = [
        {
          id: 'tx-n10',
          installmentId: 'inst-notebook',
          creditCardId: cardId,
          accountId: null,
          amount: '398.00',
          status: 'confirmed',
          createdAt: '2026-07-12T10:00:00Z',
          dueDate: '2026-07-12T10:00:00Z',
        },
        {
          id: 'tx-n11',
          installmentId: 'inst-notebook',
          creditCardId: cardId,
          accountId: null,
          amount: '398.00',
          status: 'confirmed',
          createdAt: '2026-08-12T10:00:00Z',
          dueDate: '2026-08-12T10:00:00Z',
        },
        {
          id: 'tx-n12',
          installmentId: 'inst-notebook',
          creditCardId: cardId,
          accountId: null,
          amount: '398.00',
          status: 'confirmed',
          createdAt: '2026-09-12T10:00:00Z',
          dueDate: '2026-09-12T10:00:00Z',
        },
      ];

      // Fatura de Julho PAGA
      const invoicePayments: InvoicePaymentInput[] = [
        {
          creditCardId: cardId,
          accountId: accountId,
          status: 'confirmed',
          createdAt: '2026-07-25T10:00:00Z',
        },
      ];

      const result = calculateInstallmentDetails(inst, txs, invoicePayments, now);

      expect(result.paidCount).toBe(10);
      expect(result.remainingAmount).toBe('796.00'); // 2 * 398.00
      expect(result.isFinished).toBe(false);
    });
  });
});
