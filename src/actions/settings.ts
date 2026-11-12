"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { f, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { CURRENCIES } from "@/lib/format";

function refresh() {
  revalidatePath("/", "layout");
}

const companySchema = z.object({
  name: f.required("Company name", 160),
  tradingName: f.optional(160),
  regNumber: f.optional(60),
  email: f.email(),
  phone: f.optional(40),
  website: f.optional(190),
  addressLine1: f.optional(190),
  addressLine2: f.optional(190),
  city: f.optional(100),
  province: f.optional(100),
  postalCode: f.optional(20),
  country: f.optional(100),
});

export async function saveCompany(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = companySchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  await db.company.update({ where: { id: 1 }, data: parsed.data });
  refresh();
  return { ok: true, message: "Company details saved." };
}

const bankingSchema = z.object({
  bankName: f.optional(120),
  bankAccountName: f.optional(160),
  bankAccountNumber: f.optional(60),
  bankBranchCode: f.optional(40),
  bankAccountType: f.optional(60),
  bankSwift: f.optional(40),
});

export async function saveBanking(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = bankingSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  await db.company.update({ where: { id: 1 }, data: parsed.data });
  refresh();
  return { ok: true, message: "Banking details saved. They now appear on your invoices." };
}

const prefix = (label: string) => z.string().trim().max(12, "Keep the prefix under 12 characters").regex(/^[A-Za-z0-9\-\/_. ]*$/, `${label} can only use letters, numbers and - / _ .`);

const documentSchema = z.object({
  currency: z.string().refine((c) => c in CURRENCIES, "Choose a currency"),
  taxRegistered: f.checkbox(),
  taxLabel: f.required("Tax name", 20),
  taxRate: f.money("Tax rate").refine((v) => v <= 100, "Tax rate must be 100 or less"),
  vatNumber: f.optional(60),
  invoicePrefix: prefix("Invoice prefix"),
  invoiceNext: f.int("Next invoice number", 1, 99999999),
  quotePrefix: prefix("Quote prefix"),
  quoteNext: f.int("Next quote number", 1, 99999999),
  loadPrefix: prefix("Load prefix"),
  loadNext: f.int("Next load number", 1, 99999999),
  paymentTermsDays: f.int("Payment terms", 0, 365),
  invoiceNotes: f.optional(2000),
  quoteNotes: f.optional(2000),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a colour"),
});

export async function saveDocumentSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = documentSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  await db.company.update({ where: { id: 1 }, data: { ...d, taxRate: d.taxRegistered ? d.taxRate : 0 } });
  refresh();
  return { ok: true, message: "Invoice settings saved." };
}

/** Logo arrives as a small PNG/JPEG data URL, already resized in the browser. */
export async function saveLogo(dataUrl: string | null): Promise<ActionState> {
  await requireAdmin();
  if (dataUrl !== null) {
    if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) return fail("Please choose a PNG or JPG image.");
    if (dataUrl.length > 900_000) return fail("That image is too large. Try a smaller logo.");
  }
  await db.company.update({ where: { id: 1 }, data: { logo: dataUrl } });
  refresh();
  return { ok: true };
}

// ---- Team ------------------------------------------------------------------

const userSchema = z.object({
  name: f.required("Name", 120),
  email: f.required("Email").pipe(z.email("Enter a valid email address")).transform((v) => v.toLowerCase()),
  role: z.enum(["ADMIN", "STAFF"]),
  password: z.string().min(8, "Use at least 8 characters").max(100),
});

export async function createUser(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = userSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) {
    return fail("Please check the highlighted fields.", { email: "Someone already uses this email" });
  }
  await db.user.create({ data: { name: d.name, email: d.email, role: d.role, passwordHash: await bcrypt.hash(d.password, 12) } });
  revalidatePath("/settings/team");
  return { ok: true, message: `${d.name} can now sign in with the password you set.` };
}

export async function setUserActive(id: string, active: boolean): Promise<ActionState> {
  const me = await requireAdmin();
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return fail("This user no longer exists.");
  if (target.id === me.id) return fail("You cannot deactivate your own account.");
  if (target.role === "OWNER") return fail("The owner account cannot be deactivated.");
  await db.user.update({ where: { id }, data: { active } });
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function setUserRole(id: string, role: "ADMIN" | "STAFF"): Promise<ActionState> {
  const me = await requireAdmin();
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return fail("This user no longer exists.");
  if (target.role === "OWNER" || target.id === me.id) return fail("This role cannot be changed.");
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function resetUserPassword(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const pw = String(fd.get("password") ?? "");
  if (pw.length < 8) return fail("Please check the highlighted fields.", { password: "Use at least 8 characters" });
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return fail("This user no longer exists.");
  if (target.role === "OWNER" && me.role !== "OWNER") return fail("Only the owner can change the owner's password.");
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(pw, 12), failedLogins: 0, lockedUntil: null } });
  return { ok: true, message: "Password reset. Share the new password with them." };
}
