import { describe, it, expect } from 'vitest';
import { calculateCreditCardDate, getInvoiceDueDateForDate, getInvoiceKey, formatInvoiceMonthYear, getTxDueDate, getInvoiceDueDateFromKey } from './credit-card-helpers';

describe('credit-card-helpers', () => {
  it('calculates transaction due date correctly when dueDay < closingDay', () => {
    // Nubank: fecha dia 25, vence dia 05 do mês seguinte
    const txJuly10 = new Date(2026, 6, 10); // 10 de Julho
    const dueJuly10 = calculateCreditCardDate(txJuly10, 25, 5);
    expect(dueJuly10.getFullYear()).toBe(2026);
    expect(dueJuly10.getMonth()).toBe(7); // Agosto (index 7)
    expect(dueJuly10.getDate()).toBe(5);

    const txJuly28 = new Date(2026, 6, 28); // 28 de Julho
    const dueJuly28 = calculateCreditCardDate(txJuly28, 25, 5);
    expect(dueJuly28.getFullYear()).toBe(2026);
    expect(dueJuly28.getMonth()).toBe(8); // Setembro (index 8)
    expect(dueJuly28.getDate()).toBe(5);
  });

  it('calculates current active invoice due date on today date', () => {
    // Se hoje é 04/08, fechamento 25, vencimento 05:
    // A fatura que vence dia 05/08 ainda não venceu, então a fatura atual é 05/08.
    const todayAug4 = new Date(2026, 7, 4);
    const activeInvoiceDue = getInvoiceDueDateForDate(todayAug4, 25, 5);
    expect(activeInvoiceDue.getFullYear()).toBe(2026);
    expect(activeInvoiceDue.getMonth()).toBe(7); // Agosto
    expect(activeInvoiceDue.getDate()).toBe(5);
    expect(getInvoiceKey(activeInvoiceDue)).toBe('2026-08');

    // Se hoje é 06/08 (> 05/08), a fatura de 05/08 já venceu ontem, então a fatura atual a vencer passa a ser 05/09.
    const todayAug6 = new Date(2026, 7, 6);
    const activeInvoiceDueAug6 = getInvoiceDueDateForDate(todayAug6, 25, 5);
    expect(activeInvoiceDueAug6.getFullYear()).toBe(2026);
    expect(activeInvoiceDueAug6.getMonth()).toBe(8); // Setembro
    expect(activeInvoiceDueAug6.getDate()).toBe(5);
    expect(getInvoiceKey(activeInvoiceDueAug6)).toBe('2026-09');
  });

  it('calculates due date when dueDay > closingDay', () => {
    // Fechamento 10, vencimento 20 (mesmo mês)
    const txJuly5 = new Date(2026, 6, 5);
    const dueJuly5 = calculateCreditCardDate(txJuly5, 10, 20);
    expect(dueJuly5.getFullYear()).toBe(2026);
    expect(dueJuly5.getMonth()).toBe(6); // Julho
    expect(dueJuly5.getDate()).toBe(20);

    const txJuly15 = new Date(2026, 6, 15);
    const dueJuly15 = calculateCreditCardDate(txJuly15, 10, 20);
    expect(dueJuly15.getFullYear()).toBe(2026);
    expect(dueJuly15.getMonth()).toBe(7); // Agosto
    expect(dueJuly15.getDate()).toBe(20);
  });

  it('formats invoice key correctly', () => {
    expect(formatInvoiceMonthYear('2026-08')).toBe('Agosto de 2026');
    expect(formatInvoiceMonthYear('2026-12')).toBe('Dezembro de 2026');
  });

  it('calculates due date from invoice key YYYY-MM', () => {
    const dueDateAug = getInvoiceDueDateFromKey('2026-08', 12);
    expect(dueDateAug.getFullYear()).toBe(2026);
    expect(dueDateAug.getMonth()).toBe(7); // Agosto
    expect(dueDateAug.getDate()).toBe(12);

    const dueDateFebShort = getInvoiceDueDateFromKey('2026-02', 31);
    expect(dueDateFebShort.getFullYear()).toBe(2026);
    expect(dueDateFebShort.getMonth()).toBe(1); // Fevereiro
    expect(dueDateFebShort.getDate()).toBe(28); // Clamped to 28
  });

  it('assigns purchase after closing day to the next invoice (e.g. July 18 purchase on Nubank closes Aug 5, due Aug 12)', () => {
    // Nubank: Fechamento dia 05, Vencimento dia 12
    // Compra em 18 de Julho (após 05/07) pertence à fatura que fecha em 05/08 e vence em 12/08 (Fatura de Agosto)
    const tx = { createdAt: '2026-07-18T12:00:00.000Z', dueDate: null };
    const dueDate = getTxDueDate(tx, 5, 12);
    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(7); // Agosto (index 7)
    expect(dueDate.getDate()).toBe(12);
    expect(getInvoiceKey(dueDate)).toBe('2026-08');

    // Quando a transação já tem dueDate explícito
    const txWithDueDate = { createdAt: '2026-07-18T12:00:00.000Z', dueDate: '2026-08-12T12:00:00.000Z' };
    const explicitDueDate = getTxDueDate(txWithDueDate, 5, 12);
    expect(explicitDueDate.getFullYear()).toBe(2026);
    expect(explicitDueDate.getMonth()).toBe(7);
    expect(explicitDueDate.getDate()).toBe(12);
  });
});

