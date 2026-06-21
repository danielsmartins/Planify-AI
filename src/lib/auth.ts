'use server';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_key_planify');

export async function encrypt(payload: { user: { id: string, name: string }, expires: Date } & Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function decrypt(input: string): Promise<Record<string, unknown> | null> {
  const { payload } = await jwtVerify(input, secretKey, {
    algorithms: ['HS256'],
  });
  return payload;
}

export async function login(formData: FormData) {
  const identifier = formData.get('identifier') as string;
  const password = formData.get('password') as string;

  if (!identifier || !password) return { error: 'Preencha todos os campos.' };

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
  cookieStore.set('session', session, { expires, httpOnly: true, path: '/' });

  return { success: true };
}

export async function register(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !phone || !password) return { error: 'Preencha todos os campos.' };

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.insert(users).values({
      name,
      email,
      phone,
      password: hashedPassword,
    });
    
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
