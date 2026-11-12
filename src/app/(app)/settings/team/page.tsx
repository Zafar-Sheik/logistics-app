import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setUserActive, setUserRole } from "@/actions/settings";
import { ActionButton } from "@/components/sheet";
import { AddUserButton, ResetPasswordButton } from "@/components/team";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { adminGate } from "../admin-only";

export const metadata: Metadata = { title: "Team" };

const ROLE = { OWNER: "Owner", ADMIN: "Admin", STAFF: "Staff" } as const;

export default async function TeamPage() {
  const gate = await adminGate("Team");
  if (gate) return gate;
  const me = await requireUser();
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true } });
  return (
    <>
      <PageHeader title="Team" subtitle="Everyone who can sign in to your workspace." back={{ href: "/settings", label: "Settings" }} actions={<AddUserButton />} />
      <Card className="divide-y divide-slate-100">
        {users.map((u) => {
          const canManage = u.role !== "OWNER" && u.id !== me.id;
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
              <Avatar name={u.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                  {u.name} {u.id === me.id && <span className="font-normal text-slate-400">(you)</span>}
                  <Badge tone={u.role === "OWNER" ? "violet" : u.role === "ADMIN" ? "blue" : "slate"}>{ROLE[u.role]}</Badge>
                  {!u.active && <Badge tone="red">Deactivated</Badge>}
                </div>
                <div className="truncate text-sm text-slate-500">{u.email}</div>
              </div>
              {(canManage || (u.role === "OWNER" && me.role === "OWNER" && u.id !== me.id)) && (
                <div className="flex flex-wrap gap-1">
                  <ResetPasswordButton userId={u.id} name={u.name} />
                  {canManage && (
                    <>
                      <ActionButton action={setUserRole.bind(null, u.id, u.role === "ADMIN" ? "STAFF" : "ADMIN")} variant="ghost" size="sm">Make {u.role === "ADMIN" ? "staff" : "admin"}</ActionButton>
                      <ActionButton action={setUserActive.bind(null, u.id, !u.active)} variant={u.active ? "dangerGhost" : "ghost"} size="sm">{u.active ? "Deactivate" : "Reactivate"}</ActionButton>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>
      <p className="mt-3 text-sm text-slate-500">
        <b>Staff</b> can do the daily work: loads, invoices, bills, payments and expenses. <b>Admins</b> can also change settings, manage the team, void invoices and delete records.
      </p>
    </>
  );
}
