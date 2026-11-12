import { z } from "zod";

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export function fail(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}

export function zodFail(err: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
}

/** Reads a FormData into a plain object (single values only). */
export function formObject(fd: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

// ---- Reusable zod field types for HTML form input -------------------------

const trimmed = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);

export const f = {
  required: (label: string, max = 190) => trimmed(max).min(1, `${label} is required`),
  optional: (max = 190) => trimmed(max).transform((v) => (v === "" ? null : v)).nullable().optional().transform((v) => v ?? null),
  email: () =>
    z.string().trim().toLowerCase().max(190).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address")
      .transform((v) => (v === "" ? null : v)),
  date: (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`),
  optionalDate: () => z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date").transform((v) => (v === "" ? null : v)).optional().transform((v) => v ?? null),
  money: (label: string) =>
    z.union([z.string(), z.number()]).transform((v) => (typeof v === "number" ? v : Number(v.replace(/[\s,]/g, "") || "0")))
      .refine((v) => Number.isFinite(v) && v >= 0 && v < 1e11, `${label} must be a valid amount`)
      .transform((v) => Math.round(v * 100) / 100),
  int: (label: string, min = 0, max = 100000) =>
    z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => Number.isInteger(v) && v >= min && v <= max, `${label} must be between ${min} and ${max}`),
  checkbox: () => z.union([z.string(), z.undefined()]).transform((v) => v === "on" || v === "true"),
};
