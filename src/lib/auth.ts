import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { forget, memo } from "./memo";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "./session";

export async function startSession(userId: string) {
  const token = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Re-checked against the database on every request. */
export const getUser = cache(async () => {
  const userId = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  // Cached briefly so a page does not wait on the database just to know who you are.
  const user = await memo(`user:${userId}`, 30_000, () =>
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, active: true, tutorialDone: true },
    }),
  );
  return user?.active ? user : null;
});

/** Call after changing a user so the change shows on the next request. */
export function forgetUser(userId?: string) {
  forget(userId ? `user:${userId}` : "user:");
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export function isAdmin(user: { role: string }) {
  return user.role === "OWNER" || user.role === "ADMIN";
}

/** Owners and admins manage settings, users and can delete financial records. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user)) throw new Error("You do not have permission to do that. Ask an owner or admin.");
  return user;
}

/** Company profile, cached for a minute. Settings forms use getCompanyFresh(). */
export const getCompany = cache(() => memo("company", 60_000, () => db.company.findUnique({ where: { id: 1 } })));

export const getCompanyFresh = () => db.company.findUnique({ where: { id: 1 } });

/** Call after changing company settings so the change shows on the next request. */
export function forgetCompany() {
  forget("company");
}

export async function requireCompany() {
  const company = await getCompany();
  if (!company) redirect("/setup");
  return company;
}
