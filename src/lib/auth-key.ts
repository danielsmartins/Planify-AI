export function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET não configurada ou com menos de 32 caracteres.');
  }
  const encoded = new TextEncoder().encode(secret);
  return new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength);
}
