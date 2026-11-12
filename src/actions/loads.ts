"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { f, fail, formObject, zodFail, type ActionState } from "@/lib/action";
import { parseDate, todayISO } from "@/lib/format";
import { nextNumber } from "@/lib/numbering";

const schema = z
  .object({
    customerId: z.string().min(1, "Choose a customer"),
    subcontractorId: z.string().optional().transform((v) => v || null),
    customerRef: f.optional(80),
    origin: f.required("Pickup location"),
    destination: f.required("Delivery location"),
    pickupDate: f.date("Pickup date"),
    deliveryDate: f.optionalDate(),
    cargo: f.optional(255),
    vehicleReg: f.optional(60),
    driverName: f.optional(120),
    driverPhone: f.optional(40),
    customerRate: f.money("Customer rate"),
    subRate: f.money("Subcontractor rate"),
    notes: f.optional(2000),
  })
  .refine((d) => !d.deliveryDate || d.deliveryDate >= d.pickupDate, { path: ["deliveryDate"], message: "Delivery cannot be before pickup" });

export async function saveLoad(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;

  const customer = await db.contact.findFirst({ where: { id: d.customerId, kind: "CUSTOMER" } });
  if (!customer) return fail("Please check the highlighted fields.", { customerId: "Choose a customer" });
  if (d.subcontractorId && !(await db.contact.findFirst({ where: { id: d.subcontractorId, kind: "SUBCONTRACTOR" } }))) {
    return fail("Please check the highlighted fields.", { subcontractorId: "Choose a subcontractor" });
  }

  const data = {
    ...d,
    pickupDate: parseDate(d.pickupDate),
    deliveryDate: d.deliveryDate ? parseDate(d.deliveryDate) : null,
  };

  let loadId = id;
  if (id) {
    await db.load.update({ where: { id }, data });
  } else {
    loadId = await db.$transaction(async (tx) => {
      const number = await nextNumber(tx, "load");
      return (await tx.load.create({ data: { ...data, number } })).id;
    });
  }
  revalidatePath("/loads");
  redirect(`/loads/${loadId}`);
}

export async function setLoadStatus(id: string, status: "PLANNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED"): Promise<ActionState> {
  await requireUser();
  const load = await db.load.findUnique({ where: { id }, include: { lines: { where: { document: { kind: "INVOICE", status: { not: "VOID" } } }, take: 1 } } });
  if (!load) return fail("This load no longer exists.");
  if (status === "CANCELLED" && load.lines.length > 0) return fail("This load is already on an invoice. Void the invoice first, then cancel the load.");
  await db.load.update({
    where: { id },
    data: {
      status,
      // Stamp today's date when marking delivered, unless a date was already entered.
      deliveryDate: status === "DELIVERED" && !load.deliveryDate ? parseDate(todayISO()) : undefined,
    },
  });
  revalidatePath("/loads");
  revalidatePath(`/loads/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function setPodReceived(id: string, podReceived: boolean): Promise<ActionState> {
  await requireUser();
  await db.load.update({ where: { id }, data: { podReceived } });
  revalidatePath(`/loads/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteLoad(id: string): Promise<ActionState> {
  await requireAdmin();
  const load = await db.load.findUnique({ where: { id }, include: { _count: { select: { lines: true, bills: true } } } });
  if (!load) return fail("This load no longer exists.");
  if (load._count.lines > 0 || load._count.bills > 0) {
    return fail("This load is linked to an invoice, quote or bill, so it cannot be deleted. Mark it as cancelled instead.");
  }
  await db.$transaction([db.attachment.deleteMany({ where: { loadId: id } }), db.load.delete({ where: { id } })]);
  revalidatePath("/loads");
  redirect("/loads");
}

export async function deleteAttachment(id: string): Promise<ActionState> {
  await requireUser();
  const a = await db.attachment.findUnique({ where: { id }, select: { loadId: true } });
  if (!a) return { ok: true };
  await db.attachment.delete({ where: { id } });
  revalidatePath(`/loads/${a.loadId}`);
  return { ok: true };
}
