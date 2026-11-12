import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/format";
import type { Tone } from "@/lib/domain";

// ---- Buttons ---------------------------------------------------------------

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 whitespace-nowrap select-none";
const BTN_VARIANT = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  dangerGhost: "text-red-600 hover:bg-red-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
};
const BTN_SIZE = { md: "h-11 px-4 text-sm", sm: "h-9 px-3 text-sm", lg: "h-12 px-5 text-base" };

export type ButtonVariant = keyof typeof BTN_VARIANT;
type BtnStyle = { variant?: ButtonVariant; size?: keyof typeof BTN_SIZE; block?: boolean };

export function btn({ variant = "primary", size = "md", block }: BtnStyle = {}, className?: string) {
  return cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], block && "w-full", className);
}

export function Button({ variant, size, block, className, ...props }: ComponentProps<"button"> & BtnStyle) {
  return <button {...props} className={btn({ variant, size, block }, className)} />;
}

export function LinkButton({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & BtnStyle) {
  return <Link {...props} className={btn({ variant, size, block }, className)} />;
}

// ---- Layout ----------------------------------------------------------------

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("rounded-2xl border border-slate-200 bg-white shadow-card", className)} />;
}

export function CardHeader({ title, action, subtitle }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="no-print mb-5">
      {back && (
        <Link href={back.href} className="-ml-1 mb-2 inline-flex items-center gap-0.5 rounded-lg py-1 pr-2 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 [&>svg]:size-7">{icon}</div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Alert({ tone = "red", children }: { tone?: "red" | "green" | "amber" | "blue"; children: ReactNode }) {
  const styles = {
    red: "border-red-200 bg-red-50 text-red-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
  };
  return <div role="status" className={cx("rounded-xl border px-4 py-3 text-sm", styles[tone])}>{children}</div>;
}

/** Label / value pair for detail screens. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-slate-900">{children || "—"}</dd>
    </div>
  );
}

// ---- Lists -----------------------------------------------------------------

/** Filter chips rendered as links, e.g. All / Unpaid / Overdue. */
export function FilterTabs({
  tabs,
  active,
  hrefFor,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  hrefFor: (key: string) => string;
}) {
  return (
    <div className="no-print -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={hrefFor(t.key)}
          scroll={false}
          className={cx(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition",
            active === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100",
          )}
        >
          {t.label}
          {t.count != null && t.count > 0 && (
            <span className={cx("rounded-full px-1.5 text-xs", active === t.key ? "bg-white/20" : "bg-slate-100 text-slate-600")}>{t.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}

/** A tappable list row: stacks nicely on phones, spreads out on desktop. */
export function Row({
  href,
  title,
  subtitle,
  meta,
  right,
  rightSub,
  leading,
}: {
  href: string;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
  rightSub?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 active:bg-slate-100 sm:px-5">
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</div>}
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {(right || rightSub) && (
        <div className="shrink-0 text-right">
          {right && <div className="tabular text-sm font-semibold text-slate-900">{right}</div>}
          {rightSub && <div className="mt-0.5 text-xs text-slate-500">{rightSub}</div>}
        </div>
      )}
      <ChevronRight className="size-4 shrink-0 text-slate-300" />
    </Link>
  );
}

export function RowList({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cx("divide-y divide-slate-100 overflow-hidden", className)}>{children}</Card>;
}

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="no-print mt-4 flex items-center justify-between text-sm text-slate-500">
      <span>
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-2">
        {page > 1 && <LinkButton href={hrefFor(page - 1)} variant="secondary" size="sm">Previous</LinkButton>}
        {page < pages && <LinkButton href={hrefFor(page + 1)} variant="secondary" size="sm">Next</LinkButton>}
      </div>
    </div>
  );
}

export function Avatar({ name, tone = "brand" }: { name: string; tone?: "brand" | "amber" }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <div className={cx("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold", tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700")}>
      {letters || "?"}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "green" | "red" | "amber" }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cx("tabular mt-1 text-xl font-bold tracking-tight sm:text-2xl", tone === "green" && "text-emerald-600", tone === "red" && "text-red-600", tone === "amber" && "text-amber-600", !tone && "text-slate-900")}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}
