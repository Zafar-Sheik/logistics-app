import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, FileCog, Landmark, UserCircle, Users } from "lucide-react";
import { isAdmin, requireUser } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const admin = isAdmin(user);
  const items = [
    admin && { href: "/settings/company", icon: Building2, title: "Company & logo", text: "Name, address, contact details and your logo" },
    admin && { href: "/settings/banking", icon: Landmark, title: "Banking details", text: "Printed on invoices so customers know where to pay" },
    admin && { href: "/settings/documents", icon: FileCog, title: "Invoice settings", text: "VAT, currency, numbering, payment terms and colour" },
    admin && { href: "/settings/team", icon: Users, title: "Team", text: "Give staff their own sign-in" },
    { href: "/settings/account", icon: UserCircle, title: "My account", text: "Your name and password" },
  ].filter((x): x is Exclude<typeof x, false> => !!x);
  return (
    <>
      <PageHeader title="Settings" />
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 sm:px-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><i.icon className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-slate-900">{i.title}</span>
              <span className="block text-sm text-slate-500">{i.text}</span>
            </span>
            <ChevronRight className="size-4 text-slate-300" />
          </Link>
        ))}
      </Card>
      {!admin && <p className="mt-3 text-sm text-slate-500">Company settings can be changed by an owner or admin.</p>}
    </>
  );
}
