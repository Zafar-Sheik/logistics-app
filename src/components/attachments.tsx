"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, FileText, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { deleteAttachment } from "@/actions/loads";
import { ATTACHMENT_LABELS } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { inputClass } from "./form";
import { btn } from "./ui";

const MAX_BYTES = 4 * 1024 * 1024;

/** Shrinks phone photos so uploads are quick on mobile data. */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export type AttachmentItem = { id: string; name: string; label: string; mimeType: string; size: number; createdAt: string };

export function Attachments({ loadId, items }: { loadId: string; items: AttachmentItem[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState(ATTACHMENT_LABELS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const ready = await compressImage(file);
      if (ready.size > MAX_BYTES) throw new Error("That file is too large. The limit is 4 MB.");
      const fd = new FormData();
      fd.set("loadId", loadId);
      fd.set("label", label);
      fd.set("file", ready);
      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Upload failed. Please try again.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
      {items.length > 0 && (
        <ul className="mb-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                {a.mimeType.startsWith("image/") ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
              </span>
              <a href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-brand-700">{a.label}</span>
                <span className="block truncate text-xs text-slate-500">{a.name} · {Math.max(1, Math.round(a.size / 1024))} KB · {fmtDate(a.createdAt)}</span>
              </a>
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => {
                  if (confirm(`Remove ${a.name}?`)) start(async () => { await deleteAttachment(a.id); router.refresh(); });
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <select aria-label="Document type" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass + " min-w-0 flex-1"}>
          {ATTACHMENT_LABELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={btn({ variant: "secondary" })}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {busy ? "Uploading…" : "Add photo / file"}
        </button>
        <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">Take a photo of the signed POD or attach a PDF (up to 4 MB).</p>
    </div>
  );
}
