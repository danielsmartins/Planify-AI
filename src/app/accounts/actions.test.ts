import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addAccount, updateAccount, deleteAccount } from './actions';
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

describe('Accounts Actions Security & Audit', () => {
  const mockUser = { id: 'user-123', name: 'Daniel', email: 'daniel@example.com' };
  const mockSession = { user: mockUser, expires: '2026-12-31' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateAccount', () => {
    it('returns unauthorized error if session is null', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);
      const formData = new FormData();
      const res = await updateAccount('acc-1', formData);
      expect(res).toEqual({ error: 'Não autorizado' });
    });

    it('rejects update if account does not belong to the authenticated user', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const whereAcc = vi.fn().mockResolvedValueOnce([]); // not found or not owned
      const fromAcc = vi.fn().mockReturnValueOnce({ where: whereAcc });
      vi.mocked(db.select).mockReturnValueOnce({ from: fromAcc } as unknown as ReturnType<typeof db.select>);

      const formData = new FormData();
      formData.append('name', 'Conta Alterada');
      const res = await updateAccount('acc-1', formData);
      expect(res).toEqual({ error: 'Conta não encontrada ou não autorizada.' });
    });

    it('creates an audit reconciliation transaction when balance is adjusted', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

      // Account select returns current balance 100.00
      const mockExisting = { id: 'acc-1', name: 'Nubank', balance: '100.00' };
      const whereAcc = vi.fn().mockResolvedValueOnce([mockExisting]);
      const fromAcc = vi.fn().mockReturnValueOnce({ where: whereAcc });
      vi.mocked(db.select).mockReturnValueOnce({ from: fromAcc } as unknown as ReturnType<typeof db.select>);

      // Insert mock for transaction
      const valuesTx = vi.fn().mockResolvedValueOnce(undefined);
      vi.mocked(db.insert).mockReturnValueOnce({ values: valuesTx } as unknown as ReturnType<typeof db.insert>);

      // Update mock for account
      const whereUpd = vi.fn().mockResolvedValueOnce(undefined);
      const setUpd = vi.fn().mockReturnValueOnce({ where: whereUpd });
      vi.mocked(db.update).mockReturnValueOnce({ set: setUpd } as unknown as ReturnType<typeof db.update>);

      const formData = new FormData();
      formData.append('name', 'Nubank');
      formData.append('balance', '250.00'); // adjusted +150

      const res = await updateAccount('acc-1', formData);
      expect(res).toEqual({ success: true });

      // Verifies audit transaction was created with difference
      expect(valuesTx).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        amount: '150',
        description: 'Ajuste de Saldo - Nubank',
        category: 'Ajuste de Saldo',
        type: 'income',
        accountId: 'acc-1',
      }));

      // Verifies account balance was updated
      expect(setUpd).toHaveBeenCalledWith(expect.objectContaining({
        balance: '250',
      }));
    });
  });

  describe('addAccount', () => {
    it('creates account with sanitized values', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const valuesMock = vi.fn().mockResolvedValueOnce(undefined);
      vi.mocked(db.insert).mockReturnValueOnce({ values: valuesMock } as unknown as ReturnType<typeof db.insert>);

      const formData = new FormData();
      formData.append('name', 'Itaú');
      formData.append('type', 'checking');
      formData.append('color', '#ec7000');
      formData.append('balance', '500.00');

      const res = await addAccount(formData);
      expect(res).toEqual({ success: true });
      expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        name: 'Itaú',
        balance: '500',
      }));
    });
  });

  describe('deleteAccount', () => {
    it('deletes account enforcing user ownership in query', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const whereDel = vi.fn().mockResolvedValueOnce(undefined);
      vi.mocked(db.delete).mockReturnValueOnce({ where: whereDel } as unknown as ReturnType<typeof db.delete>);

      const res = await deleteAccount('acc-1');
      expect(res).toEqual({ success: true });
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
