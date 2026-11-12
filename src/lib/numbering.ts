import "server-only";
import type { Tx } from "./db";

type Series = "invoice" | "quote" | "load";

/**
 * Hands out the next number in a series. Runs inside the caller's transaction:
 * the UPDATE locks the company row, so two people saving at once never clash.
 */
export async function nextNumber(tx: Tx, series: Series): Promise<string> {
  const field = `${series}Next` as const;
  const prefixField = `${series}Prefix` as const;
  const company = await tx.company.update({ where: { id: 1 }, data: { [field]: { increment: 1 } } });
  const n = company[field] - 1;
  return `${company[prefixField]}${String(n).padStart(4, "0")}`;
}
