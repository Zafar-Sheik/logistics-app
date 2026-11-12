"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { cx } from "@/lib/format";
import { Alert, btn, type ButtonVariant } from "./ui";

type Ctx = { state: ActionState; pending: boolean };
const FormCtx = createContext<Ctx>({ state: null, pending: false });
export const useFormState = () => useContext(FormCtx);

/**
 * A form wired to a server action. Unlike a plain <form action>, typed values
 * are kept when the server sends back validation errors.
 */
export function ActionForm({
  action,
  children,
  className,
  onSuccess,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  onSuccess?: () => void;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const done = useRef(onSuccess);
  useEffect(() => {
    done.current = onSuccess;
  });

  useEffect(() => {
    if (state?.ok) done.current?.();
    if (state?.error) ref.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state]);

  return (
    <FormCtx.Provider value={{ state, pending }}>
      <form
        ref={ref}
        noValidate
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
      >
        {children}
      </form>
    </FormCtx.Provider>
  );
}

export function FormMessage() {
  const { state } = useFormState();
  if (state?.error) return <Alert tone="red">{state.error}</Alert>;
  if (state?.ok && state.message) return <Alert tone="green">{state.message}</Alert>;
  return null;
}

export function SubmitButton({
  children,
  variant = "primary",
  block,
  className,
  size,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  block?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormState();
  return (
    <button type="submit" disabled={pending} className={btn({ variant, block, size }, className)}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export const inputClass =
  "block w-full rounded-xl border border-slate-300 bg-white px-3.5 h-11 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/15 disabled:bg-slate-50 disabled:text-slate-500";

function Wrap({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
          {label}
          {optional && <span className="text-xs font-normal text-slate-400">Optional</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

type FieldBase = { label?: string; hint?: ReactNode; optional?: boolean; wrapClass?: string; name: string };

export function TextField({ label, hint, optional, wrapClass, className, prefix, ...props }: FieldBase & { prefix?: string } & Omit<ComponentProps<"input">, "name" | "prefix">) {
  const id = useId();
  const error = useFormState().state?.fieldErrors?.[props.name];
  return (
    <Wrap id={id} label={label} hint={hint} error={error} optional={optional} className={wrapClass}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-500">{prefix}</span>}
        <input id={id} aria-invalid={!!error} {...props} className={cx(inputClass, prefix && "pl-10", className)} />
      </div>
    </Wrap>
  );
}

export function MoneyField(props: FieldBase & { prefix?: string } & Omit<ComponentProps<"input">, "name" | "prefix">) {
  return <TextField inputMode="decimal" autoComplete="off" placeholder="0.00" {...props} className={cx("tabular", props.className)} />;
}

export function DateField(props: FieldBase & Omit<ComponentProps<"input">, "name">) {
  return <TextField type="date" {...props} />;
}

export function SelectField({
  label,
  hint,
  optional,
  wrapClass,
  className,
  options,
  placeholder,
  ...props
}: FieldBase & { options: { value: string; label: string }[]; placeholder?: string } & Omit<ComponentProps<"select">, "name">) {
  const id = useId();
  const error = useFormState().state?.fieldErrors?.[props.name];
  return (
    <Wrap id={id} label={label} hint={hint} error={error} optional={optional} className={wrapClass}>
      <select id={id} aria-invalid={!!error} {...props} className={cx(inputClass, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path d=%22M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z%22/></svg>')] bg-[length:20px] bg-[right_0.6rem_center] bg-no-repeat pr-9", className)}>
        {placeholder != null && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function TextAreaField({ label, hint, optional, wrapClass, className, ...props }: FieldBase & Omit<ComponentProps<"textarea">, "name">) {
  const id = useId();
  const error = useFormState().state?.fieldErrors?.[props.name];
  return (
    <Wrap id={id} label={label} hint={hint} error={error} optional={optional} className={wrapClass}>
      <textarea id={id} rows={3} aria-invalid={!!error} {...props} className={cx(inputClass, "h-auto py-2.5", className)} />
    </Wrap>
  );
}

export function CheckboxField({ label, hint, name, defaultChecked, onChange }: { label: string; hint?: string; name: string; defaultChecked?: boolean; onChange?: (checked: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
      <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} onChange={(e) => onChange?.(e.target.checked)} className="mt-0.5 size-5 shrink-0 rounded border-slate-300 accent-brand-600" />
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

/** Groups fields under a heading inside a card. */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Sticky save bar: always reachable with a thumb on phones. */
export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-5 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4">
      {children}
    </div>
  );
}
