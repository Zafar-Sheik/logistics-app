import "server-only";
import { db } from "./db";
import { getCompany } from "./auth";
import { balanceOf, docStatus } from "./domain";
import { fmtDate, isoDate, num, todayISO } from "./format";

/** Everything needed to draw an invoice or quote, as plain serialisable data. */
export async function getDocumentView(id: string) {
  // Side by side rather than nested includes: one round trip instead of two or three.
  const [base, customer, lines, payments, company] = await Promise.all([
    db.document.findUnique({ where: { id } }),
    db.contact.findFirst({ where: { documents: { some: { id } } } }),
    db.documentLine.findMany({ where: { documentId: id }, orderBy: { position: "asc" } }),
    db.payment.findMany({ where: { documentId: id }, orderBy: { date: "asc" } }),
    getCompany(),
  ]);
  if (!base || !customer || !company) return null;
  const doc = { ...base, customer, lines, payments };

  const isInvoice = doc.kind === "INVOICE";
  const status = docStatus(doc, todayISO());
  const taxGroups = new Map<number, number>();
  for (const l of doc.lines) {
    const rate = num(l.taxRate);
    if (rate > 0) taxGroups.set(rate, (taxGroups.get(rate) ?? 0) + (num(l.amount) * rate) / 100);
  }
  const address = [company.addressLine1, company.addressLine2, [company.city, company.postalCode].filter(Boolean).join(", "), [company.province, company.country].filter(Boolean).join(", ")].filter(Boolean) as string[];

  return {
    id: doc.id,
    kind: doc.kind,
    isInvoice,
    title: isInvoice ? (company.taxRegistered ? "Tax Invoice" : "Invoice") : "Quotation",
    number: doc.number,
    rawStatus: doc.status,
    status,
    issueDate: fmtDate(doc.issueDate),
    dueDate: fmtDate(doc.dueDate),
    issueDateISO: isoDate(doc.issueDate),
    dueDateISO: isoDate(doc.dueDate),
    reference: doc.reference,
    notes: doc.notes,
    currency: company.currency,
    taxLabel: company.taxLabel,
    showTax: company.taxRegistered || num(doc.taxTotal) > 0,
    accent: company.accentColor,
    subtotal: num(doc.subtotal),
    taxTotal: num(doc.taxTotal),
    taxBreakdown: [...taxGroups.keys()].sort((a, b) => a - b).map((rate) => ({ rate })),
    total: num(doc.total),
    amountPaid: num(doc.amountPaid),
    balance: balanceOf(doc),
    quoteId: doc.quoteId,
    lines: doc.lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: num(l.quantity),
      unitPrice: num(l.unitPrice),
      taxRate: num(l.taxRate),
      amount: num(l.amount),
      loadId: l.loadId,
    })),
    payments: doc.payments.map((p) => ({ id: p.id, date: fmtDate(p.date), amount: num(p.amount), method: p.method, reference: p.reference })),
    customer: {
      id: doc.customer.id,
      name: doc.customer.name,
      contactPerson: doc.customer.contactPerson,
      email: doc.customer.email,
      phone: doc.customer.phone,
      vatNumber: doc.customer.vatNumber,
      address: doc.customer.address,
    },
    company: {
      name: company.name,
      tradingName: company.tradingName,
      logo: company.logo,
      regNumber: company.regNumber,
      vatNumber: company.taxRegistered ? company.vatNumber : null,
      email: company.email,
      phone: company.phone,
      website: company.website,
      address,
      bank: company.bankAccountNumber
        ? {
            bankName: company.bankName,
            accountName: company.bankAccountName || company.name,
            accountNumber: company.bankAccountNumber,
            branchCode: company.bankBranchCode,
            accountType: company.bankAccountType,
            swift: company.bankSwift,
          }
        : null,
    },
  };
}

export type DocumentView = NonNullable<Awaited<ReturnType<typeof getDocumentView>>>;
