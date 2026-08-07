import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processPendingSubscriptions } from './subscriptions-billing';
import { db } from '@/db';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/app/actions', () => ({
  calculateCreditCardDate: vi.fn().mockImplementation((date: Date) => new Date(date)),
}));

describe('processPendingSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing if no pending subscriptions exist', async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);
    const fromMock = vi.fn().mockReturnValueOnce({ where: whereMock });
    vi.mocked(db.select).mockReturnValueOnce({ from: fromMock } as unknown as ReturnType<typeof db.select>);

    await processPendingSubscriptions('user-123');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('processes account debit subscription, updates balance and inserts transaction', async () => {
    const pastDate = new Date(Date.now() - 86400000); // 1 day ago
    const mockSub = {
      id: 'sub-1',
      userId: 'user-123',
      name: 'Netflix',
      amount: '55.90',
      category: 'Assinaturas',
      accountId: 'acc-1',
      creditCardId: null,
      billingCycle: 'monthly',
      status: 'active',
      nextBillingDate: pastDate,
    };

    // Subscriptions query
    const whereSubs = vi.fn().mockResolvedValueOnce([mockSub]);
    const fromSubs = vi.fn().mockReturnValueOnce({ where: whereSubs });

    // Account query
    const mockAccount = { id: 'acc-1', balance: '500.00' };
    const whereAcc = vi.fn().mockResolvedValueOnce([mockAccount]);
    const fromAcc = vi.fn().mockReturnValueOnce({ where: whereAcc });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: fromSubs } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: fromAcc } as unknown as ReturnType<typeof db.select>);

    // Account update mock
    const whereUpdateAcc = vi.fn().mockResolvedValueOnce(undefined);
    const setUpdateAcc = vi.fn().mockReturnValueOnce({ where: whereUpdateAcc });

    // Subscription update mock
    const whereUpdateSub = vi.fn().mockResolvedValueOnce(undefined);
    const setUpdateSub = vi.fn().mockReturnValueOnce({ where: whereUpdateSub });

    vi.mocked(db.update)
      .mockReturnValueOnce({ set: setUpdateAcc } as unknown as ReturnType<typeof db.update>)
      .mockReturnValueOnce({ set: setUpdateSub } as unknown as ReturnType<typeof db.update>);

    // Insert mock
    const valuesInsert = vi.fn().mockResolvedValueOnce(undefined);
    vi.mocked(db.insert).mockReturnValueOnce({ values: valuesInsert } as unknown as ReturnType<typeof db.insert>);

    await processPendingSubscriptions('user-123');

    expect(setUpdateAcc).toHaveBeenCalledWith({ balance: '444.1' });
    expect(valuesInsert).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-123',
      amount: '55.90',
      description: 'Netflix',
      category: 'Assinaturas',
      accountId: 'acc-1',
    }));
    expect(db.update).toHaveBeenCalledTimes(2);
  });
});
