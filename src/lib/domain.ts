// Business rules shared by server and client code.
import { daysBetween, num, round2 } from "./format";

export type Tone = "slate" | "blue" | "green" | "amber" | "red" | "violet";

export const LOAD_STATUS: Record<string, { label: string; tone: Tone }> = {
  PLANNED: { label: "Booked", tone: "slate" },
  IN_TRANSIT: { label: "In transit", tone: "blue" },
  DELIVERED: { label: "Delivered", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};

export const PAYMENT_METHODS: Record<string, string> = {
  EFT: "EFT / Bank transfer",
  CASH: "Cash",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const EXPENSE_CATEGORIES = [
  "Fuel",
  "Tolls",
  "Vehicle repairs & maintenance",
  "Insurance",
  "Salaries & wages",
  "Rent",
  "Phone & internet",
  "Software & subscriptions",
  "Bank charges",
  "Accounting & legal",
  "Licences & permits",
  "Marketing",
  "Office supplies",
  "Travel & accommodation",
  "Other",
];

export const ATTACHMENT_LABELS = ["Proof of delivery", "Rate confirmation", "Subcontractor invoice", "Other"];

type DocLike = { kind: string; status: string; dueDate: Date | string; total: unknown; amountPaid: unknown };

/** The status a person cares about, including derived "Overdue" / "Part paid" / "Expired". */
export function docStatus(doc: DocLike, today: string): { key: string; label: string; tone: Tone } {
  const due = typeof doc.dueDate === "string" ? doc.dueDate.slice(0, 10) : doc.dueDate.toISOString().slice(0, 10);
  switch (doc.status) {
    case "DRAFT":
      return { key: "draft", label: "Draft", tone: "slate" };
    case "VOID":
      return { key: "void", label: "Void", tone: "slate" };
    case "PAID":
      return { key: "paid", label: "Paid", tone: "green" };
    case "ACCEPTED":
      return { key: "accepted", label: "Accepted", tone: "green" };
    case "DECLINED":
      return { key: "declined", label: "Declined", tone: "red" };
  }
  if (doc.kind === "QUOTE") {
    return due < today ? { key: "expired", label: "Expired", tone: "amber" } : { key: "sent", label: "Sent", tone: "blue" };
  }
  if (due < today) {
    const days = daysBetween(due, today);
    return { key: "overdue", label: `Overdue ${days}d`, tone: "red" };
  }
  if (num(doc.amountPaid) > 0) return { key: "partial", label: "Part paid", tone: "amber" };
  return { key: "sent", label: "Awaiting payment", tone: "blue" };
}

type BillLike = { status: string; dueDate: Date | string; amountPaid: unknown };

export function billStatus(bill: BillLike, today: string): { key: string; label: string; tone: Tone } {
  const due = typeof bill.dueDate === "string" ? bill.dueDate.slice(0, 10) : bill.dueDate.toISOString().slice(0, 10);
  if (bill.status === "PAID") return { key: "paid", label: "Paid", tone: "green" };
  if (bill.status === "VOID") return { key: "void", label: "Void", tone: "slate" };
  if (due < today) return { key: "overdue", label: `Overdue ${daysBetween(due, today)}d`, tone: "red" };
  if (num(bill.amountPaid) > 0) return { key: "partial", label: "Part paid", tone: "amber" };
  return { key: "open", label: "To pay", tone: "amber" };
}

export type LineInput = { description: string; quantity: number; unitPrice: number; taxRate: number; loadId?: string | null };

export function calcTotals(lines: LineInput[]) {
  let subtotal = 0;
  let taxTotal = 0;
  const computed = lines.map((l) => {
    const amount = round2(num(l.quantity) * num(l.unitPrice));
    const tax = round2((amount * num(l.taxRate)) / 100);
    subtotal += amount;
    taxTotal += tax;
    return { ...l, amount, tax };
  });
  subtotal = round2(subtotal);
  taxTotal = round2(taxTotal);
  return { lines: computed, subtotal, taxTotal, total: round2(subtotal + taxTotal) };
}

export function balanceOf(d: { total: unknown; amountPaid: unknown }) {
  return round2(num(d.total) - num(d.amountPaid));
}

export function loadLineDescription(l: {
  number: string;
  origin: string;
  destination: string;
  pickupDate: Date | string;
  cargo?: string | null;
  vehicleReg?: string | null;
  customerRef?: string | null;
}) {
  const parts = [`Transport: ${l.origin} to ${l.destination}`, `Load ${l.number}`];
  if (l.cargo) parts.push(l.cargo);
  if (l.vehicleReg) parts.push(`Vehicle ${l.vehicleReg}`);
  if (l.customerRef) parts.push(`Ref ${l.customerRef}`);
  return parts.join(" · ");
}
