import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteInstallment } from './actions';
import { db } from '@/db';
import { getSession } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Installments Actions - deleteInstallment', () => {
  const mockUser = { id: 'user-123', name: 'Daniel', email: 'daniel@example.com' };
  const mockSession = { user: mockUser, expires: '2026-12-31' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna erro se a sessão não for válida', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null);

    const result = await deleteInstallment('inst-1');
    expect(result).toEqual({ error: 'Não autorizado' });
  });

  it('exclui o parcelamento mestre mesmo se não houver transações vinculadas', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

    // Query de transações vinculadas retorna vazio
    const whereTxs = vi.fn().mockResolvedValueOnce([]);
    const fromTxs = vi.fn().mockReturnValueOnce({ where: whereTxs });
    vi.mocked(db.select).mockReturnValueOnce({ from: fromTxs } as unknown as ReturnType<typeof db.select>);

    // Delete do installment mestre
    const whereDelInst = vi.fn().mockResolvedValueOnce(undefined);
    vi.mocked(db.delete).mockReturnValueOnce({ where: whereDelInst } as unknown as ReturnType<typeof db.delete>);

    const result = await deleteInstallment('inst-1');

    expect(result).toEqual({ success: true });
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('exclui transações previstas e deleta o parcelamento mestre quando nenhuma parcela foi quitada', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

    const relatedTxs = [
      {
        id: 'tx-1',
        installmentId: 'inst-1',
        creditCardId: 'card-1',
        accountId: null,
        amount: '100.00',
        status: 'confirmed',
        createdAt: new Date('2026-08-10'),
        dueDate: new Date('2026-08-10'),
      },
      {
        id: 'tx-2',
        installmentId: 'inst-1',
        creditCardId: 'card-1',
        accountId: null,
        amount: '100.00',
        status: 'confirmed',
        createdAt: new Date('2026-09-10'),
        dueDate: new Date('2026-09-10'),
      },
    ];

    // 1. Select related transactions
    const whereTxs = vi.fn().mockResolvedValueOnce(relatedTxs);
    const fromTxs = vi.fn().mockReturnValueOnce({ where: whereTxs });

    // 2. Select invoice payments (nenhuma fatura paga)
    const whereInvoice = vi.fn().mockResolvedValueOnce([]);
    const fromInvoice = vi.fn().mockReturnValueOnce({ where: whereInvoice });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: fromTxs } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: fromInvoice } as unknown as ReturnType<typeof db.select>);

    // 3. Delete transactions (previstas)
    const whereDelTxs = vi.fn().mockResolvedValueOnce(undefined);
    // 4. Delete installment master
    const whereDelInst = vi.fn().mockResolvedValueOnce(undefined);

    vi.mocked(db.delete)
      .mockReturnValueOnce({ where: whereDelTxs } as unknown as ReturnType<typeof db.delete>)
      .mockReturnValueOnce({ where: whereDelInst } as unknown as ReturnType<typeof db.delete>);

    const result = await deleteInstallment('inst-1');

    expect(result).toEqual({ success: true });
    expect(db.delete).toHaveBeenCalledTimes(2);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('preserva/desvincula parcelas já quitadas e exclui parcelas futuras/previstas', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

    const relatedTxs = [
      {
        id: 'tx-paid-1',
        installmentId: 'inst-1',
        creditCardId: 'card-1',
        accountId: null,
        amount: '100.00',
        status: 'confirmed',
        createdAt: new Date('2026-06-10'),
        dueDate: new Date('2026-06-10'),
      },
      {
        id: 'tx-pending-2',
        installmentId: 'inst-1',
        creditCardId: 'card-1',
        accountId: null,
        amount: '100.00',
        status: 'confirmed',
        createdAt: new Date('2026-07-10'),
        dueDate: new Date('2026-07-10'),
      },
    ];

    const invoicePayments = [
      {
        id: 'inv-payment-1',
        userId: 'user-123',
        creditCardId: 'card-1',
        accountId: 'acc-1',
        amount: '500.00',
        status: 'confirmed',
        createdAt: new Date('2026-06-20'), // Fatura de Junho paga
      },
    ];

    // Select related transactions
    const whereTxs = vi.fn().mockResolvedValueOnce(relatedTxs);
    const fromTxs = vi.fn().mockReturnValueOnce({ where: whereTxs });

    // Select invoice payments
    const whereInvoice = vi.fn().mockResolvedValueOnce(invoicePayments);
    const fromInvoice = vi.fn().mockReturnValueOnce({ where: whereInvoice });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: fromTxs } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: fromInvoice } as unknown as ReturnType<typeof db.select>);

    // Delete pending transactions
    const whereDelTxs = vi.fn().mockResolvedValueOnce(undefined);
    vi.mocked(db.delete).mockReturnValueOnce({ where: whereDelTxs } as unknown as ReturnType<typeof db.delete>);

    // Update paid transactions (set installmentId: null)
    const whereUpdateTxs = vi.fn().mockResolvedValueOnce(undefined);
    const setUpdateTxs = vi.fn().mockReturnValueOnce({ where: whereUpdateTxs });
    vi.mocked(db.update).mockReturnValueOnce({ set: setUpdateTxs } as unknown as ReturnType<typeof db.update>);

    // Delete master installment
    const whereDelInst = vi.fn().mockResolvedValueOnce(undefined);
    vi.mocked(db.delete).mockReturnValueOnce({ where: whereDelInst } as unknown as ReturnType<typeof db.delete>);

    const result = await deleteInstallment('inst-1');

    expect(result).toEqual({ success: true });
    // Deletou as previstas e depois o installment mestre
    expect(db.delete).toHaveBeenCalledTimes(2);
    // Atualizou as pagas
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(setUpdateTxs).toHaveBeenCalledWith({ installmentId: null });
  });
});
