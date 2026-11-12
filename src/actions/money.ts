"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { f, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { balanceOf, EXPENSE_CATEGORIES } from "@/lib/domain";
import { money, num, parseDate, round2 } from "@/lib/format";

const method = z.enum(["EFT", "CASH", "CARD", "CHEQUE", "OTHER"]);

function touchAll() {
  for (const p of ["/", "/invoices", "/bills", "/payments", "/loads", "/expenses"]) revalidatePath(p);
}

// ---- Payments --------------------------------------------------------------

const paymentSchema = z.object({
  amount: f.money("Amount").refine((v) => v > 0, "Enter an amount more than 0"),
  date: f.date("Date"),
  method,
  reference: f.optional(120),
  notes: f.optional(255),
});

/** Money received from a customer against an invoice. */
export async function recordInvoicePayment(documentId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = paymentSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  const company = await db.company.findUniqueOrThrow({ where: { id: 1 } });

  const result = await db.$transaction(async (tx) => {
    const doc = await tx.document.findFirst({ where: { id: documentId, kind: "INVOICE" } });
    if (!doc) return "This invoice no longer exists.";
    if (doc.status === "VOID") return "This invoice is void.";
    const balance = balanceOf(doc);
    if (d.amount > balance + 0.004) return `The most you can record is ${money(balance, company.currency)} (the balance due).`;
    const paid = round2(num(doc.amountPaid) + d.amount);
    await tx.payment.create({
      data: { direction: "IN", contactId: doc.customerId, documentId, amount: d.amount, date: parseDate(d.date), method: d.method, reference: d.reference, notes: d.notes },
    });
    await tx.document.update({
      where: { id: documentId },
      data: { amountPaid: paid, status: paid >= num(doc.total) - 0.004 ? "PAID" : "SENT", sentAt: doc.sentAt ?? new Date() },
    });
    return null;
  });
  if (result) return fail(result);
  touchAll();
  revalidatePath(`/invoices/${documentId}`);
  return { ok: true };
}

/** Money paid to a subcontractor against a bill. */
export async function recordBillPayment(billId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = paymentSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  const company = await db.company.findUniqueOrThrow({ where: { id: 1 } });

  const result = await db.$transaction(async (tx) => {
    const bill = await tx.bill.findUnique({ where: { id: billId } });
    if (!bill) return "This bill no longer exists.";
    if (bill.status === "VOID") return "This bill is void.";
    const balance = balanceOf(bill);
    if (d.amount > balance + 0.004) return `The most you can record is ${money(balance, company.currency)} (the balance owing).`;
    const paid = round2(num(bill.amountPaid) + d.amount);
    await tx.payment.create({
      data: { direction: "OUT", contactId: bill.subcontractorId, billId, amount: d.amount, date: parseDate(d.date), method: d.method, reference: d.reference, notes: d.notes },
    });
    await tx.bill.update({ where: { id: billId }, data: { amountPaid: paid, status: paid >= num(bill.total) - 0.004 ? "PAID" : "OPEN" } });
    return null;
  });
  if (result) return fail(result);
  touchAll();
  revalidatePath(`/bills/${billId}`);
  return { ok: true };
}

export async function deletePayment(id: string): Promise<ActionState> {
  await requireAdmin();
  const result = await db.$transaction(async (tx) => {
    const p = await tx.payment.findUnique({ where: { id } });
    if (!p) return null;
    if (p.documentId) {
      const doc = await tx.document.findUnique({ where: { id: p.documentId } });
      if (doc) {
        const paid = Math.max(0, round2(num(doc.amountPaid) - num(p.amount)));
        await tx.document.update({ where: { id: doc.id }, data: { amountPaid: paid, status: doc.status === "VOID" ? "VOID" : "SENT" } });
      }
    }
    if (p.billId) {
      const bill = await tx.bill.findUnique({ where: { id: p.billId } });
      if (bill) {
        const paid = Math.max(0, round2(num(bill.amountPaid) - num(p.amount)));
        await tx.bill.update({ where: { id: bill.id }, data: { amountPaid: paid, status: bill.status === "VOID" ? "VOID" : "OPEN" } });
      }
    }
    await tx.payment.delete({ where: { id } });
    return p;
  });
  touchAll();
  if (result?.documentId) revalidatePath(`/invoices/${result.documentId}`);
  if (result?.billId) revalidatePath(`/bills/${result.billId}`);
  return { ok: true };
}

// ---- Subcontractor bills ---------------------------------------------------

const billSchema = z
  .object({
    subcontractorId: z.string().min(1, "Choose a subcontractor"),
    loadId: z.string().optional().transform((v) => v || null),
    number: f.required("Their invoice number", 60),
    issueDate: f.date("Invoice date"),
    dueDate: f.date("Due date"),
    subtotal: f.money("Amount").refine((v) => v > 0, "Enter an amount more than 0"),
    taxRate: f.money("Tax rate").refine((v) => v <= 100, "Tax rate must be 100 or less"),
    notes: f.optional(2000),
  })
  .refine((d) => d.dueDate >= d.issueDate, { path: ["dueDate"], message: "Due date cannot be before the invoice date" });

export async function saveBill(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = billSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;

  const sub = await db.contact.findFirst({ where: { id: d.subcontractorId, kind: "SUBCONTRACTOR" } });
  if (!sub) return fail("Please check the highlighted fields.", { subcontractorId: "Choose a subcontractor" });
  if (d.loadId && !(await db.load.findUnique({ where: { id: d.loadId } }))) return fail("That load no longer exists.", { loadId: "Choose a load" });

  const duplicate = await db.bill.findFirst({
    where: { subcontractorId: d.subcontractorId, number: d.number, status: { not: "VOID" }, ...(id ? { id: { not: id } } : {}) },
  });
  if (duplicate) return fail("Please check the highlighted fields.", { number: `You already captured invoice ${d.number} from ${sub.name}` });

  const taxTotal = round2((d.subtotal * d.taxRate) / 100);
  const data = {
    subcontractorId: d.subcontractorId,
    loadId: d.loadId,
    number: d.number,
    issueDate: parseDate(d.issueDate),
    dueDate: parseDate(d.dueDate),
    subtotal: d.subtotal,
    taxTotal,
    total: round2(d.subtotal + taxTotal),
    notes: d.notes,
  };

  let billId = id;
  if (id) {
    const existing = await db.bill.findUnique({ where: { id } });
    if (!existing) return fail("This bill no longer exists.");
    if (existing.status === "VOID") return fail("This bill is void and cannot be edited.");
    if (num(existing.amountPaid) > data.total + 0.004) return fail("The total cannot be less than what has already been paid.", { subtotal: "Less than the amount already paid" });
    await db.bill.update({ where: { id }, data: { ...data, status: num(existing.amountPaid) >= data.total - 0.004 && num(existing.amountPaid) > 0 ? "PAID" : "OPEN" } });
  } else {
    billId = (await db.bill.create({ data })).id;
  }
  touchAll();
  redirect(`/bills/${billId}`);
}

export async function voidBill(id: string): Promise<ActionState> {
  await requireAdmin();
  const bill = await db.bill.findUnique({ where: { id } });
  if (!bill) return fail("This bill no longer exists.");
  if (num(bill.amountPaid) > 0) return fail("This bill has payments recorded. Delete the payments first, then void it.");
  await db.bill.update({ where: { id }, data: { status: "VOID" } });
  touchAll();
  revalidatePath(`/bills/${id}`);
  return { ok: true };
}

export async function deleteBill(id: string): Promise<ActionState> {
  await requireAdmin();
  const bill = await db.bill.findUnique({ where: { id } });
  if (!bill) return fail("This bill no longer exists.");
  if (num(bill.amountPaid) > 0) return fail("This bill has payments recorded. Delete the payments first.");
  await db.bill.delete({ where: { id } });
  touchAll();
  redirect("/bills");
}

// ---- Expenses --------------------------------------------------------------

const expenseSchema = z
  .object({
    date: f.date("Date"),
    category: z.string().refine((c) => EXPENSE_CATEGORIES.includes(c), "Choose a category"),
    vendor: f.optional(160),
    description: f.optional(255),
    amount: f.money("Amount").refine((v) => v > 0, "Enter an amount more than 0"),
    taxAmount: f.money("Tax"),
    method,
    reference: f.optional(120),
  })
  .refine((d) => d.taxAmount <= d.amount, { path: ["taxAmount"], message: "Tax cannot be more than the total" });

export async function saveExpense(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = expenseSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const data = { ...parsed.data, date: parseDate(parsed.data.date) };
  if (id) await db.expense.update({ where: { id }, data });
  else await db.expense.create({ data });
  touchAll();
  redirect("/expenses");
}

export async function deleteExpense(id: string): Promise<ActionState> {
  await requireUser();
  await db.expense.deleteMany({ where: { id } });
  touchAll();
  redirect("/expenses");
}
