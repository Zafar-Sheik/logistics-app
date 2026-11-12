import "server-only";
import { cache } from "react";
import { db } from "./db";

/**
 * id → name for every customer and subcontractor, fetched once per request.
 *
 * TiDB cannot load related records in the same query, so `include: { customer }`
 * costs a second, sequential round trip. Lists run this alongside their main query
 * instead, which keeps each page to a single round trip.
 */
export const getContactNames = cache(async () => {
  const rows = await db.contact.findMany({ select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.id, r.name]));
});

export function nameOf(names: Map<string, string>, id: string | null | undefined, fallback = "—") {
  return (id && names.get(id)) || fallback;
}

/** Escapes a search term for use in SQL LIKE '%term%'. */
export function likeTerm(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
