---
name: db-inspector
description: >-
  Inspeciona, consulta e audita dados diretamente no banco de dados Neon DB / PostgreSQL do Planify AI.
  Use esta skill sempre que for necessário verificar dados brutos no banco, diagnosticar discrepâncias em
  cálculos financeiros (saldos, faturas de cartão, despesas planejadas), auditar transações, cartões,
  contas, assinaturas ou executar queries SQL diretas.
---

# Skill: DB Inspector (Neon DB / PostgreSQL)

Esta skill fornece ferramentas e procedimentos para consultar e auditar o banco de dados Neon DB da aplicação Planify AI de forma segura, rápida e padronizada.

---

## 🚀 Como Executar Consultas

Para evitar erros de resolução de módulos ESM ou de variáveis de ambiente no Windows, utilize os scripts utilitários incluídos nesta skill:

### 1. Diagnóstico Completo de Usuário (Recomendado para Divergências Financeiras)
Executa uma auditoria completa das contas, cartões de crédito, assinaturas ativas e últimas transações com cálculo automático de faturas, datas de vencimento e status de quitação:

```powershell
$env:NODE_PATH=".\node_modules"; node --env-file=.env.local .agents/skills/db-inspector/scripts/inspect-user.cjs [email_ou_id_opcional]
```

### 2. Executar Query SQL Customizada
Permite rodar qualquer consulta SQL arbitrária no banco e exibe os resultados em formato de tabela:

```powershell
$env:NODE_PATH=".\node_modules"; node --env-file=.env.local .agents/skills/db-inspector/scripts/query.cjs "SELECT * FROM transactions WHERE user_id = '...' ORDER BY created_at DESC LIMIT 10"
```

---

## 🗄️ Estrutura das Tabelas Principais (Schema)

* **`users`**: Dados cadastrais dos usuários e `telegram_chat_id`.
* **`accounts`**: Contas correntes, carteiras e saldos consolidados (`balance`).
* **`credit_cards`**: Cartões de crédito, dias de fechamento (`closing_day`), vencimento (`due_day`), limite e débito automático (`auto_pay`).
* **`categories`**: Categorias de receitas e despesas vinculadas aos usuários.
* **`transactions`**: Lançamentos financeiros. 
  - `account_id` preenchido e `credit_card_id` nulo: Débito direto em conta.
  - `credit_card_id` preenchido e `account_id` nulo: Despesa no cartão de crédito.
  - Ambos preenchidos (`category = 'Pagamento de Fatura'`): Quitação da fatura do cartão debitando da conta.
* **`installments`**: Registro mestre de compras parceladas.
* **`subscriptions`**: Assinaturas recorrentes ativas, ciclo de faturamento e `next_billing_date`.

---

## ⚠️ Boas Práticas e Segurança

1. **Apenas Leitura por Padrão**: Execute primariamente queries `SELECT` para diagnóstico. Modificações diretas (`UPDATE`/`DELETE`) devem ser realizadas prioritariamente através de Server Actions ou após confirmação explícita.
2. **Ambiente**: O arquivo `.env.local` na raiz contém a variável `DATABASE_URL` necessária para a conexão.
