# Regras do Projeto (Controle Financeiro)

Este projeto aplica a técnica de **Progressive Disclosure** nas regras do agente para evitar sobrecarregar a context window do modelo com detalhes desnecessários para a tarefa atual.

---

## 📌 Guia de Diretrizes Sob Demanda

Antes de criar, modificar ou refatorar qualquer parte do código, você **DEVE** ler ativamente o arquivo de regras correspondente à área em que está trabalhando:

1. **Interface & Componentes (Frontend & UI)**:
   - Leia o arquivo [.agents/rules/frontend.md](file:///c:/Users/Daniel/Documents/antigravity/Planify%20AI/.agents/rules/frontend.md) antes de criar ou modificar páginas (`src/app`), componentes de tela, estilos (Tailwind CSS) ou implementar o Linear/Shadcn style design system.
2. **Persistência & Queries (Banco de Dados & ORM)**:
   - Leia o arquivo [.agents/rules/database.md](file:///c:/Users/Daniel/Documents/antigravity/Planify%20AI/.agents/rules/database.md) antes de interagir com tabelas do banco de dados, modificar schemas (`src/db/schema.ts`) ou escrever consultas com o Drizzle ORM.
3. **Qualidade & Regras de Negócio (Testes Automatizados)**:
   - Leia o arquivo [.agents/rules/testing.md](file:///c:/Users/Daniel/Documents/antigravity/Planify%20AI/.agents/rules/testing.md) quando estiver desenvolvendo novas regras de negócio críticas, lógica de parsing de mensagens financeiras ou escrevendo testes unitários.

---

## ⚙️ Regras de Qualidade Obrigatórias (Sempre Ativas)
- **TypeScript Estrito**: Use TypeScript Strict em todo o projeto. **Nunca use `any`**.
- **Linter e Build**: Sempre execute o linter (`npm run lint`) e o build (`npm run build`) para validar a ausência de erros antes de finalizar qualquer tarefa, realizar commits ou push.
