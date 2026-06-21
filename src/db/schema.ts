import { pgTable, text, timestamp, numeric, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone').unique(), // Tornando opcional
  telegramChatId: text('telegram_chat_id').unique(), // Para conectar com o bot
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  amount: numeric('amount').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull().default('Outros'),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  status: text('status', { enum: ['pending', 'confirmed'] }).default('confirmed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
