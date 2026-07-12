# Diretrizes de Banco de Dados (Drizzle ORM & Neon DB)

Este arquivo contém as regras específicas para interações com o banco de dados. Leia este arquivo sempre que estiver criando/modificando schemas, escrevendo queries SQL/Drizzle ou rodando migrações.

---

## 1. Schema do Banco de Dados
- **Local Único**: O schema do banco de dados reside unicamente em `src/db/schema.ts`. Nunca crie tabelas diretamente no banco de dados ou em outros arquivos.
- **Exportação de Tipos**: Sempre exporte os tipos do schema para reaproveitamento nos componentes e actions (ex: `export type User = typeof users.$inferSelect;`).
- **Nomes de Colunas**: Use o padrão camelCase no código TypeScript e snake_case para o banco de dados (ex: `telegramChatId: text('telegram_chat_id')`).

---

## 2. Drizzle ORM
- **Operações e Queries**: Use as APIs de Drizzle ORM (como `db.select()`, `db.insert()`, `db.update()`, `db.delete()`) para qualquer interação.
- **Segurança de Tipos (TypeScript)**:
  - Mantenha tipagem estrita para resultados de consultas.
  - Nunca use `any` para omitir tipos de queries ou tabelas.
- **Condicionais**: Importe helpers de filtragem como `eq`, `and`, `or`, `like`, `desc` diretamente do `drizzle-orm`.

---

## 3. Neon DB & Migrações
- **Drizzle Kit**: As alterações de banco de dados devem ser geradas ou aplicadas usando o `drizzle-kit`.
- **db:push**: Para ambientes locais/desenvolvimento rápido, o comando `npm run db:push` (ou `npx drizzle-kit push`) pode ser executado para atualizar a base Neon DB remota de forma síncrona.
- **Env**: Certifique-se de que a variável de ambiente `DATABASE_URL` esteja presente no terminal ou arquivo `.env.local` correspondente ao rodar comandos de banco.
