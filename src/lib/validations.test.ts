import { describe, expect, it } from 'vitest';
import {
  loginSchema,
  registerSchema,
  transactionSchema,
  accountSchema,
  creditCardSchema,
  categorySchema,
  subscriptionSchema,
} from './validations';

describe('Validation Schemas (validations.ts)', () => {
  describe('loginSchema', () => {
    it('validates correct email and password', () => {
      const res = loginSchema.safeParse({ identifier: 'test@example.com', password: 'secretpassword' });
      expect(res.success).toBe(true);
    });

    it('rejects empty identifier or password', () => {
      const res = loginSchema.safeParse({ identifier: '', password: '' });
      expect(res.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('validates a valid registration payload', () => {
      const res = registerSchema.safeParse({
        name: 'Daniel Silva',
        email: 'daniel@example.com',
        password: 'password123',
        age: 28,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe('Daniel Silva');
        expect(res.data.age).toBe(28);
      }
    });

    it('rejects too short name or password', () => {
      const res = registerSchema.safeParse({
        name: 'A',
        email: 'invalid-email',
        password: '123',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('transactionSchema', () => {
    it('validates income transaction', () => {
      const res = transactionSchema.safeParse({
        amount: '150.50',
        description: 'Freelance',
        type: 'income',
        category: 'Salário',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.amount).toBe(150.5);
        expect(res.data.type).toBe('income');
        expect(res.data.category).toBe('Salário');
      }
    });

    it('defaults category to Receita if empty', () => {
      const res = transactionSchema.safeParse({
        amount: '200',
        description: 'Venda',
        type: 'income',
        category: '',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.category).toBe('Receita');
      }
    });

    it('rejects negative or zero amount', () => {
      const res = transactionSchema.safeParse({
        amount: '-50',
        description: 'Lanche',
        type: 'expense',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('accountSchema', () => {
    it('validates account data properly', () => {
      const res = accountSchema.safeParse({
        name: 'Nubank',
        type: 'checking',
        color: '#8b5cf6',
        balance: '500.25',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.balance).toBe(500.25);
        expect(res.data.type).toBe('checking');
      }
    });
  });

  describe('creditCardSchema', () => {
    it('validates credit card data and parses autoPay', () => {
      const res = creditCardSchema.safeParse({
        name: 'Mastercard Black',
        color: '#1e293b',
        closingDay: '10',
        dueDay: '15',
        limitAmount: '5000',
        brand: 'mastercard',
        autoPay: 'true',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.closingDay).toBe(10);
        expect(res.data.dueDay).toBe(15);
        expect(res.data.autoPay).toBe(true);
      }
    });

    it('rejects invalid closing day', () => {
      const res = creditCardSchema.safeParse({
        name: 'Cartão',
        color: '#000',
        closingDay: '35',
        dueDay: '10',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('categorySchema', () => {
    it('validates category with limit', () => {
      const res = categorySchema.safeParse({
        name: 'Investimentos',
        color: '#0ea5e9',
        monthlyLimit: '500',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe('Investimentos');
        expect(res.data.monthlyLimit).toBe(500);
      }
    });
  });

  describe('subscriptionSchema', () => {
    it('validates recurring subscription', () => {
      const res = subscriptionSchema.safeParse({
        name: 'Spotify',
        amount: '21.90',
        category: 'Lazer',
        billingCycle: 'monthly',
        nextBillingDate: '2026-11-01',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.amount).toBe(21.9);
        expect(res.data.billingCycle).toBe('monthly');
        expect(res.data.nextBillingDate instanceof Date).toBe(true);
      }
    });
  });
});
