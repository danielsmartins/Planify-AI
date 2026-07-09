# Planify AI - Inteligência Financeira SaaS 🚀

O **Planify AI** é um gerenciador financeiro SaaS moderno e inteligente que une o poder da inteligência artificial (Google Gemini) e a simplicidade do **Telegram** para descomplicar a gestão de despesas e receitas.

Com o Planify AI, você não precisa preencher planilhas chatas ou cadastrar cada compra manualmente. Mande um áudio ou texto para o nosso bot do Telegram, envie o PDF de uma fatura de cartão de crédito e a nossa IA cuidará do resto, categorizando e lançando tudo de forma instantânea.

---

## ✨ Funcionalidades Principais (SaaS Core)

*   **🤖 Integração Ativa com Telegram**:
    *   **Lançamentos por Voz ou Texto**: Envie áudios ("gastei 50 reais no mercado agora com cartão") ou textos simples. A IA transcreve, interpreta e lança no sistema.
    *   **Alertas Inteligentes de Limite**: Quando você ultrapassa o orçamento definido para alguma categoria, o bot te notifica proativamente.
*   **📂 Leitura de Fatura PDF por IA**:
    *   Faça upload do PDF da fatura do seu cartão de crédito e o motor do Gemini extrairá automaticamente todas as transações, organizando os dados sem esforço.
*   **🔄 Gestor de Assinaturas (Subscriptions)**:
    *   Monitore despesas fixas recorrentes (Netflix, Spotify, etc.) com geração automática de transações através de uma API de Cron Jobs.
*   **💳 Múltiplas Contas e Carteiras**:
    *   Mantenha saldos de diferentes bancos (Itaú, Nubank, etc.) e dinheiro em espécie de forma unificada e sincronizada.
*   **📊 Consultor IA e Relatórios Executivos**:
    *   A IA analisa o seu comportamento de gastos e gera um relatório gerencial completo em Markdown com análises financeiras e 2 dicas práticas personalizadas.
    *   Exportação de relatórios rápidos diretamente em PDF.

---

## 🛠 Stack Tecnológica

*   **Framework**: Next.js 16 (App Router & Server Actions)
*   **Estilização**: Tailwind CSS v4 (Design System *Sleek & Minimalist*, inspirado em Linear e Shadcn)
*   **Banco de Dados**: PostgreSQL via Neon Serverless
*   **ORM**: Drizzle ORM
*   **Inteligência Artificial**: Google Gemini API (`gemini-2.5-flash` com `responseMimeType: "application/json"`)
*   **Parser de PDF**: `pdf-parse` (com carregamento dinâmico para evitar quebras de build estática)
*   **Autenticação**: Criptografia baseada em tokens JWT (`jose`) nos Cookies HTTP-only
*   **Testes**: Vitest + React Testing Library

---

## 📐 Estrutura do Projeto

*   `src/app`: Rotas da interface gráfica (Painel de Controle, Páginas de Login/Cadastro, Assinaturas, Transações).
*   `src/app/api`: Webhooks e APIs internas:
    *   `/api/telegram`: Processador de mensagens enviadas no Bot.
    *   `/api/import-invoice`: Leitor de PDF e integrador de faturas.
    *   `/api/cron/subscriptions`: Gatilho cron diário de assinaturas.
    *   `/api/ai-report`: Gerador de relatórios do AI Advisor.
*   `src/db`: Configuração, instâncias e schema do banco de dados Drizzle (`src/db/schema.ts`).
*   `src/components`: Componentes visuais de UI de alta performance (gráficos minimalistas com `recharts`).

---

## 🚀 Como Rodar Localmente

### 1. Requisitos
*   Node.js v18 ou superior instalado.
*   Instância de banco PostgreSQL (Neon DB recomendado).
*   Chave de API do Google Gemini (`GEMINI_API_KEY`).
*   Token de Bot do Telegram (`TELEGRAM_BOT_TOKEN`).

### 2. Instalação
Clone o repositório e instale as dependências:
```bash
npm install
```

### 3. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz e configure as chaves necessárias:
```env
DATABASE_URL="postgres://..."
GEMINI_API_KEY="AIzaSy..."
TELEGRAM_BOT_TOKEN="123456:ABC-..."
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="PlanifyAiBot"
JWT_SECRET="sua_chave_secreta_jwt"
```

### 4. Sincronizar o Banco de Dados (Drizzle)
Envie as tabelas para o seu PostgreSQL:
```bash
npm run db:push
```

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000` para visualizar a plataforma.

Para visualizar as tabelas do banco em uma interface gráfica local, execute o Drizzle Studio:
```bash
npm run db:studio
```

---

## 🧪 Suíte de Testes

Para garantir a confiabilidade dos componentes e das funções críticas de IA e parsing, execute a suíte de testes unitários com Vitest:
```bash
npm run test
```
