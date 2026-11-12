export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function pageOf(v: string | string[] | undefined) {
  const n = parseInt(one(v), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Builds hrefs that keep the current filters while changing one of them. */
export function linker(path: string, current: Record<string, string>) {
  return (changes: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...changes })) {
      if (v != null && v !== "" && !(k === "page" && Number(v) === 1)) p.set(k, String(v));
    }
    const qs = p.toString();
    return qs ? `${path}?${qs}` : path;
  };
}

export const PAGE_SIZE = 30;
