// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateTelegramLinkToken, verifyTelegramLinkToken } from './telegram-auth';

describe('Telegram Auth HMAC Tokens', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'valid_secret_key_at_least_32_characters_long_12345';
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('deve gerar um token válido com 3 partes (userId.timestamp.hmac)', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const token = generateTelegramLinkToken(userId);

    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe(userId);
    expect(Number(parts[1])).toBeGreaterThan(0);
    expect(parts[2].length).toBe(64); // SHA-256 hex string
  });

  it('deve verificar e retornar o userId para um token válido recente', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const token = generateTelegramLinkToken(userId);

    const verified = verifyTelegramLinkToken(token);
    expect(verified).toBe(userId);
  });

  it('deve rejeitar token expirado (> 15 minutos)', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const token = generateTelegramLinkToken(userId);

    // Avançar tempo em 16 minutos
    const sixteenMinutesMs = 16 * 60 * 1000;
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + sixteenMinutesMs);

    const verified = verifyTelegramLinkToken(token);
    expect(verified).toBeNull();

    vi.restoreAllMocks();
  });

  it('deve rejeitar token adulterado (HMAC alterado)', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const token = generateTelegramLinkToken(userId);
    const parts = token.split('.');
    // Troca o último caractere do HMAC
    const tamperedHmac = parts[2].substring(0, 63) + (parts[2][63] === 'a' ? 'b' : 'a');
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedHmac}`;

    const verified = verifyTelegramLinkToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it('deve rejeitar formatos de token inválidos', () => {
    expect(verifyTelegramLinkToken('')).toBeNull();
    expect(verifyTelegramLinkToken('invalid-token')).toBeNull();
    expect(verifyTelegramLinkToken('part1.part2')).toBeNull();
    expect(verifyTelegramLinkToken('user.notanumber.hmac')).toBeNull();
  });
});
