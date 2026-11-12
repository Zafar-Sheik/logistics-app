"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { Alert, btn, type ButtonVariant } from "./ui";
import type { ActionState } from "@/lib/action";

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full animate-sheet flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex size-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-1 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** A button that opens a sheet. `children` may be a render function to close the sheet. */
export function SheetButton({
  label,
  title,
  variant = "secondary",
  size,
  block,
  icon,
  className,
  children,
}: {
  label: ReactNode;
  title: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn({ variant, size, block }, className)}>
        {icon}
        {label}
      </button>
      <Sheet open={open} onClose={close} title={title}>
        {typeof children === "function" ? children(close) : children}
      </Sheet>
    </>
  );
}

/** Runs a server action after an explicit confirmation step. */
export function ConfirmAction({
  label,
  title,
  message,
  confirmLabel,
  action,
  variant = "secondary",
  confirmVariant = "danger",
  size,
  icon,
  block,
}: {
  label: ReactNode;
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<ActionState | void>;
  variant?: ButtonVariant;
  confirmVariant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => { setError(null); setOpen(true); }} className={btn({ variant, size, block })}>
        {icon}
        {label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-sm text-slate-600">{message}</p>
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={btn({ variant: "secondary" })} onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            className={btn({ variant: confirmVariant })}
            onClick={() =>
              start(async () => {
                const res = await action();
                if (res && res.error) setError(res.error);
                else setOpen(false);
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </Sheet>
    </>
  );
}

/** One-tap server action button (no confirmation), with pending + error state. */
export function ActionButton({
  action,
  children,
  variant = "primary",
  size,
  block,
  icon,
}: {
  action: () => Promise<ActionState | void>;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  icon?: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={btn({ variant, size, block })}
        onClick={() =>
          start(async () => {
            const res = await action();
            setError(res && res.error ? res.error : null);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : icon}
        {children}
      </button>
      {error && <p className="basis-full text-sm text-red-600">{error}</p>}
    </>
  );
}
