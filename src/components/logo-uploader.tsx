"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { saveLogo } from "@/actions/settings";
import { btn } from "./ui";

/** Resizes the chosen image in the browser, so logos stay small and load fast. */
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 640 / bitmap.width, 320 / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const png = canvas.toDataURL("image/png");
  if (png.length < 600_000) return png;
  // Large photos: flatten onto white and use JPEG instead.
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function LogoUploader({ logo }: { logo: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (value: string | null) =>
    start(async () => {
      const res = await saveLogo(value);
      setError(res?.error ?? null);
    });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2">
        {logo ? <img src={logo} alt="Company logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">No logo yet</span>}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => input.current?.click()} className={btn({ variant: "secondary" })}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {logo ? "Change logo" : "Upload logo"}
          </button>
          {logo && (
            <button type="button" disabled={pending} onClick={() => save(null)} className={btn({ variant: "dangerGhost" })}>
              <Trash2 className="size-4" /> Remove
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">PNG or JPG. Appears on invoices, quotes and statements.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            save(await toDataUrl(file));
          } catch {
            setError("That image could not be read. Please try a PNG or JPG file.");
          }
        }}
      />
    </div>
  );
}
