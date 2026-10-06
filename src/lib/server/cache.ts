const entries = new Map<string, { value: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
const MAX_CACHE_ENTRIES = 300;
export function clearCache() {
  entries.clear();
  pending.clear();
}
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const cached = entries.get(key);
  if (cached && cached.expires > Date.now()) return { value: cached.value as T, hit: true };
  const existing = pending.get(key);
  if (existing) return { value: (await existing) as T, hit: true };
  const promise = loader();
  pending.set(key, promise);
  try {
    const value = await promise;
    if (entries.size >= MAX_CACHE_ENTRIES) entries.delete(entries.keys().next().value!);
    entries.set(key, { value, expires: Date.now() + ttlMs });
    return { value, hit: false };
  } finally {
    pending.delete(key);
  }
}
