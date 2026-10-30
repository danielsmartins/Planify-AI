-- Migration: 0001_security_rls_policies.sql
-- Descrição: Ativação de Row Level Security (RLS) e criação de policies de isolamento por usuário
-- Aplicação: Executado no PostgreSQL (Neon DB)

-- 1. Habilitar RLS em todas as tabelas do schema público
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas preexistentes (idempotência)
DROP POLICY IF EXISTS users_isolation ON users;
DROP POLICY IF EXISTS accounts_isolation ON accounts;
DROP POLICY IF EXISTS credit_cards_isolation ON credit_cards;
DROP POLICY IF EXISTS categories_isolation ON categories;
DROP POLICY IF EXISTS installments_isolation ON installments;
DROP POLICY IF EXISTS transactions_isolation ON transactions;
DROP POLICY IF EXISTS subscriptions_isolation ON subscriptions;

-- 3. Políticas de isolamento por usuário baseadas em app.current_user_id
CREATE POLICY users_isolation ON users
  FOR ALL
  USING (id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY accounts_isolation ON accounts
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY credit_cards_isolation ON credit_cards
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY categories_isolation ON categories
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY installments_isolation ON installments
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY transactions_isolation ON transactions
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY subscriptions_isolation ON subscriptions
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
