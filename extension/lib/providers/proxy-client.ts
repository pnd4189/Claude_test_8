/** HTTP client for Cloudflare Worker translation proxy */

interface TranslateResult {
  translatedText: string;
  provider: string;
}

interface BatchResult {
  translations: string[];
  provider: string;
}

interface ProxyClientOptions {
  proxyUrl: string;
  extensionKey?: string;
  timeout?: number;
}

/** Translate single text via proxy */
export async function proxyTranslate(
  text: string,
  from: string,
  to: string,
  provider: string,
  options: ProxyClientOptions
): Promise<TranslateResult> {
  const res = await fetchProxy(`${options.proxyUrl}/api/translate`, {
    method: 'POST',
    body: JSON.stringify({ text, from, to, provider }),
  }, options);

  return res.json() as Promise<TranslateResult>;
}

/** Batch translate via proxy */
export async function proxyBatchTranslate(
  texts: string[],
  from: string,
  to: string,
  provider: string,
  options: ProxyClientOptions
): Promise<BatchResult> {
  const res = await fetchProxy(`${options.proxyUrl}/api/translate/batch`, {
    method: 'POST',
    body: JSON.stringify({ texts, from, to, provider }),
  }, options);

  return res.json() as Promise<BatchResult>;
}

/** Check proxy availability */
export async function proxyGetProviders(
  options: ProxyClientOptions
): Promise<Array<{ id: string; name: string; available: boolean }>> {
  try {
    const res = await fetchProxy(`${options.proxyUrl}/api/providers`, { method: 'GET' }, options);
    const data = await res.json() as { providers: Array<{ id: string; name: string; available: boolean }> };
    return data.providers;
  } catch {
    return [];
  }
}

async function fetchProxy(
  url: string,
  init: RequestInit,
  options: ProxyClientOptions
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.extensionKey) headers['X-Extension-Key'] = options.extensionKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 30000);

  try {
    const res = await fetch(url, { ...init, headers, signal: controller.signal });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Proxy error ${res.status}: ${errBody}`);
    }
    return res;
  } finally {
    clearTimeout(timeout);
  }
}
