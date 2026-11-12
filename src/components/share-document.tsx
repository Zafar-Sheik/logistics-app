"use client";

import { useState, useTransition } from "react";
import { Download, Loader2, Mail, MessageCircle, Printer, Send, Share2 } from "lucide-react";
import { markDocumentSent } from "@/actions/documents";
import { Sheet } from "./sheet";
import { btn } from "./ui";

type Props = {
  id: string;
  number: string;
  title: string;
  isDraft: boolean;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  companyName: string;
  message: string;
};

/** Share / download / print actions for an invoice or quote. */
export function ShareDocument(p: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const pdfUrl = `/api/documents/${p.id}/pdf`;
  const subject = `${p.title} ${p.number} from ${p.companyName}`;
  const markSent = () => p.isDraft && start(async () => { await markDocumentSent(p.id); });
  const wa = p.customerPhone?.replace(/[^\d]/g, "");

  async function sharePdf() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error();
      const file = new File([await res.blob()], `${p.number}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: subject, text: p.message });
        markSent();
        setOpen(false);
      } else {
        // Desktop browsers: fall back to a normal download.
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError("Could not prepare the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const item = "flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3.5 text-left hover:bg-slate-50 active:bg-slate-100";
  const iconBox = "flex size-10 shrink-0 items-center justify-center rounded-xl";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn({ variant: p.isDraft ? "primary" : "secondary" })}>
        <Send className="size-4" /> {p.isDraft ? "Send" : "Share"}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Send ${p.number}`}>
        <div className="space-y-2.5">
          <button type="button" onClick={sharePdf} disabled={busy} className={item}>
            <span className={`${iconBox} bg-brand-50 text-brand-700`}>{busy ? <Loader2 className="size-5 animate-spin" /> : <Share2 className="size-5" />}</span>
            <span><span className="block text-sm font-semibold text-slate-900">Share the PDF</span><span className="block text-xs text-slate-500">WhatsApp, email or any app on your phone</span></span>
          </button>
          <a href={`https://wa.me/${wa ?? ""}?text=${encodeURIComponent(p.message)}`} target="_blank" rel="noreferrer" onClick={markSent} className={item}>
            <span className={`${iconBox} bg-emerald-50 text-emerald-700`}><MessageCircle className="size-5" /></span>
            <span><span className="block text-sm font-semibold text-slate-900">WhatsApp message</span><span className="block text-xs text-slate-500">Send a summary{wa ? ` to ${p.customerName}` : ""}</span></span>
          </a>
          <a href={`mailto:${p.customerEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(p.message)}`} onClick={markSent} className={item}>
            <span className={`${iconBox} bg-sky-50 text-sky-700`}><Mail className="size-5" /></span>
            <span><span className="block text-sm font-semibold text-slate-900">Email</span><span className="block text-xs text-slate-500">{p.customerEmail ?? "Opens your email app. Attach the downloaded PDF."}</span></span>
          </a>
          <a href={`${pdfUrl}?download`} className={item}>
            <span className={`${iconBox} bg-slate-100 text-slate-700`}><Download className="size-5" /></span>
            <span><span className="block text-sm font-semibold text-slate-900">Download PDF</span><span className="block text-xs text-slate-500">Save it to this device</span></span>
          </a>
          <button type="button" onClick={() => { setOpen(false); setTimeout(() => window.print(), 150); }} className={item}>
            <span className={`${iconBox} bg-slate-100 text-slate-700`}><Printer className="size-5" /></span>
            <span><span className="block text-sm font-semibold text-slate-900">Print</span><span className="block text-xs text-slate-500">Send to a printer</span></span>
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {p.isDraft && <p className="mt-4 text-center text-xs text-slate-500">Sharing marks this draft as sent.</p>}
      </Sheet>
    </>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={btn({ variant: "secondary" })}>
      <Printer className="size-4" /> Print
    </button>
  );
}
