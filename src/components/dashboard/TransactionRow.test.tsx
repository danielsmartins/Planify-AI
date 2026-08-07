import { render, screen } from '@testing-library/react';
import { expect, test, describe, vi } from 'vitest';
import { TransactionRow } from './TransactionRow';

vi.mock('@/app/actions', () => ({
  deleteTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}));

describe('TransactionRow component', () => {
  test('renders income transaction correctly with positive sign and RECEBIDO badge', () => {
    render(
      <table>
        <tbody>
          <TransactionRow
            id="tx-1"
            date="20/07/2026"
            description="Salário Quinzena"
            category="Salário"
            amount="850.71"
            type="income"
            layout="table"
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Salário Quinzena')).toBeInTheDocument();
    expect(screen.getByText(/\+R\$\s*850,71/)).toBeInTheDocument();
    expect(screen.getByText('RECEBIDO')).toBeInTheDocument();
  });

  test('renders expense transaction correctly with minus sign and PAGO badge', () => {
    render(
      <table>
        <tbody>
          <TransactionRow
            id="tx-2"
            date="18/07/2026"
            description="Lanche"
            category="Alimentação"
            amount="14.75"
            type="expense"
            layout="table"
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Lanche')).toBeInTheDocument();
    expect(screen.getByText(/-R\$\s*14,75/)).toBeInTheDocument();
    expect(screen.getByText('PAGO')).toBeInTheDocument();
  });

  test('renders credit card invoice payment neutrally without minus sign and with LIQUIDADO badge', () => {
    render(
      <table>
        <tbody>
          <TransactionRow
            id="tx-3"
            date="07/08/2026"
            description="Pagamento de Fatura - Nubank"
            category="Pagamento de Fatura"
            amount="1100.88"
            type="expense"
            accountId="acc-1"
            creditCardId="card-1"
            layout="table"
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Pagamento de Fatura - Nubank')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.100,88/)).toBeInTheDocument();
    expect(screen.queryByText(/-R\$\s*1\.100,88/)).not.toBeInTheDocument();
    expect(screen.getByText('LIQUIDADO')).toBeInTheDocument();
  });

  test('renders projected transaction with PREVISTO badge', () => {
    render(
      <table>
        <tbody>
          <TransactionRow
            id="tx-4"
            date="25/08/2026"
            description="Academia"
            category="Saúde"
            amount="89.90"
            type="expense"
            isProjected={true}
            layout="table"
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Academia')).toBeInTheDocument();
    expect(screen.getByText('PREVISTO')).toBeInTheDocument();
  });
});
