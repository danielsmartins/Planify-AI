'use server';

import { db } from '@/db';
import { categories } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';

import { categorySchema } from '@/lib/validations';

export async function addCategory(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = categorySchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { name, color, monthlyLimit } = validation.data;

  await db.insert(categories).values({
    userId: session.user.id,
    name,
    color,
    monthlyLimit: monthlyLimit.toString(),
  });

  revalidatePath('/categories');
  return { success: true };
}

export async function deleteCategory(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  await db.delete(categories).where(
    and(
      eq(categories.id, id),
      eq(categories.userId, session.user.id)
    )
  );

  revalidatePath('/categories');
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  // Parse and validate with Zod
  const rawData = Object.fromEntries(formData);
  const validation = categorySchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }
  const { name, color, monthlyLimit } = validation.data;

  await db.update(categories).set({
    name,
    color,
    monthlyLimit: monthlyLimit.toString(),
  }).where(
    and(
      eq(categories.id, id),
      eq(categories.userId, session.user.id)
    )
  );

  revalidatePath('/categories');
  return { success: true };
}
