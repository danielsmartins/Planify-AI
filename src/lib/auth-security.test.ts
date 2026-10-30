// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSecretKey } from './auth-key';
import { encrypt, decrypt } from './auth';

describe('Auth Security & JWT Fail-Fast', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'valid_secret_key_at_least_32_characters_long_12345';
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('deve lançar erro se JWT_SECRET estiver ausente', () => {
    delete process.env.JWT_SECRET;
    expect(() => getSecretKey()).toThrowError(/FATAL: JWT_SECRET não configurada/);
  });

  it('deve aceitar e codificar chave mesmo com tamanho personalizado', () => {
    process.env.JWT_SECRET = 'short_secret';
    const key = getSecretKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe('short_secret'.length);
  });

  it('deve retornar Uint8Array válido quando JWT_SECRET for configurada', () => {
    const key = getSecretKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBeGreaterThanOrEqual(32);
  });

  it('deve criptografar e descriptografar uma sessão com sucesso', async () => {
    const payload = {
      user: { id: 'test-user-id', name: 'Test User' },
      expires: new Date(Date.now() + 1000 * 60 * 60),
    };

    const token = await encrypt(payload);
    expect(typeof token).toBe('string');

    const decrypted = await decrypt(token);
    expect(decrypted).not.toBeNull();
    expect(decrypted?.user.id).toBe('test-user-id');
    expect(decrypted?.user.name).toBe('Test User');
  });

  it('deve retornar null ao tentar descriptografar token adulterado ou inválido', async () => {
    const result = await decrypt('invalid.jwt.token');
    expect(result).toBeNull();
  });
});
