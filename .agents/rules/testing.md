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

## 3. Comandos Importantes
- **Execução Única**: `npx vitest run` para rodar todos os testes do projeto uma única vez.
- **Modo Assistido (Watch)**: `npm run test` (ou `npx vitest`) para manter o runner ativo reexecutando testes mediante alterações de arquivos.
- **Integração Contínua (Local)**: Sempre rode a suíte completa de testes antes de realizar commits, push ou finalizar tarefas.
