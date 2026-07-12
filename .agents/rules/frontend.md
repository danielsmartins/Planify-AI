# Diretrizes de Frontend (Next.js, Tailwind CSS & Design System)

Este arquivo contém as regras específicas para modificações de interface e lógica de frontend da aplicação. Leia este arquivo sempre que estiver criando ou editando páginas, componentes ou estilos.

---

## 1. Estrutura e Roteamento
- **Next.js App Router**: Todo o roteamento e páginas ficam localizados em `src/app`.
- **Mutações de Dados**: Utilize **Server Actions** (`use server` em arquivos separados ou no topo de funções do servidor) para realizar qualquer mutação de dados (criação, edição, exclusão).
- **Rotas de API**: Rotas de API (`src/app/api/.../route.ts`) devem ser criadas prioritariamente para webhooks externos (como o webhook do WhatsApp ou do Telegram) ou integrações que não se beneficiem do Server Actions.
- **Padrões de Nomes de Arquivos**:
  - Componentes React devem ser salvos em `PascalCase.tsx`.
  - Arquivos utilitários, hooks personalizados e rotas em `kebab-case.ts`.

---

## 2. Design System: Sleek & Minimalist (Linear/Shadcn Style)
A interface do Planify AI deve seguir uma estética altamente premium e limpa, inspirada em plataformas modernas como Linear e Shadcn UI:

### A. Paleta de Cores
- **Tema Escuro de Alto Contraste**: Fundo principal totalmente escuro (`bg-[#000000]`), painéis em cinza neutro muito escuro (`bg-neutral-950` ou `bg-[#0a0a0a]`).
- **Bordas**: Linhas sólidas de 1px bem finas (`border-neutral-800` ou `border-[#1f1f1f]`). Evite sombras carregadas; prefira separadores nítidos.
- **Destaques & Acentos**: Texto principal em branco neutro ou cinza claro (`text-neutral-100` / `text-slate-100`). Botões de destaque com cores suaves (Violet `#8b5cf6`, Slate `#64748b`). Evite gradientes multicoloridos excessivamente chamativos. O foco deve ser o conteúdo.

### B. Tipografia & Hierarquia
- **Fontes**: Use fontes limpas e modernas como **Geist** ou **Inter** (configuradas no layout global).
- **Metadados**: Textos auxiliares e descrições pequenas devem usar tons de cinza médio e tamanhos compactos (`text-neutral-500 text-xs`).

### C. Containers & Componentes
- **Bordas**: Cantos levemente arredondados (`rounded-xl` ou `rounded-lg`).
- **Botões**:
  - Botão Principal/Confirmar: Fundo claro/branco com texto escuro para alto destaque (`bg-white hover:bg-neutral-200 text-black`).
  - Botão Secundário/Dark: Fundo escuro com bordas nítidas (`bg-neutral-900 border border-neutral-800 text-neutral-100 hover:bg-neutral-800`).
  - Transições: Adicione transições CSS suaves (`transition-all`, `transition-colors`) em todos os estados de hover.

### D. Gráficos & Estética Visual
- **Telas Vazias (Empty States)**: Devem ser elegantes, com tipografia pequena e minimalista, explicando claramente o estado atual.
- Gráficos no Recharts devem utilizar estilos simples, linhas de grade finas (`stroke-dasharray="3 3"` com cor neutra escura) e paletas monocromáticas ou discretas.
