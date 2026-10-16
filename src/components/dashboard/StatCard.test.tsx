import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

describe('StatCard component', () => {
  it('renders with correct title and amount', () => {
    render(<StatCard title="Saldo Atual" amount="R$ 100,00" icon={Wallet} />);
    expect(screen.getByText('Saldo Atual')).toBeInTheDocument();
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
  });

  it('renders with subtitle and badge', () => {
    render(
      <StatCard
        title="Investimentos"
        amount="R$ 500,00"
        icon={Wallet}
        subtitle="Patrimônio acumulado"
        badge="Poupado"
      />
    );
    expect(screen.getByText('Investimentos')).toBeInTheDocument();
    expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    expect(screen.getByText('Patrimônio acumulado')).toBeInTheDocument();
    expect(screen.getByText('Poupado')).toBeInTheDocument();
  });

  it('renders with positive trend', () => {
    render(
      <StatCard
        title="Receitas"
        amount="R$ 2.000,00"
        icon={TrendingUp}
        trend="up"
        trendValue="15%"
      />
    );
    expect(screen.getByText(/↑ 15%/)).toBeInTheDocument();
    expect(screen.getByText('vs último mês')).toBeInTheDocument();
  });

  it('renders with negative trend', () => {
    render(
      <StatCard
        title="Despesas"
        amount="R$ 1.200,00"
        icon={TrendingDown}
        trend="down"
        trendValue="8%"
      />
    );
    expect(screen.getByText(/↓ 8%/)).toBeInTheDocument();
  });

  it('renders with neutral trend', () => {
    render(
      <StatCard
        title="Gastos Fixos"
        amount="R$ 800,00"
        icon={Wallet}
        trend="neutral"
        trendValue="0%"
      />
    );
    expect(screen.getByText(/- 0%/)).toBeInTheDocument();
  });

  it('renders accent styling when isAccent is true', () => {
    const { container } = render(
      <StatCard
        title="Taxa de Poupança"
        amount="20%"
        icon={Wallet}
        isAccent
      />
    );
    expect(container.querySelector('.border-brand\\/30')).toBeInTheDocument();
  });
});
