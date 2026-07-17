import { headers } from 'next/headers';

const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

export async function rateLimit(limit: number = 20, windowMs: number = 60000) {
  // Limpar entradas expiradas periodicamente para evitar vazamentos de memória
  const now = Date.now();
  if (ipRequestCounts.size > 5000) {
    for (const [key, value] of ipRequestCounts.entries()) {
      if (now > value.resetTime) {
        ipRequestCounts.delete(key);
      }
    }
  }

  const headerStore = await headers();
  // Pega o IP real do cliente atrás de proxies/Vercel
  const xForwardedFor = headerStore.get('x-forwarded-for');
  const ip = xForwardedFor ? xForwardedFor.split(',')[0].trim() : '127.0.0.1';
  
  const record = ipRequestCounts.get(ip);
  
  if (!record) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return { success: true };
  }
  
  record.count++;
  if (record.count > limit) {
    return { 
      success: false, 
      retryAfter: Math.ceil((record.resetTime - now) / 1000) 
    };
  }
  
  return { success: true };
}
