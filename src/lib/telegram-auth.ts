import crypto from 'crypto';
import { getSecretKey } from './auth-key';

const LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutos

export function generateTelegramLinkToken(userId: string): string {
  const timestamp = Date.now();
  const secret = Buffer.from(getSecretKey());
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${timestamp}`)
    .digest('hex');

  return `${userId}.${timestamp}.${hmac}`;
}

export function verifyTelegramLinkToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [userId, timestampStr, incomingHmac] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  // Verificar expiração
  const now = Date.now();
  if (now - timestamp > LINK_EXPIRY_MS || timestamp > now + 60000) {
    return null;
  }

  // Recalcular HMAC
  const secret = Buffer.from(getSecretKey());
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${timestamp}`)
    .digest('hex');

  const incomingBuf = Buffer.from(incomingHmac);
  const expectedBuf = Buffer.from(expectedHmac);

  if (incomingBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(incomingBuf, expectedBuf)) return null;

  return userId;
}
