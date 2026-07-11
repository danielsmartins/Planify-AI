import { expect, test, describe } from 'vitest';
import { getPaymentMethodSuggestion } from '@/lib/telegram-utils';

describe('Telegram Suggestion Logic', () => {
  const mockCards = [
    { id: 'card-1', name: 'Nubank' },
    { id: 'card-2', name: 'XP' }
  ];

  const mockAccounts = [
    { id: 'acc-1', name: 'Itaú' },
    { id: 'acc-2', name: 'Inter' }
  ];

  test('suggests card when mentioned in message text', () => {
    const result = getPaymentMethodSuggestion(
      'Gastei 50 no Nubank ontem',
      mockCards,
      mockAccounts
    );
    expect(result.cardId).toBe('card-1');
    expect(result.accountId).toBeNull();
  });

  test('suggests account when mentioned in message text', () => {
    const result = getPaymentMethodSuggestion(
      'Recebi meu pagamento no Itaú',
      mockCards,
      mockAccounts
    );
    expect(result.cardId).toBeNull();
    expect(result.accountId).toBe('acc-1');
  });

  test('uses AI suggestion over message text matching if available', () => {
    const result = getPaymentMethodSuggestion(
      'Comprei pão',
      mockCards,
      mockAccounts,
      'XP'
    );
    expect(result.cardId).toBe('card-2');
    expect(result.accountId).toBeNull();
  });

  test('falls back to credit card when credit keywords are present', () => {
    const result = getPaymentMethodSuggestion(
      'Comprei no crédito',
      mockCards,
      mockAccounts
    );
    expect(result.cardId).toBe('card-1');
    expect(result.accountId).toBeNull();
  });

  test('falls back to account when credit keywords are not present and account is available', () => {
    const result = getPaymentMethodSuggestion(
      'Comprei pão',
      mockCards,
      mockAccounts
    );
    expect(result.cardId).toBeNull();
    expect(result.accountId).toBe('acc-1');
  });
});
