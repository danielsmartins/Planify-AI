import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addSubscription, deleteSubscription, toggleSubscriptionStatus } from './actions';
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

describe('Subscriptions Actions Security', () => {
  const mockUser = { id: 'user-123', name: 'Daniel', email: 'daniel@example.com' };
  const mockSession = { user: mockUser, expires: '2026-12-31' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addSubscription', () => {
    it('returns unauthorized error if session is null', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);
      const formData = new FormData();
      const res = await addSubscription(formData);
      expect(res).toEqual({ error: 'Não autorizado' });
    });

    it('rejects subscription if accountId belongs to another user', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const whereAcc = vi.fn().mockResolvedValueOnce([]); // not found or not owned
      const fromAcc = vi.fn().mockReturnValueOnce({ where: whereAcc });
      vi.mocked(db.select).mockReturnValueOnce({ from: fromAcc } as unknown as ReturnType<typeof db.select>);

      const formData = new FormData();
      formData.append('name', 'Netflix');
      formData.append('amount', '55.90');
      formData.append('category', 'Streaming');
      formData.append('billingCycle', 'monthly');
      formData.append('nextBillingDate', '2026-11-10');
      formData.append('accountId', '550e8400-e29b-41d4-a716-446655440000');

      const res = await addSubscription(formData);
      expect(res).toEqual({ error: 'Conta selecionada não encontrada ou não autorizada.' });
    });

    it('rejects subscription if creditCardId belongs to another user', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const whereCard = vi.fn().mockResolvedValueOnce([]); // not found or not owned
      const fromCard = vi.fn().mockReturnValueOnce({ where: whereCard });
      vi.mocked(db.select).mockReturnValueOnce({ from: fromCard } as unknown as ReturnType<typeof db.select>);

      const formData = new FormData();
      formData.append('name', 'Spotify');
      formData.append('amount', '34.90');
      formData.append('category', 'Streaming');
      formData.append('billingCycle', 'monthly');
      formData.append('nextBillingDate', '2026-11-10');
      formData.append('creditCardId', '550e8400-e29b-41d4-a716-446655440001');

      const res = await addSubscription(formData);
      expect(res).toEqual({ error: 'Cartão de crédito selecionado não encontrado ou não autorizado.' });
    });

    it('persists subscription when resources belong to the user', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

      const whereAcc = vi.fn().mockResolvedValueOnce([{ id: '550e8400-e29b-41d4-a716-446655440000' }]);
      const fromAcc = vi.fn().mockReturnValueOnce({ where: whereAcc });
      vi.mocked(db.select).mockReturnValueOnce({ from: fromAcc } as unknown as ReturnType<typeof db.select>);

      const valuesMock = vi.fn().mockResolvedValueOnce(undefined);
      vi.mocked(db.insert).mockReturnValueOnce({ values: valuesMock } as unknown as ReturnType<typeof db.insert>);

      const formData = new FormData();
      formData.append('name', 'Netflix');
      formData.append('amount', '55.90');
      formData.append('category', 'Streaming');
      formData.append('billingCycle', 'monthly');
      formData.append('nextBillingDate', '2026-11-10');
      formData.append('accountId', '550e8400-e29b-41d4-a716-446655440000');

      const res = await addSubscription(formData);
      expect(res).toEqual({ success: true });
      expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        name: 'Netflix',
        amount: '55.9',
      }));
    });
  });

  describe('deleteSubscription', () => {
    it('deletes subscription with user ownership filter', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const whereDel = vi.fn().mockResolvedValueOnce(undefined);
      vi.mocked(db.delete).mockReturnValueOnce({ where: whereDel } as unknown as ReturnType<typeof db.delete>);

      const res = await deleteSubscription('sub-1');
      expect(res).toEqual({ success: true });
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('toggleSubscriptionStatus', () => {
    it('toggles subscription status between active and canceled', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);
      const whereUpd = vi.fn().mockResolvedValueOnce(undefined);
      const setUpd = vi.fn().mockReturnValueOnce({ where: whereUpd });
      vi.mocked(db.update).mockReturnValueOnce({ set: setUpd } as unknown as ReturnType<typeof db.update>);

      const res = await toggleSubscriptionStatus('sub-1', 'active');
      expect(res).toEqual({ success: true });
      expect(setUpd).toHaveBeenCalledWith({ status: 'canceled' });
    });
  });
});
