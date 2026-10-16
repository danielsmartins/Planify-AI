import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { CategoryPieChart } from './CategoryPieChart';

vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

describe('CategoryPieChart component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty state when all data is empty', () => {
    render(<CategoryPieChart data={[]} allTimeData={[]} />);
    expect(screen.getByText('Nenhuma despesa encontrada para o período.')).toBeInTheDocument();
  });

  it('renders all-time data by default', () => {
    const allTimeData = [
      { name: 'Alimentação', value: 500, color: '#ef4444' },
      { name: 'Investimentos', value: 300, color: '#0ea5e9' },
    ];

    render(
      <CategoryPieChart
        allTimeData={allTimeData}
        monthlyData={{}}
        availableMonths={['10/2026', '09/2026']}
      />
    );

    expect(screen.getByRole('heading', { name: 'Despesas por Categoria' })).toBeInTheDocument();
    expect(screen.getByText('Total acumulado em todo o histórico')).toBeInTheDocument();
    expect(screen.getByText('R$ 800,00')).toBeInTheDocument();
  });

  it('switches to a specific month when selected', () => {
    const allTimeData = [
      { name: 'Alimentação', value: 500, color: '#ef4444' },
      { name: 'Investimentos', value: 300, color: '#0ea5e9' },
    ];

    const monthlyData = {
      '10/2026': [
        { name: 'Alimentação', value: 200, color: '#ef4444' },
      ],
      '09/2026': [
        { name: 'Investimentos', value: 150, color: '#0ea5e9' },
      ],
    };

    render(
      <CategoryPieChart
        allTimeData={allTimeData}
        monthlyData={monthlyData}
        availableMonths={['10/2026', '09/2026']}
      />
    );

    const select = screen.getByLabelText('Filtrar categoria por mês');
    fireEvent.change(select, { target: { value: '10/2026' } });

    expect(screen.getByText('Distribuição de gastos em 10/2026')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
  });

  it('renders empty message for a month with no data', () => {
    render(
      <CategoryPieChart
        allTimeData={[{ name: 'Lazer', value: 100, color: '#8b5cf6' }]}
        monthlyData={{}}
        availableMonths={['07/2026']}
      />
    );

    const select = screen.getByLabelText('Filtrar categoria por mês');
    fireEvent.change(select, { target: { value: '07/2026' } });

    expect(screen.getByText('Nenhuma despesa encontrada para 07/2026.')).toBeInTheDocument();
  });
});
