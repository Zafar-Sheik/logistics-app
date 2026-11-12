"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, forgetCompany, forgetUser, requireUser, startSession } from "@/lib/auth";
import { f, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { CURRENCIES } from "@/lib/format";

const password = z.string().min(8, "Use at least 8 characters").max(100);

const setupSchema = z.object({
  userName: f.required("Your name", 120),
  email: f.required("Email").pipe(z.email("Enter a valid email address")).transform((v) => v.toLowerCase()),
  password,
  companyName: f.required("Company name", 160),
  phone: f.optional(40),
  currency: z.string().refine((c) => c in CURRENCIES, "Choose a currency"),
  taxRegistered: f.checkbox(),
  vatNumber: f.optional(60),
  taxRate: f.money("Tax rate").refine((v) => v <= 100, "Tax rate must be 100 or less"),
});

/** First-run only: creates the owner account and the company profile. */
export async function setupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = setupSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;

  const passwordHash = await bcrypt.hash(d.password, 12);
  const user = await db.$transaction(async (tx) => {
    if ((await tx.user.count()) > 0) return null;
    await tx.company.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: d.companyName,
        phone: d.phone,
        email: d.email,
        currency: d.currency,
        taxRegistered: d.taxRegistered,
        vatNumber: d.taxRegistered ? d.vatNumber : null,
        taxRate: d.taxRegistered ? d.taxRate : 0,
      },
    });
    return tx.user.create({ data: { name: d.userName, email: d.email, passwordHash, role: "OWNER" } });
  });
  if (!user) return fail("This system has already been set up. Please sign in instead.");
  forgetCompany();

  await startSession(user.id);
  redirect("/");
}

const MAX_ATTEMPTS = 8;
const LOCK_MINUTES = 15;

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const pw = String(fd.get("password") ?? "");
  if (!email || !pw) return fail("Enter your email and password.");

  const user = await db.user.findUnique({ where: { email } });
  const generic = "That email and password do not match. Please try again.";
  if (!user) {
    await bcrypt.compare(pw, "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5KDqEQ4xH3o4oWwG0aW0fS0nq5bqk9y"); // keep timing similar
    return fail(generic);
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return fail(`Too many attempts. Please wait ${LOCK_MINUTES} minutes and try again.`);
  }
  const ok = await bcrypt.compare(pw, user.passwordHash);
  if (!ok || !user.active) {
    const failedLogins = user.failedLogins + 1;
    const lock = failedLogins >= MAX_ATTEMPTS;
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: lock ? 0 : failedLogins, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
    });
    return fail(generic);
  }
  if (user.failedLogins > 0 || user.lockedUntil) {
    await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  }
  await startSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

export async function setTutorialDone(done: boolean) {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { tutorialDone: done } });
  forgetUser(user.id);
  revalidatePath("/", "layout");
}

const passwordSchema = z.object({ current: z.string().min(1, "Enter your current password"), next: password });

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const parsed = passwordSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    return fail("Please fix the following:", { current: "That is not your current password" });
  }
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(parsed.data.next, 12) } });
  return { ok: true, message: "Password updated." };
}

const profileSchema = z.object({ name: f.required("Name", 120) });

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const parsed = profileSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  await db.user.update({ where: { id: me.id }, data: { name: parsed.data.name } });
  forgetUser(me.id);
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}
