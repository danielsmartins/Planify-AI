import { expect, test, describe } from 'vitest';
import {
  getPaymentMethodSuggestion,
  validateFinancialData,
  buildMissingAmountPrompt,
} from '@/lib/telegram-utils';

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

describe('Telegram Financial Data Validation', () => {
  test('handles case where user forgets amount (e.g. corte de cabelo pix mercado pago)', () => {
    const aiOutput = {
      amount: null,
      description: 'Corte de cabelo',
      category: 'Serviços',
      type: 'expense',
      paymentMethodSuggestion: 'Mercado Pago',
    };

    const validation = validateFinancialData(aiOutput);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.reason).toBe('missing_amount');
      expect(validation.description).toBe('Corte de cabelo');
      expect(validation.paymentMethodSuggestion).toBe('Mercado Pago');
    }
  });

  test('returns reason "empty" when data is null or undefined or not an object', () => {
    expect(validateFinancialData(null).valid).toBe(false);
    expect(validateFinancialData(undefined).valid).toBe(false);
    expect(validateFinancialData('invalid').valid).toBe(false);
  });

  test('rejects zero or negative or NaN amounts', () => {
    expect(validateFinancialData({ amount: 0, description: 'Teste' })).toMatchObject({
      valid: false,
      reason: 'missing_amount',
    });
    expect(validateFinancialData({ amount: -15, description: 'Teste' })).toMatchObject({
      valid: false,
      reason: 'missing_amount',
    });
    expect(validateFinancialData({ amount: 'invalid-number', description: 'Teste' })).toMatchObject({
      valid: false,
      reason: 'missing_amount',
    });
  });

  test('successfully validates normal transaction with positive amount', () => {
    const aiOutput = {
      amount: 35.5,
      description: 'Corte de cabelo',
      category: 'Cuidados Pessoais',
      type: 'expense',
      paymentMethodSuggestion: 'Mercado Pago',
    };

    const validation = validateFinancialData(aiOutput);
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.data.amount).toBe(35.5);
      expect(validation.data.description).toBe('Corte de cabelo');
      expect(validation.data.category).toBe('Cuidados Pessoais');
      expect(validation.data.type).toBe('expense');
      expect(validation.data.paymentMethodSuggestion).toBe('Mercado Pago');
    }
  });

  test('successfully validates installment transaction', () => {
    const aiOutput = {
      amount: 150,
      description: 'Geladeira',
      category: 'Casa',
      type: 'expense',
      isInstallment: true,
      installmentsCount: 10,
      currentInstallment: 1,
    };

    const validation = validateFinancialData(aiOutput);
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.data.amount).toBe(150);
      expect(validation.data.isInstallment).toBe(true);
      expect(validation.data.installmentsCount).toBe(10);
    }
  });
});

describe('Missing Amount Prompt Builder', () => {
  test('generates prompt with description and payment suggestion for text message', () => {
    const prompt = buildMissingAmountPrompt('Corte de cabelo', 'Mercado Pago', false);
    expect(prompt).toContain('*Corte de cabelo*');
    expect(prompt).toContain('não encontrei o *valor* da transação');
    expect(prompt).toContain('`Corte de cabelo 50 reais no Mercado Pago`');
  });

  test('generates prompt with voice hint when isVoice is true', () => {
    const prompt = buildMissingAmountPrompt('Almoço', undefined, true);
    expect(prompt).toContain('*Almoço*');
    expect(prompt).toContain('não encontrei o *valor* no seu áudio');
    expect(prompt).toContain('`Almoço 50 reais`');
  });

  test('generates fallback prompt when description is not present', () => {
    const prompt = buildMissingAmountPrompt(undefined, undefined, false);
    expect(prompt).toContain('essa transação');
    expect(prompt).toContain('`Uber 25 reais`');
  });
});
