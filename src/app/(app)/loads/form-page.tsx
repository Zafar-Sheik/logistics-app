import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { saveLoad } from "@/actions/loads";
import { LoadForm } from "@/components/load-form";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { CURRENCIES, isoDate, num, todayISO } from "@/lib/format";

export async function LoadFormPage({ id, preset }: { id?: string; preset?: { customer?: string; subcontractor?: string } }) {
  const company = await requireCompany();
  const load = id ? await db.load.findUnique({ where: { id } }) : null;
  if (id && !load) notFound();

  const keep = [load?.customerId, load?.subcontractorId].filter((x): x is string => !!x);
  const contacts = await db.contact.findMany({
    where: { OR: [{ archived: false }, { id: { in: keep } }] },
    select: { id: true, name: true, kind: true },
    orderBy: { name: "asc" },
  });
  const customers = contacts.filter((c) => c.kind === "CUSTOMER");
  const subcontractors = contacts.filter((c) => c.kind === "SUBCONTRACTOR");

  const header = <PageHeader title={load ? `Edit ${load.number}` : "New load"} back={{ href: load ? `/loads/${load.id}` : "/loads", label: load ? load.number : "Loads" }} />;

  if (customers.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Building2 />}
          title="Add a customer first"
          text="Every load is done for a customer. Add the company you are moving this freight for, then come straight back here."
          action={<LinkButton href="/customers/new?returnTo=/loads/new">Add a customer</LinkButton>}
        />
      </>
    );
  }

  const money = (v: unknown) => (num(v) ? num(v).toFixed(2) : "");
  return (
    <>
      {header}
      <LoadForm
        action={saveLoad.bind(null, load?.id ?? null)}
        customers={customers}
        subcontractors={subcontractors}
        currency={company.currency}
        symbol={CURRENCIES[company.currency]?.symbol ?? company.currency}
        taxLabel={company.taxRegistered ? company.taxLabel : null}
        cancelHref={load ? `/loads/${load.id}` : "/loads"}
        isEdit={!!load}
        values={{
          customerId: load?.customerId ?? (customers.some((c) => c.id === preset?.customer) ? preset!.customer! : ""),
          subcontractorId: load?.subcontractorId ?? (subcontractors.some((c) => c.id === preset?.subcontractor) ? preset!.subcontractor! : ""),
          customerRef: load?.customerRef ?? "",
          origin: load?.origin ?? "",
          destination: load?.destination ?? "",
          pickupDate: load ? isoDate(load.pickupDate) : todayISO(),
          deliveryDate: isoDate(load?.deliveryDate),
          cargo: load?.cargo ?? "",
          vehicleReg: load?.vehicleReg ?? "",
          driverName: load?.driverName ?? "",
          driverPhone: load?.driverPhone ?? "",
          customerRate: money(load?.customerRate),
          subRate: money(load?.subRate),
          notes: load?.notes ?? "",
        }}
      />
    </>
  );
}
