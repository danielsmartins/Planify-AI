'use server';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, categories } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { loginSchema, registerSchema } from './validations';
import { rateLimit } from './rate-limit';

export interface SessionPayload {
  user: {
    id: string;
    name: string;
  };
  expires: string | Date;
}

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_key_planify');

export async function encrypt(payload: SessionPayload & Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  const { payload } = await jwtVerify(input, secretKey, {
    algorithms: ['HS256'],
  });
  return payload as unknown as SessionPayload;
}

export async function login(formData: FormData) {
  // Apply Rate Limiting (max 5 login attempts per minute)
  const limiter = await rateLimit(5, 60000);
  if (!limiter.success) {
    return { error: `Muitas tentativas de login. Tente novamente em ${limiter.retryAfter} segundos.` };
  }

  // Parse and validate form data with Zod
  const rawData = Object.fromEntries(formData);
  const validation = loginSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { identifier, password } = validation.data;

  const userRes = await db.select().from(users).where(
    or(eq(users.email, identifier), eq(users.phone, identifier))
  );
  
  const user = userRes[0];
  if (!user) return { error: 'Usuário não encontrado.' };

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return { error: 'Senha incorreta.' };

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ user: { id: user.id, name: user.name }, expires });

  const cookieStore = await cookies();
  cookieStore.set('session', session, { 
    expires, 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/' 
  });

  return { success: true };
}

export async function register(formData: FormData) {
  // Apply Rate Limiting (max 3 registrations per minute)
  const limiter = await rateLimit(3, 60000);
  if (!limiter.success) {
    return { error: `Muitas tentativas de cadastro. Tente novamente em ${limiter.retryAfter} segundos.` };
  }

  // Parse and validate form data with Zod
  const rawData = Object.fromEntries(formData);
  const validation = registerSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { name, email, phone, password, age, incomeRange, financialGoal } = validation.data;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [newUser] = await db.insert(users).values({
      name,
      email,
      phone,
      password: hashedPassword,
      age,
      incomeRange,
      financialGoal,
    }).returning();
    
    await db.insert(categories).values([
      { userId: newUser.id, name: 'Alimentação', color: '#ef4444' },
      { userId: newUser.id, name: 'Transporte', color: '#f59e0b' },
      { userId: newUser.id, name: 'Lazer', color: '#8b5cf6' },
      { userId: newUser.id, name: 'Moradia', color: '#3b82f6' },
    ]);
    
    return { success: true };
  } catch {
    return { error: 'Email ou telefone já cadastrado.' };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}
