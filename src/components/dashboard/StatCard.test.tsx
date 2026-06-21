import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { StatCard } from './StatCard';
import { Wallet } from 'lucide-react';

test('renders StatCard component with correct title and amount', () => {
  render(<StatCard title="Saldo Atual" amount="R$ 100,00" icon={Wallet} />);
  
  expect(screen.getByText('Saldo Atual')).toBeInTheDocument();
  expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
});
