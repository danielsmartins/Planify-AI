import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransaction, createInstallmentPurchase, completeOnboarding } from './actions';
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

describe('Actions Security Validations', () => {
  const mockUser = { id: 'user-123', name: 'Daniel', email: 'daniel@example.com' };
  const mockSession = { user: mockUser, expires: '2026-12-31' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('returns error if creditCardId does not belong to user', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

      const whereCard = vi.fn().mockResolvedValueOnce([]); // not found or not owned
      const fromCard = vi.fn().mockReturnValueOnce({ where: whereCard });
      vi.mocked(db.select).mockReturnValueOnce({ from: fromCard } as unknown as ReturnType<typeof db.select>);

      const formData = new FormData();
      formData.append('description', 'Uber');
      formData.append('amount', '25.00');
      formData.append('category', 'Transporte');
      formData.append('type', 'expense');
      formData.append('creditCardId', '550e8400-e29b-41d4-a716-446655440000');

      const res = await createTransaction(formData);
      expect(res).toEqual({ error: 'Cartão de crédito não encontrado ou não autorizado.' });
    });

    it('returns error if accountId does not belong to user', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

      const whereAcc = vi.fn().mockResolvedValueOnce([]); // not found or not owned
      const fromAcc = vi.fn().mockReturnValueOnce({ where: whereAcc });
      vi.mocked(db.select).mockReturnValueOnce({ from: fromAcc } as unknown as ReturnType<typeof db.select>);

      const formData = new FormData();
      formData.append('description', 'Salário');
      formData.append('amount', '5000.00');
      formData.append('category', 'Salário');
      formData.append('type', 'income');
      formData.append('accountId', '550e8400-e29b-41d4-a716-446655440001');

      const res = await createTransaction(formData);
      expect(res).toEqual({ error: 'Conta bancária não encontrada ou não autorizada.' });
    });
  });

  describe('createInstallmentPurchase', () => {
    it('rejects installment if creditCardId does not belong to user', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

      const whereCard = vi.fn().mockResolvedValueOnce([]); // not found
      const fromCard = vi.fn().mockReturnValueOnce({ where: whereCard });
      vi.mocked(db.select).mockReturnValueOnce({ from: fromCard } as unknown as ReturnType<typeof db.select>);

      const formData = new FormData();
      formData.append('description', 'Notebook');
      formData.append('amount', '500.00');
      formData.append('category', 'Eletrônicos');
      formData.append('installmentsCount', '10');
      formData.append('currentInstallment', '1');
      formData.append('creditCardId', '550e8400-e29b-41d4-a716-446655440000');

      const res = await createInstallmentPurchase(formData);
      expect(res).toEqual({ error: 'Cartão de crédito não encontrado ou não autorizado.' });
    });
  });

  describe('completeOnboarding', () => {
    it('rejects onboarding data with invalid types or negative limits', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession as unknown as Awaited<ReturnType<typeof getSession>>);

      // @ts-expect-error testing invalid payload
      const res = await completeOnboarding({
        account: {
          name: '',
          type: 'invalid-type',
          color: '#8b5cf6',
          balance: 0,
        },
      });

      expect(res).toHaveProperty('error');
    });
  });
});
