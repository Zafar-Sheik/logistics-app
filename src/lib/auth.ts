import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
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
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, active: true, tutorialDone: true },
  });
  return user?.active ? user : null;
});

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

export const getCompany = cache(async () => db.company.findUnique({ where: { id: 1 } }));

export async function requireCompany() {
  const company = await getCompany();
  if (!company) redirect("/setup");
  return company;
}
