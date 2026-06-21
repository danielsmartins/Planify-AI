# Regras do Projeto (Controle Financeiro)

As regras abaixo devem ser seguidas estritamente por qualquer agente (como eu, Antigravity) trabalhando neste projeto:

1. **Next.js App Router**: Todo o roteamento segue o paradigma do App Router (`src/app`). Server Actions devem ser usadas para mutações de dados. Rotas de API (`src/app/api/.../route.ts`) devem ser usadas principalmente para webhooks (como o webhook do WhatsApp).
2. **Estilização Premium (Tailwind CSS)**: O projeto usa **Tailwind CSS**. A interface deve ser **altamente premium** (glassmorphism, dark modes elegantes, gradientes suaves, animações interativas e modernas). Use micro-interações onde fizer sentido.
3. **Drizzle ORM e Neon DB**: Interações com o banco de dados devem usar o Drizzle ORM. O schema fica unicamente em `src/db/schema.ts`. Sempre exporte os tipos do schema para reaproveitamento (ex: `typeof users.$inferSelect`).
4. **Testes Unitários (Vitest)**: Código crítico de regras de negócio, como parsing e interpretação de mensagens financeiras que vierem do WhatsApp, DEVE possuir cobertura de testes automatizados. O ambiente já está configurado com Vitest + Testing Library.
5. **Tipagem e Padrões**: Use TypeScript Strict. Não use `any`. Nomes de arquivos utilitários/hooks em `kebab-case.ts`. Componentes React em `PascalCase.tsx`.
