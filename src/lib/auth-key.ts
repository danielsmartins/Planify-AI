export function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET não configurada no ambiente.');
  }
  const encoded = new TextEncoder().encode(secret);
  return new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength);
}
