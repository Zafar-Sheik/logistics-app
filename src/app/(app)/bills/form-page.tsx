import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { saveBill } from "@/actions/money";
import { BillForm } from "@/components/bill-form";
import { Alert, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { addDays, CURRENCIES, isoDate, num, round2, todayISO } from "@/lib/format";

export async function BillFormPage({ id, preset }: { id?: string; preset?: { load?: string; subcontractor?: string } }) {
  const company = await requireCompany();
  const bill = id ? await db.bill.findUnique({ where: { id } }) : null;
  if (id && !bill) notFound();
  const back = { href: bill ? `/bills/${bill.id}` : "/bills", label: bill ? `Bill ${bill.number}` : "Bills" };
  if (bill?.status === "VOID") {
    return (<><PageHeader title="Edit bill" back={back} /><Alert tone="amber">This bill is void and can no longer be edited.</Alert></>);
  }

  const [subs, loads] = await Promise.all([
    db.contact.findMany({ where: { kind: "SUBCONTRACTOR", OR: [{ archived: false }, ...(bill ? [{ id: bill.subcontractorId }] : [])] }, select: { id: true, name: true, paymentTerms: true }, orderBy: { name: "asc" } }),
    db.load.findMany({ where: { status: { not: "CANCELLED" }, subcontractorId: { not: null } }, orderBy: { pickupDate: "desc" }, take: 300, select: { id: true, number: true, origin: true, destination: true, subcontractorId: true, subRate: true } }),
  ]);
  if (subs.length === 0) {
    return (
      <>
        <PageHeader title="New bill" back={back} />
        <EmptyState icon={<Truck />} title="Add a subcontractor first" text="A bill is an invoice a trucking company sent you. Add the subcontractor and you will come straight back here." action={<LinkButton href="/subcontractors/new?returnTo=/bills/new">Add a subcontractor</LinkButton>} />
      </>
    );
  }

  const today = todayISO();
  const presetLoad = !bill && preset?.load ? loads.find((l) => l.id === preset.load) : undefined;
  const presetSub = presetLoad?.subcontractorId ?? (subs.some((s) => s.id === preset?.subcontractor) ? preset!.subcontractor! : "");
  const terms = subs.find((s) => s.id === presetSub)?.paymentTerms ?? 30;
  const companyRate = company.taxRegistered ? num(company.taxRate) : 0;
  const existingRate = bill && num(bill.subtotal) > 0 ? round2((num(bill.taxTotal) / num(bill.subtotal)) * 100) : null;

  return (
    <>
      <PageHeader title={bill ? `Edit bill ${bill.number}` : "New subcontractor bill"} subtitle={bill ? undefined : "Capture the invoice a trucking company sent you."} back={back} />
      <BillForm
        action={saveBill.bind(null, bill?.id ?? null)}
        subs={subs.map((s) => ({ id: s.id, name: s.name, terms: s.paymentTerms ?? 30 }))}
        loads={loads.map((l) => ({ id: l.id, subcontractorId: l.subcontractorId, label: `${l.number} · ${l.origin} → ${l.destination}`, rate: num(l.subRate) }))}
        currency={company.currency}
        symbol={CURRENCIES[company.currency]?.symbol ?? company.currency}
        taxLabel={company.taxLabel}
        companyTaxRate={num(company.taxRate)}
        cancelHref={back.href}
        isEdit={!!bill}
        values={{
          subcontractorId: bill?.subcontractorId ?? presetSub,
          loadId: bill?.loadId ?? presetLoad?.id ?? "",
          number: bill?.number ?? "",
          issueDate: bill ? isoDate(bill.issueDate) : today,
          dueDate: bill ? isoDate(bill.dueDate) : addDays(today, terms),
          subtotal: bill ? num(bill.subtotal).toFixed(2) : presetLoad && num(presetLoad.subRate) > 0 ? num(presetLoad.subRate).toFixed(2) : "",
          taxRate: String(existingRate ?? companyRate),
          notes: bill?.notes ?? "",
        }}
      />
    </>
  );
}
