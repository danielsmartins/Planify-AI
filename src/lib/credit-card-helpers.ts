/**
 * Utilitários e helpers para cálculo, agrupamento e navegação de faturas de cartão de crédito
 */


export function calculateCreditCardDate(baseDate: Date, closingDay: number, dueDay: number): Date {
  const resultDate = new Date(baseDate);
  const day = resultDate.getDate();
  
  let closingMonth = resultDate.getMonth();
  let closingYear = resultDate.getFullYear();

  if (day >= closingDay) {
    closingMonth += 1;
    if (closingMonth > 11) {
      closingMonth = 0;
      closingYear += 1;
    }
  }

  let dueMonth = closingMonth;
  let dueYear = closingYear;

  if (dueDay <= closingDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }

  const daysInDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
  const actualDueDay = Math.min(dueDay, daysInDueMonth);

  return new Date(dueYear, dueMonth, actualDueDay, 12, 0, 0, 0);
}

export function getInvoiceDueDateForDate(now: Date, closingDay: number, dueDay: number): Date {
  const currentDay = now.getDate();
  let closingMonth = now.getMonth();
  let closingYear = now.getFullYear();

  if (currentDay < closingDay) {
    closingMonth -= 1;
    if (closingMonth < 0) {
      closingMonth = 11;
      closingYear -= 1;
    }
  }

  let dueMonth = closingMonth;
  let dueYear = closingYear;

  if (dueDay <= closingDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }

  const daysInDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
  const actualDueDay = Math.min(dueDay, daysInDueMonth);

  return new Date(dueYear, dueMonth, actualDueDay, 12, 0, 0, 0);
}

export function getInvoiceKey(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

export function formatInvoiceMonthYear(invoiceKey: string): string {
  const [yearStr, monthStr] = invoiceKey.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;
  const d = new Date(year, month, 1);
  const monthName = d.toLocaleDateString('pt-BR', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
}

export function getTxDueDate(
  t: { dueDate?: string | Date | null; createdAt: string | Date },
  closingDay: number,
  dueDay: number
): Date {
  if (t.dueDate) {
    return new Date(t.dueDate);
  }
  return calculateCreditCardDate(new Date(t.createdAt), closingDay, dueDay);
}

