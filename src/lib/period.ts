import { addDays, addMonths, endOfMonth, fmtDate, startOfMonth, todayISO } from "./format";
import { one } from "./params";

export type Period = { key: string; from: string; to: string; label: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function presets(today = todayISO()) {
  const year = today.slice(0, 4);
  return [
    { key: "this-month", label: "This month", from: startOfMonth(today), to: endOfMonth(today) },
    { key: "last-month", label: "Last month", from: addMonths(today, -1), to: addDays(startOfMonth(today), -1) },
    { key: "last-3", label: "Last 3 months", from: addMonths(today, -2), to: endOfMonth(today) },
    { key: "this-year", label: "This year", from: `${year}-01-01`, to: `${year}-12-31` },
    { key: "last-year", label: "Last year", from: `${Number(year) - 1}-01-01`, to: `${Number(year) - 1}-12-31` },
  ];
}

/** Reads ?period= or ?from=&to= from the URL; defaults to this month. */
export function readPeriod(sp: Record<string, string | string[] | undefined>, fallback = "this-month"): Period {
  const from = one(sp.from);
  const to = one(sp.to);
  if (ISO.test(from) && ISO.test(to) && from <= to) return { key: "custom", from, to, label: `${fmtDate(from)} – ${fmtDate(to)}` };
  const list = presets();
  const p = list.find((x) => x.key === one(sp.period)) ?? list.find((x) => x.key === fallback)!;
  return { ...p, label: `${p.label} (${fmtDate(p.from)} – ${fmtDate(p.to)})` };
}
