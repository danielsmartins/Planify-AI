import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MonthlyChart } from './MonthlyChart';

vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

describe('MonthlyChart component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty state when data array is empty', () => {
    render(<MonthlyChart data={[]} />);
    expect(screen.getByText('Não há transações suficientes para gerar o gráfico histórico.')).toBeInTheDocument();
  });

  it('renders default comparison view with chart data', () => {
    const mockData = [
      { month: '07/2026', income: 1600.71, expense: 1441.9, invested: 236.37 },
      { month: '08/2026', income: 1639.95, expense: 1679.06, invested: 361.8 },
    ];

    render(<MonthlyChart data={mockData} />);

    expect(screen.getByRole('heading', { name: 'Entradas vs Saídas' })).toBeInTheDocument();
    expect(screen.getByText('Comparativo mensal de receitas e despesas')).toBeInTheDocument();
  });

  it('toggles to net savings view (Resultado Líquido) on button click', () => {
    const mockData = [
      { month: '07/2026', income: 1600.71, expense: 1441.9, invested: 236.37 },
      { month: '08/2026', income: 1639.95, expense: 1679.06, invested: 361.8 },
    ];

    render(<MonthlyChart data={mockData} />);

    const netButton = screen.getByRole('button', { name: /Resultado Líquido/i });
    fireEvent.click(netButton);

    expect(screen.getByRole('heading', { name: 'Resultado Líquido Mensal' })).toBeInTheDocument();
    expect(screen.getByText(/Superávit \(verde\) e Déficit \(vermelho\)/i)).toBeInTheDocument();

    const comparisonButton = screen.getByRole('button', { name: /Entradas vs Saídas/i });
    fireEvent.click(comparisonButton);

    expect(screen.getByRole('heading', { name: 'Entradas vs Saídas' })).toBeInTheDocument();
  });
});
