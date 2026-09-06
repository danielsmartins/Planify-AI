# Diretrizes de Testes Automatizados (Vitest & Testing Library)

Este arquivo contém as regras específicas para testes automatizados da aplicação. Leia este arquivo sempre que criar novas funcionalidades críticas, regras de negócio ou componentes interativos complexos.

---

## 1. Cobertura Obrigatória de Regras de Negócio
- **Código Crítico**: Regras de negócio essenciais, especialmente **parsing e interpretação de mensagens financeiras** (que vierem do bot de WhatsApp/Telegram), recálculos de saldos ou datas de faturas, **DEVEM** ter cobertura de testes unitários.
- **Evitar Regressões**: Se você refatorar uma função contida em arquivos utilitários com arquivos de teste correspondentes, execute os testes imediatamente para certificar-se de que nada quebrou.

---

## 2. Padrões de Escrita
- **Framework**: O ambiente utiliza **Vitest** como runner e test framework principal, integrado com `@testing-library/react` para componentes de tela.
- **Convenções**:
  - Salve arquivos de teste como `*.test.ts` (para lógica pura) ou `*.test.tsx` (para componentes React).
  - Use `describe()` para agrupar cenários de teste lógicos.
  - Use `test()` ou `it()` para definir asserções específicas.
  - Faça asserções claras e detalhadas utilizando as APIs do `expect()`.

---

## 3. Quality Gate & Cobertura de Testes
- **Exclusividade do CI/CD**: O **Quality Gate roda exclusivamente via pipeline CI/CD no GitHub**. **NUNCA execute `npm run quality-gate` nem `node scripts/quality-gate.js` localmente**, e **NUNCA execute `--update-baseline` nem modifique `.quality-gate-baseline.json`**.
- **Ampliação da Cobertura**: Sempre que criar novas funções utilitárias ou refatorar componentes/lógicas de negócio, crie arquivos de testes em `src/lib/*.test.ts` ou `src/components/*.test.tsx` visando elevar gradualmente a cobertura de testes do projeto.
- **Validação Local**: Para validar localmente antes de commits ou PRs, utilize apenas testes unitários (`npx vitest run`), linter (`npm run lint`) e build (`npm run build`).

---

## 4. Comandos Importantes
- **Execução Única dos Testes**: `npx vitest run` para rodar todos os testes do projeto uma única vez.
- **Execução com Cobertura**: `npm run test:coverage` para inspecionar métricas de cobertura de código localmente via Vitest.
- **Modo Assistido (Watch)**: `npm run test` (ou `npx vitest`) para manter o runner ativo reexecutando testes mediante alterações de arquivos.
- **Integração Contínua (Local)**: Sempre rode `npx vitest run`, `npm run lint` e `npm run build` antes de realizar commits, push ou finalizar tarefas.
