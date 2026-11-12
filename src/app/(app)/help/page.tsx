import type { Metadata } from "next";
import { Banknote, ChevronDown, FileText, Package, Receipt, Truck } from "lucide-react";
import { ReplayTourButton } from "@/components/replay-tour";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Help & guide" };

const FLOW = [
  { icon: Package, title: "Book the load", text: "Customer, subcontractor, route and both rates." },
  { icon: Truck, title: "Deliver", text: "Mark in transit, then delivered. Snap the POD." },
  { icon: FileText, title: "Invoice", text: "One tap from the load. Share the PDF." },
  { icon: Banknote, title: "Get paid", text: "Record the customer's payment on the invoice." },
  { icon: Receipt, title: "Pay the subcontractor", text: "Capture their bill, pay, record it." },
];

const FAQ: { q: string; a: string[] }[] = [
  {
    q: "How do I book a load?",
    a: [
      "Tap the blue + button and choose New load.",
      "Pick the customer and (if you are subbing it out) the subcontractor. If either is not in the list yet, use the “Add” link under the field.",
      "Fill in where it is collected and delivered, the pickup date, what you charge the customer and what you pay the subcontractor. Your margin is shown before you save.",
    ],
  },
  {
    q: "How do I invoice a customer?",
    a: [
      "Open the load and mark it as delivered. The Next step box now offers Create invoice.",
      "The invoice is pre-filled with the route, reference and rate. Add extra lines (waiting time, tolls) if you need to and tap Save.",
      "Tap Send to share the PDF by WhatsApp, email or any app on your phone. Sharing marks the invoice as sent.",
      "To put several loads on one invoice: New invoice → choose the customer → Add loads.",
    ],
  },
  {
    q: "My customer paid. What now?",
    a: [
      "Open the invoice and tap Record payment. The full balance is filled in; change it if they paid only part.",
      "The invoice turns green (Paid) and any subcontractor bill for that load shows up under “Ready to pay” on your Home screen.",
    ],
  },
  {
    q: "How do I pay a subcontractor?",
    a: [
      "When the subcontractor sends their invoice, open the load and tap Capture bill (or + → Subcontractor bill). Enter their invoice number and amount.",
      "The bill page tells you whether your customer has paid yet, and shows the subcontractor's banking details.",
      "Make the payment from your bank, then tap Record payment on the bill.",
    ],
  },
  {
    q: "How do I add my logo and banking details to invoices?",
    a: ["Go to Settings → Company & logo to upload your logo and address.", "Go to Settings → Banking details to add your bank account. Both appear on every invoice, quote and statement automatically."],
  },
  {
    q: "What is the difference between a bill and an expense?",
    a: [
      "A bill is an invoice from a subcontractor for carrying a load. It is linked to the load so you can see your margin, and you can pay it later.",
      "An expense is a running cost you have already paid: fuel, tolls, airtime, bank charges. Capture these under Expenses so your profit report is complete.",
    ],
  },
  {
    q: "I made a mistake on an invoice. How do I fix it?",
    a: [
      "If no payment has been recorded, open the invoice and tap Edit.",
      "If a payment has been recorded, an admin must delete the payment first (bin icon next to the payment), then edit.",
      "To cancel an invoice completely, an admin can Void it. It stays on record but no longer counts, and its loads can be invoiced again.",
    ],
  },
  {
    q: "How do quotes work?",
    a: ["Tap + → New quote, add the customer and your price, and share it like an invoice.", "When the customer accepts, open the quote and tap Convert to invoice. A draft invoice is created with the same lines."],
  },
  {
    q: "How do I send a customer a statement?",
    a: ["Open the customer and tap Statement. Choose the period, then Print (on a phone, choose “Save as PDF” or share from the print screen)."],
  },
  {
    q: "Which reports can I get?",
    a: [
      "Profit & loss: income, subcontractor costs and expenses for any period.",
      "Load profitability: margin per load and per customer.",
      "Who owes you / Who you owe: unpaid invoices and bills by age.",
      "VAT report: tax charged and tax paid, for your return.",
      "Every list can also be exported to a spreadsheet from Reports → Export your data.",
    ],
  },
  {
    q: "Can my staff use the system?",
    a: ["Yes. Go to Settings → Team → Add person and give them a temporary password.", "Staff can do daily work. Admins can also change settings, manage the team, void invoices and delete records."],
  },
  {
    q: "Can I install this on my phone like an app?",
    a: ["iPhone (Safari): tap the Share button, then “Add to Home Screen”.", "Android (Chrome): tap the ⋮ menu, then “Add to Home screen” or “Install app”.", "It then opens full screen from its own icon."],
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Help & guide" subtitle="How to run your business with Haulbook." />
      <Card className="p-4 sm:p-5">
        <h2 className="text-[15px] font-semibold text-slate-900">The whole flow in five steps</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-5">
          {FLOW.map((s, i) => (
            <li key={s.title} className="flex gap-3 sm:block">
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <s.icon className="size-5" />
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
              </span>
              <span className="block sm:mt-2">
                <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
                <span className="block text-sm text-slate-500">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <ReplayTourButton />
        </div>
      </Card>

      <h2 className="mt-6 mb-2 text-[15px] font-semibold text-slate-900">Common questions</h2>
      <Card className="divide-y divide-slate-100">
        {FAQ.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-slate-900 sm:px-5 [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <ol className="list-decimal space-y-1.5 px-4 pb-4 pl-9 text-sm text-slate-600 sm:px-5 sm:pl-10">
              {f.a.map((line) => <li key={line}>{line}</li>)}
            </ol>
          </details>
        ))}
      </Card>
      <p className="mt-4 text-sm text-slate-500">Tip: your Home screen always lists what needs doing next. If in doubt, start there.</p>
    </>
  );
}
