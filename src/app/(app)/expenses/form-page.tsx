import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { deleteExpense, saveExpense } from "@/actions/money";
import { ExpenseForm } from "@/components/expense-form";
import { ConfirmAction } from "@/components/sheet";
import { PageHeader } from "@/components/ui";
import { CURRENCIES, isoDate, num, todayISO } from "@/lib/format";

export async function ExpenseFormPage({ id }: { id?: string }) {
  const company = await requireCompany();
  const e = id ? await db.expense.findUnique({ where: { id } }) : null;
  if (id && !e) notFound();
  const today = todayISO();
  return (
    <>
      <PageHeader title={e ? "Edit expense" : "New expense"} subtitle={e ? undefined : "Fuel, tolls, repairs and other running costs."} back={{ href: "/expenses", label: "Expenses" }} />
      <ExpenseForm
        action={saveExpense.bind(null, e?.id ?? null)}
        symbol={CURRENCIES[company.currency]?.symbol ?? company.currency}
        taxLabel={company.taxLabel}
        taxRate={company.taxRegistered ? num(company.taxRate) : 0}
        today={today}
        isEdit={!!e}
        values={{
          date: e ? isoDate(e.date) : today,
          category: e?.category ?? "",
          vendor: e?.vendor ?? "",
          description: e?.description ?? "",
          amount: e ? num(e.amount).toFixed(2) : "",
          taxAmount: e && num(e.taxAmount) > 0 ? num(e.taxAmount).toFixed(2) : "",
          method: e?.method ?? "CARD",
          reference: e?.reference ?? "",
        }}
      />
      {e && (
        <div className="mt-4">
          <ConfirmAction label="Delete expense" icon={<Trash2 className="size-4" />} variant="dangerGhost" title="Delete this expense?" message="This permanently removes the expense from your records and reports." confirmLabel="Delete" action={deleteExpense.bind(null, e.id)} />
        </div>
      )}
    </>
  );
}
