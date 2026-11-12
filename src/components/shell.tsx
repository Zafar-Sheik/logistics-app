"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, FileText, HandCoins, LayoutDashboard, LogOut, Menu, Package, Plus, Receipt, ScrollText, Truck } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cx, initials } from "@/lib/format";
import { BrandMark } from "./brand";
import { NAV_GROUPS, isActive } from "./nav-items";
import { Sheet } from "./sheet";

const QUICK_ACTIONS = [
  { href: "/loads/new", label: "New load", text: "Book a job", icon: Package, tone: "bg-brand-50 text-brand-700" },
  { href: "/invoices/new", label: "New invoice", text: "Bill a customer", icon: FileText, tone: "bg-emerald-50 text-emerald-700" },
  { href: "/quotes/new", label: "New quote", text: "Price a job", icon: ScrollText, tone: "bg-violet-50 text-violet-700" },
  { href: "/bills/new", label: "Subcontractor bill", text: "Capture what you owe", icon: Receipt, tone: "bg-amber-50 text-amber-700" },
  { href: "/expenses/new", label: "Expense", text: "Fuel, tolls, costs", icon: HandCoins, tone: "bg-rose-50 text-rose-700" },
  { href: "/customers/new", label: "Customer", text: "Add a client", icon: Building2, tone: "bg-sky-50 text-sky-700" },
  { href: "/subcontractors/new", label: "Subcontractor", text: "Add a trucker", icon: Truck, tone: "bg-slate-100 text-slate-700" },
];

type Props = {
  user: { name: string; email: string; role: string };
  companyName: string;
  logo: string | null;
  children: React.ReactNode;
};

export function Shell({ user, companyName, logo, children }: Props) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [quick, setQuick] = useState(false);

  const tab = (href: string, label: string, Icon: typeof Package) => (
    <Link
      href={href}
      className={cx("flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", isActive(pathname, href) ? "text-brand-600" : "text-slate-500")}
    >
      <Icon className="size-[22px]" strokeWidth={isActive(pathname, href) ? 2.4 : 2} />
      {label}
    </Link>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          {logo ? <img src={logo} alt="" className="size-9 rounded-xl object-contain" /> : <BrandMark />}
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{companyName}</div>
            <div className="text-xs text-slate-400">Haulbook</div>
          </div>
        </div>
        <div className="px-4 pb-2">
          <button data-tour="quick-add" onClick={() => setQuick(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
            <Plus className="size-4" /> Create new
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="mt-4">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</div>
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm font-medium",
                    isActive(pathname, item.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <item.icon className="size-[18px]" />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-slate-200 p-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{initials(user.name)}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">{user.name}</div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
          </div>
          <form action={logoutAction}>
            <button aria-label="Sign out" title="Sign out" className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print pt-safe sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center gap-2.5 px-4">
          {logo ? <img src={logo} alt="" className="size-8 rounded-lg object-contain" /> : <BrandMark className="size-8" />}
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-slate-900">{companyName}</span>
          <Link href="/settings/account" aria-label="My account" className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
            {initials(user.name)}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 lg:pt-8 lg:pb-12">{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-stretch">
          {tab("/", "Home", LayoutDashboard)}
          {tab("/loads", "Loads", Package)}
          <div className="flex flex-1 items-center justify-center">
            <button data-tour="quick-add" onClick={() => setQuick(true)} aria-label="Create new" className="-mt-5 flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 ring-4 ring-white active:scale-95">
              <Plus className="size-7" />
            </button>
          </div>
          {tab("/invoices", "Invoices", FileText)}
          <button onClick={() => setMenu(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500">
            <Menu className="size-[22px]" />
            More
          </button>
        </div>
      </nav>

      <Sheet open={quick} onClose={() => setQuick(false)} title="Create new">
        <div className="grid grid-cols-2 gap-2.5" onClick={() => setQuick(false)}>
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 hover:bg-slate-50 active:bg-slate-100">
              <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-xl", a.tone)}>
                <a.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">{a.label}</span>
                <span className="block truncate text-xs text-slate-500">{a.text}</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">To record a payment, open the invoice or bill and tap “Record payment”.</p>
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Menu">
        {NAV_GROUPS.map((g) => (
          <div key={g.title} className="mb-3" onClick={() => setMenu(false)}>
            <div className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</div>
            {g.items.map((item) => (
              <Link key={item.href} href={item.href} className={cx("flex items-center gap-3 rounded-xl px-2 py-2.5", isActive(pathname, item.href) ? "bg-brand-50" : "active:bg-slate-100")}>
                <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <item.icon className="size-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                  <span className="block text-xs text-slate-500">{item.hint}</span>
                </span>
              </Link>
            ))}
          </div>
        ))}
        <form action={logoutAction} className="border-t border-slate-200 pt-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-semibold text-red-600 active:bg-red-50">
            <span className="flex size-9 items-center justify-center rounded-xl bg-red-50">
              <LogOut className="size-[18px]" />
            </span>
            Sign out ({user.name})
          </button>
        </form>
      </Sheet>
    </div>
  );
}
