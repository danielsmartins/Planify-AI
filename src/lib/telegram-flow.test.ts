import { expect, test, describe } from 'vitest';
import {
  getPaymentMethodSuggestion,
  validateFinancialData,
  buildMissingAmountPrompt,
  revertAccountBalance,
  buildReviewMessage,
  buildReviewKeyboard,
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

describe('Account Balance Reversion Logic', () => {
  test('reverts income by subtracting amount from balance (bug fix verification)', () => {
    // Caso exato do bug reportado pelo usuário:
    // Saldo inicial era 153.19. Entrada indevida somou 145.38 -> 298.57.
    // Ao cancelar, deve subtrair 145.38 e voltar para 153.19.
    const result = revertAccountBalance(298.57, 145.38, 'income');
    expect(result).toBe(153.19);
  });

  test('handles floating point precision cleanly during income reversion', () => {
    const result = revertAccountBalance(298.5699999999998, 145.38, 'income');
    expect(result).toBe(153.19);
  });

  test('reverts expense by adding amount back to balance', () => {
    // Se uma despesa de 50 foi cancelada, saldo de 100 volta para 150
    const result = revertAccountBalance(100, 50, 'expense');
    expect(result).toBe(150);
  });
});

describe('Telegram Review Message & Keyboard Builder', () => {
  const mockCards = [
    { id: 'card-1', name: 'Nubank' },
    { id: 'card-2', name: 'Amazon' }
  ];

  const mockAccounts = [
    { id: 'acc-1', name: 'Santander' },
    { id: 'acc-2', name: 'Mercado Pago' }
  ];

  test('builds review message for expense with suggestion', () => {
    const msg = buildReviewMessage(
      {
        type: 'expense',
        description: 'Investimento',
        amount: 145.38,
        category: 'Investimentos',
      },
      'Sugestão de Conta: *🏦 Mercado Pago*'
    );

    expect(msg).toContain('💸 *Revisão de Transação*');
    expect(msg).toContain('Tipo: *Saída*');
    expect(msg).toContain('Descrição: *Investimento*');
    expect(msg).toContain('Valor: *R$ 145.38*');
    expect(msg).toContain('Sugestão de Conta: *🏦 Mercado Pago*');
  });

  test('builds review message for income without suggestion', () => {
    const msg = buildReviewMessage({
      type: 'income',
      description: 'Salário',
      amount: 1500,
      category: 'Salário',
    });

    expect(msg).toContain('✅ *Revisão de Transação*');
    expect(msg).toContain('Tipo: *Entrada*');
    expect(msg).toContain('Descrição: *Salário*');
  });

  test('builds keyboard for expense including cards, accounts, toggle and cancel', () => {
    const keyboard = buildReviewKeyboard('tx-123', 'expense', mockAccounts, mockCards, 'acc-2', 'card-1');
    const flat = keyboard.inline_keyboard.flat();

    // Cards
    expect(flat.some(btn => btn.text.includes('✨ 💳 Nubank') && btn.callback_data === 'confirm_tx-123_c0')).toBe(true);
    expect(flat.some(btn => btn.text.includes('💳 Amazon') && btn.callback_data === 'confirm_tx-123_c1')).toBe(true);

    // Accounts
    expect(flat.some(btn => btn.text.includes('🏦 Santander') && btn.callback_data === 'confirm_tx-123_a0')).toBe(true);
    expect(flat.some(btn => btn.text.includes('✨ 🏦 Mercado Pago') && btn.callback_data === 'confirm_tx-123_a1')).toBe(true);

    // Toggle button to Income
    expect(flat.some(btn => btn.text === '🔁 Alternar para Entrada' && btn.callback_data === 'toggle_type_tx-123')).toBe(true);

    // Cancel button
    expect(flat.some(btn => btn.text === '❌ Cancelar' && btn.callback_data === 'cancel_tx-123')).toBe(true);
  });

  test('builds keyboard for income including ONLY accounts, toggle to Expense and cancel', () => {
    const keyboard = buildReviewKeyboard('tx-456', 'income', mockAccounts, mockCards, 'acc-1', null);
    const flat = keyboard.inline_keyboard.flat();

    // No cards should be shown for income
    expect(flat.some(btn => btn.text.includes('💳'))).toBe(false);

    // Accounts should be shown
    expect(flat.some(btn => btn.text.includes('✨ 🏦 Santander'))).toBe(true);
    expect(flat.some(btn => btn.text.includes('🏦 Mercado Pago'))).toBe(true);

    // Toggle button to Expense
    expect(flat.some(btn => btn.text === '🔁 Alternar para Saída' && btn.callback_data === 'toggle_type_tx-456')).toBe(true);

    // Cancel button
    expect(flat.some(btn => btn.text === '❌ Cancelar' && btn.callback_data === 'cancel_tx-456')).toBe(true);
  });
});

