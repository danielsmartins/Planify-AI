import { z } from 'zod';

// Custom helper for UUID validation or null
const uuidOrNull = z.union([z.string().uuid(), z.null(), z.literal('')]).optional().transform(val => val === '' || val === undefined ? null : val);

// 1. Auth Schemas
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'E-mail ou telefone é obrigatório.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(100),
  email: z.string().trim().email('E-mail inválido.'),
  phone: z.union([z.string().trim().min(8, 'Telefone inválido.'), z.null(), z.literal('')]).optional().transform(val => val === '' || val === undefined ? null : val),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(100),
  age: z.union([z.coerce.number().int().positive('Idade inválida.'), z.null(), z.literal('')]).optional().transform(val => val === '' || val === undefined ? null : val),
  incomeRange: z.union([z.string(), z.null(), z.literal('')]).optional().transform(val => val === '' || val === undefined ? null : val),
  financialGoal: z.union([z.string(), z.null(), z.literal('')]).optional().transform(val => val === '' || val === undefined ? null : val),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(100),
  email: z.string().trim().email('E-mail inválido.').optional(),
  phone: z.union([z.string().trim().min(8, 'Telefone inválido.'), z.null(), z.literal('')]).optional().transform(val => val === '' || val === undefined ? null : val),
  age: z.union([z.coerce.number().int().positive('Idade inválida.'), z.null(), z.literal('')]).optional().transform(val => val === '' || val === undefined ? null : val),
  incomeRange: z.union([z.string(), z.null(), z.literal('')]).optional().transform(val => val === '' || val === undefined ? null : val),
  financialGoal: z.union([z.string(), z.null(), z.literal('')]).optional().transform(val => val === '' || val === undefined ? null : val),
});

// 3. Transactions Schema
export const transactionSchema = z.object({
  amount: z.coerce.number().positive('O valor deve ser maior que zero.'),
  description: z.string().trim().min(1, 'A descrição é obrigatória.').max(200),
  category: z.string().trim().min(1, 'A categoria é obrigatória.'),
  type: z.enum(['income', 'expense']),
  status: z.enum(['pending', 'confirmed']).default('confirmed'),
  accountId: uuidOrNull,
  creditCardId: uuidOrNull,
  dueDate: z.union([z.string(), z.date(), z.null()]).optional().transform(val => val ? new Date(val) : null),
  createdAt: z.union([z.string(), z.date(), z.null()]).optional().transform(val => val ? new Date(val) : new Date()),
});

// 4. Installment Purchases Schema
export const installmentPurchaseSchema = z.object({
  description: z.string().trim().min(1, 'A descrição é obrigatória.').max(200),
  category: z.string().trim().min(1, 'A categoria é obrigatória.'),
  amount: z.coerce.number().positive('O valor da parcela deve ser maior que zero.'),
  installmentsCount: z.coerce.number().int().min(1, 'Deve ser no mínimo 1 parcela.').max(120, 'Máximo de 120 parcelas.'),
  currentInstallment: z.coerce.number().int().min(1).default(1),
  creditCardId: z.string().uuid('Selecione um cartão válido.'),
  createdAt: z.union([z.string(), z.date(), z.null()]).optional().transform(val => val ? new Date(val) : new Date()),
});

// 5. Account Schema
export const accountSchema = z.object({
  name: z.string().trim().min(1, 'O nome da conta é obrigatório.').max(100),
  type: z.enum(['checking', 'savings', 'investment', 'cash']).default('checking'),
  color: z.string().trim().min(3).max(20),
  balance: z.coerce.number(),
});

// 6. Credit Card Schema
export const creditCardSchema = z.object({
  name: z.string().trim().min(1, 'O nome do cartão é obrigatório.').max(100),
  color: z.string().trim().min(3).max(20),
  closingDay: z.coerce.number().int().min(1, 'Dia inválido.').max(31, 'Dia inválido.'),
  dueDay: z.coerce.number().int().min(1, 'Dia inválido.').max(31, 'Dia inválido.'),
  limitAmount: z.coerce.number().nonnegative('O limite deve ser maior ou igual a zero.').default(0),
  brand: z.string().trim().min(1, 'Selecione uma bandeira.').default('mastercard'),
  autoPay: z.preprocess(val => val === 'on' || val === 'true' || val === true, z.boolean()).default(false),
  autoPayAccountId: uuidOrNull,
});

// 7. Category Schema
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'O nome da categoria é obrigatório.').max(100),
  color: z.string().trim().min(3).max(20),
  monthlyLimit: z.coerce.number().nonnegative('O limite mensal deve ser maior ou igual a zero.').default(0),
});

// 8. Subscription Schema
export const subscriptionSchema = z.object({
  name: z.string().trim().min(1, 'O nome da assinatura é obrigatório.').max(100),
  amount: z.coerce.number().positive('O valor deve ser maior que zero.'),
  category: z.string().trim().min(1, 'A categoria é obrigatória.'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  nextBillingDate: z.union([z.string(), z.date()]).transform(val => new Date(val)),
  accountId: uuidOrNull,
  creditCardId: uuidOrNull,
  color: z.string().trim().min(3).max(20).default('#64748b'),
});

export const updateInstallmentSchema = z.object({
  description: z.string().trim().min(1, 'A descrição é obrigatória.').max(200),
  category: z.string().trim().min(1, 'A categoria é obrigatória.'),
  amount: z.coerce.number().positive('O valor da parcela deve ser maior que zero.'),
  installmentsCount: z.coerce.number().int().min(1, 'Deve ser no mínimo 1 parcela.').max(120),
  paidCount: z.coerce.number().int().nonnegative().default(0),
  creditCardId: uuidOrNull,
  createdAt: z.union([z.string(), z.date(), z.null()]).transform(val => val ? new Date(val) : new Date()),
});

