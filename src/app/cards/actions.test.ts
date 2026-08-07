import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addCreditCard, deleteCreditCard, updateCreditCard, payCreditCardInvoice } from './actions';
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

describe('Cards Actions', () => {
  const mockUser = { id: 'user-123', name: 'Daniel', email: 'daniel@example.com' };
  const mockSession = { user: mockUser, expires: '2026-12-31' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addCreditCard', () => {
    it('returns error if session is not active', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);
      const formData = new FormData();
      const result = await addCreditCard(formData);
      expect(result).toEqual({ error: 'Não autorizado' });
    });

    it('returns error if validation fails', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const formData = new FormData();
      formData.append('name', ''); // invalid name
      const result = await addCreditCard(formData);
      expect(result).toHaveProperty('error');
    });

    it('inserts new credit card and revalidates path on success', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const valuesMock = vi.fn().mockResolvedValueOnce(undefined);
      vi.mocked(db.insert).mockReturnValueOnce({ values: valuesMock } as unknown as ReturnType<typeof db.insert>);

      const formData = new FormData();
      formData.append('name', 'Nubank Teste');
      formData.append('color', '#8a05be');
      formData.append('closingDay', '5');
      formData.append('dueDay', '12');
      formData.append('limitAmount', '5000');
      formData.append('brand', 'mastercard');

      const result = await addCreditCard(formData);
      expect(result).toEqual({ success: true });
      expect(db.insert).toHaveBeenCalled();
      expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        name: 'Nubank Teste',
        closingDay: '5',
        dueDay: '12',
      }));
    });
  });

  describe('updateCreditCard', () => {
    it('returns error if session is not active', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);
      const formData = new FormData();
      const result = await updateCreditCard('card-1', formData);
      expect(result).toEqual({ error: 'Não autorizado' });
    });

    it('updates credit card on valid data', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const whereMock = vi.fn().mockResolvedValueOnce(undefined);
      const setMock = vi.fn().mockReturnValueOnce({ where: whereMock });
      vi.mocked(db.update).mockReturnValueOnce({ set: setMock } as unknown as ReturnType<typeof db.update>);

      const formData = new FormData();
      formData.append('name', 'Nubank Atualizado');
      formData.append('color', '#8a05be');
      formData.append('closingDay', '10');
      formData.append('dueDay', '17');
      formData.append('limitAmount', '6000');
      formData.append('brand', 'mastercard');

      const result = await updateCreditCard('card-1', formData);
      expect(result).toEqual({ success: true });
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('deleteCreditCard', () => {
    it('throws error if user is unauthorized', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);
      await expect(deleteCreditCard('card-1')).rejects.toThrow('Unauthorized');
    });

    it('unlinks transactions and installments, then deletes credit card', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

      const whereTx = vi.fn().mockResolvedValueOnce(undefined);
      const setTx = vi.fn().mockReturnValueOnce({ where: whereTx });
      const whereInst = vi.fn().mockResolvedValueOnce(undefined);
      const setInst = vi.fn().mockReturnValueOnce({ where: whereInst });

      vi.mocked(db.update)
        .mockReturnValueOnce({ set: setTx } as unknown as ReturnType<typeof db.update>)
        .mockReturnValueOnce({ set: setInst } as unknown as ReturnType<typeof db.update>);

      const whereDel = vi.fn().mockResolvedValueOnce(undefined);
      vi.mocked(db.delete).mockReturnValueOnce({ where: whereDel } as unknown as ReturnType<typeof db.delete>);

      const result = await deleteCreditCard('card-1');
      expect(result).toEqual({ success: true });
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('payCreditCardInvoice', () => {
    it('throws error if user is unauthorized', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);
      await expect(payCreditCardInvoice('card-1', 'acc-1', 100, '2026-08-07')).rejects.toThrow('Unauthorized');
    });

    it('throws error if account is not found', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const whereAcc = vi.fn().mockResolvedValueOnce([]);
      const fromAcc = vi.fn().mockReturnValueOnce({ where: whereAcc });
      vi.mocked(db.select).mockReturnValueOnce({ from: fromAcc } as unknown as ReturnType<typeof db.select>);

      await expect(payCreditCardInvoice('card-1', 'acc-1', 100, '2026-08-07')).rejects.toThrow('Account not found');
    });

    it('deducts balance from account and inserts payment transaction with targetDueDate', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

      // Account select
      const mockAcc = { id: 'acc-1', balance: '1000.00' };
      const whereAcc = vi.fn().mockResolvedValueOnce([mockAcc]);
      const fromAcc = vi.fn().mockReturnValueOnce({ where: whereAcc });

      // Card select
      const mockCard = { id: 'card-1', name: 'Amazon' };
      const whereCard = vi.fn().mockResolvedValueOnce([mockCard]);
      const fromCard = vi.fn().mockReturnValueOnce({ where: whereCard });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: fromAcc } as unknown as ReturnType<typeof db.select>)
        .mockReturnValueOnce({ from: fromCard } as unknown as ReturnType<typeof db.select>);

      // Account balance update
      const whereUpdateAcc = vi.fn().mockResolvedValueOnce(undefined);
      const setUpdateAcc = vi.fn().mockReturnValueOnce({ where: whereUpdateAcc });
      vi.mocked(db.update).mockReturnValueOnce({ set: setUpdateAcc } as unknown as ReturnType<typeof db.update>);

      // Insert transaction
      const valuesTx = vi.fn().mockResolvedValueOnce(undefined);
      vi.mocked(db.insert).mockReturnValueOnce({ values: valuesTx } as unknown as ReturnType<typeof db.insert>);

      const targetDueDate = '2026-08-10T12:00:00.000Z';
      const result = await payCreditCardInvoice('card-1', 'acc-1', 150.50, '2026-08-07', targetDueDate);

      expect(result).toEqual({ success: true });
      expect(setUpdateAcc).toHaveBeenCalledWith({ balance: '849.5' });
      expect(valuesTx).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        amount: '150.5',
        description: 'Pagamento de Fatura - Amazon',
        category: 'Pagamento de Fatura',
        type: 'expense',
        creditCardId: 'card-1',
        accountId: 'acc-1',
        dueDate: new Date(targetDueDate)
      }));
    });
  });
});
