'use server';

import { db } from '@/db';
import { categories } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';

export async function addCategory(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const limit = formData.get('monthlyLimit') as string;

  if (!name || !color) throw new Error('Invalid data');

  await db.insert(categories).values({
    userId: session.user.id,
    name,
    color,
    monthlyLimit: limit ? parseFloat(limit).toString() : '0',
  });

  revalidatePath('/categories');
  return { success: true };
}

export async function deleteCategory(id: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  await db.delete(categories).where(
    and(
      eq(categories.id, id),
      eq(categories.userId, session.user.id)
    )
  );

  revalidatePath('/categories');
  return { success: true };
}
