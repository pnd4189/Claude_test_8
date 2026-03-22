/** Cloudflare KV cache layer for translations */

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/** Generate SHA-256 cache key */
async function makeKey(text: string, from: string, to: string): Promise<string> {
  const data = new TextEncoder().encode(`${from}:${to}:${text}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t:${from}:${to}:${hex}`;
}

/** Get cached translation from KV */
export async function getCached(
  kv: KVNamespace,
  text: string,
  from: string,
  to: string
): Promise<string | null> {
  const key = await makeKey(text, from, to);
  return kv.get(key);
}

/** Store translation in KV cache */
export async function setCached(
  kv: KVNamespace,
  text: string,
  translation: string,
  from: string,
  to: string
): Promise<void> {
  const key = await makeKey(text, from, to);
  await kv.put(key, translation, { expirationTtl: TTL_SECONDS });
}
