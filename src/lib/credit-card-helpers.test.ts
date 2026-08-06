import { describe, it, expect } from 'vitest';
import { calculateCreditCardDate, getInvoiceDueDateForDate, getInvoiceKey, formatInvoiceMonthYear } from './credit-card-helpers';

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
    // Se hoje é 06/08, fechamento 25, vencimento 05:
    // A fatura que fechou dia 25/07 tinha vencimento dia 05/08.
    // Como hoje é 06/08 (< 25), o mês mais recente de fechamento é Julho (25/07), vencimento 05/08.
    const todayAug6 = new Date(2026, 7, 6);
    const activeInvoiceDue = getInvoiceDueDateForDate(todayAug6, 25, 5);
    expect(activeInvoiceDue.getFullYear()).toBe(2026);
    expect(activeInvoiceDue.getMonth()).toBe(7); // Agosto
    expect(activeInvoiceDue.getDate()).toBe(5);
    expect(getInvoiceKey(activeInvoiceDue)).toBe('2026-08');

    // Se hoje é 26/08 (>= 25), a fatura que fechou dia 25/08 vence dia 05/09.
    const todayAug26 = new Date(2026, 7, 26);
    const activeInvoiceDueAug26 = getInvoiceDueDateForDate(todayAug26, 25, 5);
    expect(activeInvoiceDueAug26.getFullYear()).toBe(2026);
    expect(activeInvoiceDueAug26.getMonth()).toBe(8); // Setembro
    expect(activeInvoiceDueAug26.getDate()).toBe(5);
    expect(getInvoiceKey(activeInvoiceDueAug26)).toBe('2026-09');
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
});
