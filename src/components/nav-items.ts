import { Banknote, BarChart3, Building2, FileText, HandCoins, HelpCircle, LayoutDashboard, Package, Receipt, ScrollText, Settings, Truck, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; hint?: string };

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Work",
    items: [
      { href: "/", label: "Home", icon: LayoutDashboard, hint: "What needs attention today" },
      { href: "/loads", label: "Loads", icon: Package, hint: "Jobs you are moving" },
    ],
  },
  {
    title: "Money in",
    items: [
      { href: "/quotes", label: "Quotes", icon: ScrollText, hint: "Price a job for a customer" },
      { href: "/invoices", label: "Invoices", icon: FileText, hint: "Bill your customers" },
    ],
  },
  {
    title: "Money out",
    items: [
      { href: "/bills", label: "Subcontractor bills", icon: Receipt, hint: "What you owe truckers" },
      { href: "/expenses", label: "Expenses", icon: HandCoins, hint: "Running costs" },
    ],
  },
  {
    title: "Records",
    items: [
      { href: "/payments", label: "Payments", icon: Banknote, hint: "All money in and out" },
      { href: "/customers", label: "Customers", icon: Building2, hint: "Who you invoice" },
      { href: "/subcontractors", label: "Subcontractors", icon: Truck, hint: "Trucking companies you use" },
      { href: "/reports", label: "Reports", icon: BarChart3, hint: "Profit, VAT, who owes what" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, hint: "Company, logo, banking, team" },
      { href: "/help", label: "Help & guide", icon: HelpCircle, hint: "How everything works" },
    ],
  },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
