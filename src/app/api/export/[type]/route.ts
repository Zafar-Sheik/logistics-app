import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isoDate, num, parseDate, todayISO } from "@/lib/format";

type Cell = string | number | null | undefined;

function csv(rows: Cell[][]) {
  const esc = (v: Cell) => {
    let s = v == null ? "" : String(v);
    // Stop spreadsheet apps from treating user text as a formula.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

const LIMIT = 20000;

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  if (!(await getUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { type } = await params;
  const sp = new URL(request.url).searchParams;
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const from = sp.get("from");
  const to = sp.get("to");
  const range = from && to && ISO.test(from) && ISO.test(to) ? { gte: parseDate(from), lte: parseDate(to) } : undefined;

  let rows: Cell[][];
  switch (type) {
    case "invoices": {
      const data = await db.document.findMany({ where: { kind: "INVOICE", issueDate: range }, include: { customer: { select: { name: true } } }, orderBy: { issueDate: "desc" }, take: LIMIT });
      rows = [["Number", "Status", "Customer", "Date", "Due date", "Reference", "Subtotal", "Tax", "Total", "Paid", "Balance"],
        ...data.map((d) => [d.number, d.status, d.customer.name, isoDate(d.issueDate), isoDate(d.dueDate), d.reference, num(d.subtotal), num(d.taxTotal), num(d.total), num(d.amountPaid), num(d.total) - num(d.amountPaid)])];
      break;
    }
    case "bills": {
      const data = await db.bill.findMany({ where: { issueDate: range }, include: { subcontractor: { select: { name: true } }, load: { select: { number: true } } }, orderBy: { issueDate: "desc" }, take: LIMIT });
      rows = [["Bill number", "Status", "Subcontractor", "Load", "Date", "Due date", "Subtotal", "Tax", "Total", "Paid", "Balance"],
        ...data.map((b) => [b.number, b.status, b.subcontractor.name, b.load?.number, isoDate(b.issueDate), isoDate(b.dueDate), num(b.subtotal), num(b.taxTotal), num(b.total), num(b.amountPaid), num(b.total) - num(b.amountPaid)])];
      break;
    }
    case "payments": {
      const data = await db.payment.findMany({ where: { date: range }, include: { contact: { select: { name: true } }, document: { select: { number: true } }, bill: { select: { number: true } } }, orderBy: { date: "desc" }, take: LIMIT });
      rows = [["Date", "Direction", "Name", "Document", "Method", "Reference", "Amount"],
        ...data.map((p) => [isoDate(p.date), p.direction === "IN" ? "Money in" : "Money out", p.contact.name, p.document?.number ?? p.bill?.number, p.method, p.reference, num(p.amount)])];
      break;
    }
    case "expenses": {
      const data = await db.expense.findMany({ where: { date: range }, orderBy: { date: "desc" }, take: LIMIT });
      rows = [["Date", "Category", "Paid to", "Description", "Method", "Reference", "Total", "Tax"],
        ...data.map((e) => [isoDate(e.date), e.category, e.vendor, e.description, e.method, e.reference, num(e.amount), num(e.taxAmount)])];
      break;
    }
    case "loads": {
      const data = await db.load.findMany({ where: { pickupDate: range }, include: { customer: { select: { name: true } }, subcontractor: { select: { name: true } } }, orderBy: { pickupDate: "desc" }, take: LIMIT });
      rows = [["Load", "Status", "Customer", "Customer ref", "Subcontractor", "From", "To", "Pickup", "Delivery", "Cargo", "Truck", "Driver", "POD received", "Customer rate", "Subcontractor rate", "Margin"],
        ...data.map((l) => [l.number, l.status, l.customer.name, l.customerRef, l.subcontractor?.name, l.origin, l.destination, isoDate(l.pickupDate), isoDate(l.deliveryDate), l.cargo, l.vehicleReg, l.driverName, l.podReceived ? "Yes" : "No", num(l.customerRate), num(l.subRate), num(l.customerRate) - num(l.subRate)])];
      break;
    }
    case "contacts": {
      const data = await db.contact.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }], take: LIMIT });
      rows = [["Type", "Name", "Contact person", "Email", "Phone", "VAT number", "Registration no", "Address", "Payment terms (days)", "Archived"],
        ...data.map((c) => [c.kind === "CUSTOMER" ? "Customer" : "Subcontractor", c.name, c.contactPerson, c.email, c.phone, c.vatNumber, c.regNumber, c.address, c.paymentTerms, c.archived ? "Yes" : "No"])];
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${todayISO()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
