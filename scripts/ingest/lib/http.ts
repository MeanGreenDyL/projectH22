/** Polite HTTP: proxy-aware, identifies the project generically, exponential backoff on 429/5xx. */
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

if (process.env.HTTPS_PROXY || process.env.https_proxy) setGlobalDispatcher(new EnvHttpProxyAgent());

const UA = 'project-h22-ingest/0.1 (+https://github.com/MeanGreenDyL/projectH22)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface FetchOptions {
  headers?: Record<string, string>;
  retries?: number;
  /** Minimum delay before each request, for APIs with per-minute caps. */
  minDelayMs?: number;
  /** Per-request timeout. A timed-out or dropped request counts as a retriable failure. */
  timeoutMs?: number;
}

export async function fetchJson<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
  const retries = opts.retries ?? 5;
  for (let attempt = 0; ; attempt++) {
    if (opts.minDelayMs) await sleep(opts.minDelayMs);
    const safeUrl = url.replace(/api_key=[^&]+/, 'api_key=***');
    let res: Response;
    try {
      res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', ...opts.headers }, signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000) });
    } catch (err) {
      if (attempt >= retries) throw new Error(`GET ${safeUrl} failed: ${err instanceof Error ? err.message : String(err)}`);
      await sleep(2 ** attempt * 2000);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    const retriable = res.status === 429 || res.status === 403 || res.status >= 500;
    if (!retriable || attempt >= retries) throw new Error(`GET ${safeUrl} → ${res.status}`);
    const retryAfter = Number(res.headers.get('retry-after'));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 2000);
  }
}
