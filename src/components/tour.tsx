"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Banknote, CheckCircle2, FileText, LayoutDashboard, Package, Plus, Truck } from "lucide-react";
import { setTutorialDone } from "@/actions/auth";
import { cx } from "@/lib/format";
import { btn } from "./ui";

const STEPS = [
  {
    icon: Truck,
    tone: "bg-brand-600 text-white",
    title: "Welcome to Haulbook",
    text: "Everything you need to run your logistics business from your phone: book loads, sub them out, invoice your customer, get paid and pay your subcontractor. Here is the whole flow in under a minute.",
  },
  {
    icon: Package,
    tone: "bg-brand-50 text-brand-700",
    title: "1. Book a load",
    text: "A load is one job. Pick the customer, the subcontractor carrying it, the route, what you charge and what you pay. Haulbook shows your margin straight away.",
  },
  {
    icon: FileText,
    tone: "bg-emerald-50 text-emerald-700",
    title: "2. Invoice your customer",
    text: "When the load is delivered, tap “Create invoice”. Everything is filled in for you. Share the PDF by WhatsApp or email, with your logo and banking details on it.",
  },
  {
    icon: Banknote,
    tone: "bg-amber-50 text-amber-700",
    title: "3. Get paid, then pay",
    text: "Record the customer’s payment on the invoice. Capture the subcontractor’s bill on the load, and Haulbook tells you the moment it is safe to pay them: after your customer has paid you.",
  },
  {
    icon: LayoutDashboard,
    tone: "bg-violet-50 text-violet-700",
    title: "Home tells you what to do next",
    text: "Your Home screen lists what needs attention: loads to invoice, overdue invoices, subcontractors ready to be paid. Tap any item to act on it.",
  },
  {
    icon: Plus,
    tone: "bg-brand-600 text-white",
    title: "The + button creates anything",
    text: "Tap the blue + button at any time to add a load, invoice, quote, bill or expense. You can replay this tour from Help & guide in the menu.",
  },
];

export function Tour() {
  const [step, setStep] = useState(0);
  const [closed, setClosed] = useState(false);
  const [, start] = useTransition();
  if (closed) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const finish = () => {
    setClosed(true);
    start(() => setTutorialDone(true));
  };

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <div className="w-full animate-sheet rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl sm:pb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={cx("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-brand-600" : "w-1.5 bg-slate-200")} />
            ))}
          </div>
          {!last && (
            <button onClick={finish} className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100">
              Skip
            </button>
          )}
        </div>
        <div key={step} className="animate-fade">
          <div className={cx("mt-6 flex size-16 items-center justify-center rounded-2xl", s.tone)}>
            <s.icon className="size-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900">{s.title}</h2>
          <p className="mt-2 min-h-24 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
        </div>
        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className={btn({ variant: "secondary", size: "lg" })}>
              Back
            </button>
          )}
          <button onClick={() => (last ? finish() : setStep(step + 1))} className={btn({ size: "lg" }, "flex-1")}>
            {last ? (
              <>
                <CheckCircle2 className="size-5" /> Get started
              </>
            ) : (
              <>
                Next <ArrowRight className="size-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
