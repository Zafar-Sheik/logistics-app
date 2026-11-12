// Formatting helpers shared by server and client code.

export const CURRENCIES: Record<string, { symbol: string; name: string }> = {
  ZAR: { symbol: "R", name: "South African Rand" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  BWP: { symbol: "P", name: "Botswana Pula" },
  NAD: { symbol: "N$", name: "Namibian Dollar" },
  ZMW: { symbol: "K", name: "Zambian Kwacha" },
  MZN: { symbol: "MT", name: "Mozambican Metical" },
  KES: { symbol: "KSh", name: "Kenyan Shilling" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  AED: { symbol: "AED", name: "UAE Dirham" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
};

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Prisma Decimal | number | string -> number */
export function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function money(value: unknown, currency = "ZAR", opts: { plainSymbol?: boolean } = {}) {
  const n = round2(num(value));
  let symbol = CURRENCIES[currency]?.symbol ?? currency;
  // Built-in PDF fonts only cover Latin-1, so fall back to the ISO code there.
  if (opts.plainSymbol && /[^\u0000-ÿ]/.test(symbol)) symbol = currency;
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${symbol}${symbol.length > 1 ? " " : ""}${grouped}.${dec}`;
}

/** Compact money for tight spaces: R12.4k, R1.2m */
export function moneyShort(value: unknown, currency = "ZAR") {
  const n = num(value);
  const symbol = CURRENCIES[currency]?.symbol ?? currency;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  if (abs >= 10_000) return `${sign}${symbol}${(abs / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  return `${sign}${symbol}${Math.round(abs).toLocaleString("en-US")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Calendar dates are stored as UTC midnight; always read them back in UTC. */
export function isoDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function parseDate(s: string): Date {
  return new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
}

export function fmtDate(d: Date | string | null | undefined): string {
  const iso = isoDate(d);
  if (!iso) return "—";
  const [y, m, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}`;
}

export function fmtMonth(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

/** Today's calendar date in the business time zone (APP_TIMEZONE, default Africa/Johannesburg). */
export function todayISO(): string {
  const tz = process.env.APP_TIMEZONE || process.env.NEXT_PUBLIC_APP_TIMEZONE || "Africa/Johannesburg";
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDate(toIso).getTime() - parseDate(fromIso).getTime()) / 86_400_000);
}

export function startOfMonth(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(iso: string, months: number) {
  const d = parseDate(startOfMonth(iso));
  d.setUTCMonth(d.getUTCMonth() + months);
  return isoDate(d);
}

export function endOfMonth(iso: string) {
  return addDays(addMonths(iso, 1), -1);
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
