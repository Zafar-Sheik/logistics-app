"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { f, fail, zodFail, type ActionState } from "@/lib/action";
import { calcTotals } from "@/lib/domain";
import { addDays, num, parseDate, todayISO } from "@/lib/format";
import { nextNumber } from "@/lib/numbering";

type Kind = "INVOICE" | "QUOTE";
const base = (kind: Kind) => (kind === "INVOICE" ? "/invoices" : "/quotes");

const lineSchema = z.object({
  description: z.string().trim().min(1, "Describe this line").max(2000),
  quantity: z.number().positive("Quantity must be more than 0").max(1e7),
  unitPrice: z.number().min(0).max(1e11),
  taxRate: z.number().min(0).max(100),
  loadId: z.string().nullable().optional(),
});

const schema = z
  .object({
    customerId: z.string().min(1, "Choose a customer"),
    issueDate: f.date("Date"),
    dueDate: f.date("Due date"),
    reference: f.optional(80),
    notes: f.optional(4000),
    lines: z.array(lineSchema).min(1, "Add at least one line").max(100),
  })
  .refine((d) => d.dueDate >= d.issueDate, { path: ["dueDate"], message: "This cannot be before the document date" });

export type DocumentPayload = z.input<typeof schema>;

function touch(kind: Kind, id?: string) {
  revalidatePath(base(kind));
  if (id) revalidatePath(`${base(kind)}/${id}`);
  revalidatePath("/");
  revalidatePath("/loads");
}

export async function saveDocument(kind: Kind, id: string | null, payload: DocumentPayload, send: boolean): Promise<ActionState> {
  await requireUser();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;

  // All checks run side by side: customer exists, loads belong to them, loads not already invoiced.
  const loadIds = [...new Set(d.lines.map((l) => l.loadId).filter((x): x is string => !!x))];
  const [customer, valid, clash] = await Promise.all([
    db.contact.findFirst({ where: { id: d.customerId, kind: "CUSTOMER" }, select: { id: true } }),
    loadIds.length ? db.load.count({ where: { id: { in: loadIds }, customerId: d.customerId } }) : 0,
    kind === "INVOICE" && loadIds.length
      ? db.load.findFirst({
          where: { id: { in: loadIds }, lines: { some: { document: { kind: "INVOICE", status: { not: "VOID" }, ...(id ? { id: { not: id } } : {}) } } } },
          select: { number: true },
        })
      : null,
  ]);
  if (!customer) return fail("Please fix the following:", { customerId: "Choose a customer" });
  // Only loads that belong to this customer may be linked.
  if (valid !== loadIds.length) return fail("One of the loads on this document belongs to a different customer.");
  if (clash) return fail(`Load ${clash.number} is already on another invoice. Void that invoice first, or remove the load from this one.`);

  const totals = calcTotals(d.lines.map((l) => ({ ...l, loadId: l.loadId ?? null })));
  const header = {
    customerId: d.customerId,
    issueDate: parseDate(d.issueDate),
    dueDate: parseDate(d.dueDate),
    reference: d.reference,
    notes: d.notes,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
  };
  const lines = totals.lines.map((l, position) => ({
    position,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    amount: l.amount,
    loadId: l.loadId ?? null,
  }));

  let docId = id;
  if (id) {
    const existing = await db.document.findFirst({ where: { id, kind } });
    if (!existing) return fail("This document no longer exists.");
    if (["VOID", "PAID"].includes(existing.status) || num(existing.amountPaid) > 0) {
      return fail("This document has payments or is closed, so it can no longer be edited.");
    }
    await db.$transaction(async (tx) => {
      await tx.documentLine.deleteMany({ where: { documentId: id } });
      await tx.document.update({
        where: { id },
        data: {
          ...header,
          ...(send && existing.status === "DRAFT" ? { status: "SENT", sentAt: new Date() } : {}),
          lines: { create: lines },
        },
      });
    });
  } else {
    docId = await db.$transaction(async (tx) => {
      const number = await nextNumber(tx, kind === "INVOICE" ? "invoice" : "quote");
      const doc = await tx.document.create({
        data: { ...header, kind, number, status: send ? "SENT" : "DRAFT", sentAt: send ? new Date() : null, lines: { create: lines } },
      });
      return doc.id;
    });
  }
  touch(kind, docId!);
  redirect(`${base(kind)}/${docId}`);
}

export async function markDocumentSent(id: string): Promise<ActionState> {
  await requireUser();
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return fail("This document no longer exists.");
  if (doc.status !== "DRAFT") return { ok: true };
  await db.document.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
  touch(doc.kind, id);
  return { ok: true };
}

export async function setQuoteStatus(id: string, status: "ACCEPTED" | "DECLINED" | "SENT"): Promise<ActionState> {
  await requireUser();
  const doc = await db.document.findFirst({ where: { id, kind: "QUOTE" } });
  if (!doc) return fail("This quote no longer exists.");
  await db.document.update({ where: { id }, data: { status, sentAt: doc.sentAt ?? new Date() } });
  touch("QUOTE", id);
  return { ok: true };
}

/** Turns an accepted quote into a draft invoice with the same lines. */
export async function convertQuoteToInvoice(id: string): Promise<ActionState> {
  await requireUser();
  const quote = await db.document.findFirst({ where: { id, kind: "QUOTE" }, include: { lines: { orderBy: { position: "asc" } }, customer: true } });
  if (!quote) return fail("This quote no longer exists.");
  const already = await db.document.findFirst({ where: { quoteId: id, kind: "INVOICE", status: { not: "VOID" } } });
  if (already) redirect(`/invoices/${already.id}`);

  const company = await db.company.findUniqueOrThrow({ where: { id: 1 } });
  const today = todayISO();
  const terms = quote.customer.paymentTerms ?? company.paymentTermsDays;
  const invoiceId = await db.$transaction(async (tx) => {
    const number = await nextNumber(tx, "invoice");
    const inv = await tx.document.create({
      data: {
        kind: "INVOICE",
        number,
        status: "DRAFT",
        customerId: quote.customerId,
        issueDate: parseDate(today),
        dueDate: parseDate(addDays(today, terms)),
        reference: quote.reference ?? quote.number,
        notes: company.invoiceNotes,
        subtotal: quote.subtotal,
        taxTotal: quote.taxTotal,
        total: quote.total,
        quoteId: quote.id,
        lines: {
          create: quote.lines.map((l) => ({
            position: l.position,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            amount: l.amount,
            loadId: l.loadId,
          })),
        },
      },
    });
    await tx.document.update({ where: { id: quote.id }, data: { status: "ACCEPTED", sentAt: quote.sentAt ?? new Date() } });
    return inv.id;
  });
  touch("QUOTE", id);
  touch("INVOICE", invoiceId);
  redirect(`/invoices/${invoiceId}`);
}

export async function voidDocument(id: string): Promise<ActionState> {
  await requireAdmin();
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return fail("This document no longer exists.");
  if (num(doc.amountPaid) > 0) return fail("This invoice has payments recorded. Delete the payments first, then void it.");
  await db.document.update({ where: { id }, data: { status: "VOID" } });
  touch(doc.kind, id);
  return { ok: true };
}

/** Drafts and quotes can be deleted outright. Sent invoices must be voided to keep the audit trail. */
export async function deleteDocument(id: string): Promise<ActionState> {
  await requireUser();
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return fail("This document no longer exists.");
  if (doc.kind === "INVOICE" && doc.status !== "DRAFT") return fail("Only draft invoices can be deleted. Void this invoice instead.");
  await db.$transaction([db.documentLine.deleteMany({ where: { documentId: id } }), db.document.delete({ where: { id } })]);
  touch(doc.kind);
  redirect(base(doc.kind));
}
