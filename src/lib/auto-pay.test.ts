import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processAutoPayments } from './auto-pay';
import { db } from '@/db';
import { payCreditCardInvoice } from '@/app/cards/actions';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/app/cards/actions', () => ({
  payCreditCardInvoice: vi.fn(),
}));

describe('processAutoPayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing if no autoPay cards exist', async () => {
    const fromMock = vi.fn().mockReturnValueOnce({ where: vi.fn().mockResolvedValueOnce([]) });
    vi.mocked(db.select).mockReturnValueOnce({ from: fromMock } as unknown as ReturnType<typeof db.select>);

    await processAutoPayments('user-123');
    expect(payCreditCardInvoice).not.toHaveBeenCalled();
  });

  it('skips payment if invoice is already paid', async () => {
    const mockCard = {
      id: 'card-1',
      name: 'Nubank',
      autoPay: true,
      autoPayAccountId: 'acc-1',
      dueDay: '5',
      createdAt: '2026-08-01T00:00:00.000Z',
    };

    let step = 0;
    vi.mocked(db.select).mockImplementation(() => {
      step++;
      if (step === 1) {
        return {
          from: () => ({
            where: () => Promise.resolve([mockCard]),
          }),
        } as unknown as ReturnType<typeof db.select>;
      }
      return {
        from: () => ({
          where: () => Promise.resolve([{ id: 'pay-1' }]),
        }),
      } as unknown as ReturnType<typeof db.select>;
    });

    await processAutoPayments('user-123');
    expect(payCreditCardInvoice).not.toHaveBeenCalled();
  });

  it('triggers payCreditCardInvoice when due date has passed and purchases exist', async () => {
    const mockCard = {
      id: 'card-1',
      name: 'Nubank',
      autoPay: true,
      autoPayAccountId: 'acc-1',
      dueDay: '1',
      createdAt: '2026-08-01T00:00:00.000Z',
    };

    let step = 0;
    vi.mocked(db.select).mockImplementation(() => {
      step++;
      if (step === 1) {
        // Query 1: cards query
        return {
          from: () => ({
            where: () => Promise.resolve([mockCard]),
          }),
        } as unknown as ReturnType<typeof db.select>;
      }
      if (step === 2) {
        // Query 2: existing payments query (returns empty => not paid yet)
        return {
          from: () => ({
            where: () => Promise.resolve([]),
          }),
        } as unknown as ReturnType<typeof db.select>;
      }
      // Query 3: invoice purchases query (returns purchases totaling R$ 200)
      return {
        from: () => ({
          where: () => Promise.resolve([{ amount: '200.00' }]),
        }),
      } as unknown as ReturnType<typeof db.select>;
    });

    await processAutoPayments('user-123');
    expect(payCreditCardInvoice).toHaveBeenCalled();
  });
});
