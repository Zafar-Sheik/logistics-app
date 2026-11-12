"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { f, fail, formObject, zodFail, type ActionState } from "@/lib/action";

type Kind = "CUSTOMER" | "SUBCONTRACTOR";
const base = (kind: Kind) => (kind === "CUSTOMER" ? "/customers" : "/subcontractors");

const schema = z.object({
  name: f.required("Name", 160),
  contactPerson: f.optional(120),
  email: f.email(),
  phone: f.optional(40),
  vatNumber: f.optional(60),
  regNumber: f.optional(60),
  address: f.optional(1000),
  paymentTerms: z.string().optional().transform((v) => (v == null || v === "" ? null : Number(v))).refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 365), "Enter days between 0 and 365"),
  notes: f.optional(2000),
  bankName: f.optional(120),
  bankAccountName: f.optional(160),
  bankAccountNumber: f.optional(60),
  bankBranchCode: f.optional(40),
});

export async function saveContact(kind: Kind, id: string | null, returnTo: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  let contactId = id;
  if (id) {
    const existing = await db.contact.findFirst({ where: { id, kind } });
    if (!existing) return fail("This record no longer exists.");
    await db.contact.update({ where: { id }, data: parsed.data });
  } else {
    contactId = (await db.contact.create({ data: { ...parsed.data, kind } })).id;
  }
  revalidatePath(base(kind));
  // When opened from another form (e.g. "new load"), go back there with the new contact selected.
  if (!id && returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    const sep = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${sep}${kind === "CUSTOMER" ? "customer" : "subcontractor"}=${contactId}`);
  }
  redirect(`${base(kind)}/${contactId}`);
}

export async function setContactArchived(id: string, archived: boolean): Promise<ActionState> {
  await requireUser();
  const c = await db.contact.update({ where: { id }, data: { archived } });
  revalidatePath(base(c.kind));
  revalidatePath(`${base(c.kind)}/${id}`);
  return { ok: true };
}

export async function deleteContact(id: string): Promise<ActionState> {
  await requireAdmin();
  const c = await db.contact.findUnique({
    where: { id },
    include: { _count: { select: { customerLoads: true, subbedLoads: true, documents: true, bills: true, payments: true } } },
  });
  if (!c) return fail("This record no longer exists.");
  const used = Object.values(c._count).reduce((a, b) => a + b, 0);
  if (used > 0) return fail("This contact has loads, invoices or payments, so it cannot be deleted. Archive it instead to hide it from lists.");
  await db.contact.delete({ where: { id } });
  revalidatePath(base(c.kind));
  redirect(base(c.kind));
}
