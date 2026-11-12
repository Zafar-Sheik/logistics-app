import "server-only";

/**
 * Tiny in-process cache for data that is read on every request but rarely changes
 * (the signed-in user, the company profile). Each entry expires after `ttlMs`, and
 * writes call `forget()` so changes show immediately on this server.
 */
type Entry = { value: Promise<unknown>; expires: number };
const store = new Map<string, Entry>();

export function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T>;
  const value = load().catch((err) => {
    store.delete(key); // never cache a failure
    throw err;
  });
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export function forget(prefix: string) {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
