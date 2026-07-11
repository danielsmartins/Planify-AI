# Regras do Projeto (Controle Financeiro)

As regras abaixo devem ser seguidas estritamente por qualquer agente trabalhando neste projeto:

1. **Next.js App Router**: Todo o roteamento segue o paradigma do App Router (`src/app`). Server Actions devem ser usadas para mutações de dados. Rotas de API (`src/app/api/.../route.ts`) devem ser usadas principalmente para webhooks (como o webhook do WhatsApp).
2. **Estilização Premium (Tailwind CSS)**: O projeto usa **Tailwind CSS**. A interface deve ser **altamente premium** (glassmorphism, dark modes elegantes, gradientes suaves, animações interativas e modernas). Use micro-interações onde fizer sentido.
3. **Drizzle ORM e Neon DB**: Interações com o banco de dados devem usar o Drizzle ORM. O schema fica unicamente em `src/db/schema.ts`. Sempre exporte os tipos do schema para reaproveitamento (ex: `typeof users.$inferSelect`).
4. **Testes Unitários (Vitest)**: Código crítico de regras de negócio, como parsing e interpretação de mensagens financeiras que vierem do WhatsApp, DEVE possuir cobertura de testes automatizados. O ambiente já está configurado com Vitest + Testing Library.
5. **Tipagem e Padrões**: Use TypeScript Strict. Não use `any`. Nomes de arquivos utilitários/hooks em `kebab-case.ts`. Componentes React em `PascalCase.tsx`.
6. **Linter e Builder**: Sempre execute o linter (`npm run lint`) e o build (`npm run build`) para validar a corretude e a ausência de erros de build/tipagem nas alterações feitas antes de finalizar qualquer tarefa, realizar commits ou push.
10. **Sleek & Minimalist Design System (Linear/Shadcn style)**:
    - **Colors**: Dominated by high-contrast dark theme. Dark slate/neutral backgrounds (`bg-neutral-950` / `bg-[#0a0a0a]`), thin borders (`border-neutral-800` / `border-[#1f1f1f]`), and subtle accents (neutral white text, violet/slate-500 buttons). No heavy colorful glowing gradients. Colors are muted and focus is on content.
    - **Typography**: Crisp, clean fonts (Inter/Geist) with strict visual hierarchy. Small muted labels for metadata (`text-neutral-500 text-xs`).
    - **Containers**: Sharp or subtly rounded corners (`rounded-xl` or `rounded-lg`). Borders are solid 1px thin. Avoid heavy shadows; use crisp border separators instead.
    - **Buttons & Interactive**: Standard dark buttons with crisp borders (`bg-neutral-900 border border-neutral-800 text-neutral-100 hover:bg-neutral-800`). Smooth CSS transitions on all hover states.
    - **Aesthetics**: Linear-inspired UI. Clean grids, dense details, elegant empty states with tiny typography. Use Recharts with minimalist styling (thin gridlines, monochrome colors).
