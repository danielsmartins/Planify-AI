# Controle Financeiro com WhatsApp

Um aplicativo web moderno de controle financeiro com integração via WhatsApp, construído com Next.js, Drizzle ORM e Neon DB.

## 🛠 Stack Tecnológica
- **Framework**: Next.js 16+ (App Router)
- **Estilização**: Tailwind CSS (estilo premium focado em dark mode e glassmorphism)
- **Banco de Dados**: PostgreSQL via Neon Serverless
- **ORM**: Drizzle ORM
- **Testes**: Vitest + Testing Library
- **CI/CD**: GitHub Actions

## 📐 Arquitetura
O sistema utiliza a arquitetura Full-Stack do Next.js:
- `src/app`: Rotas da interface gráfica (Painel de Controle).
- `src/app/api`: Webhooks e APIs para recebimento das mensagens do WhatsApp.
- `src/db`: Configuração, instâncias e schema do banco de dados Drizzle.
- `src/components`: Componentes reutilizáveis da UI.

## 🚀 Como Instalar

1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env.local` na raiz e configure sua string de conexão:
   ```env
   DATABASE_URL="postgres://usuario:senha@seu-host.neon.tech/nome_do_banco"
   ```

## 💻 Como Rodar Localmente

Para iniciar o servidor de desenvolvimento:
```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

Para sincronizar seu banco de dados:
```bash
npm run db:push
```
Para abrir o Drizzle Studio e ver os dados localmente:
```bash
npm run db:studio
```

## 🧪 Comandos de Teste

Rodar a suíte de testes unitários:
```bash
npm run test
```

## 📝 Padrões e Convenções da Codebase
- **Nomenclatura**: Arquivos TS/JS em kebab-case (exceto componentes React que usam PascalCase).
- **Importações**: Utilize o alias `@/` para arquivos dentro de `src/`.
- **Componentes**: Utilize Server Components como padrão, adicione `'use client'` apenas onde houver interatividade (hooks).
- **Banco de Dados**: Sempre realize alterações de tabela no arquivo `src/db/schema.ts` e rode `npm run db:push`.
