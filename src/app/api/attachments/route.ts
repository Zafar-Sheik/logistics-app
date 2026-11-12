import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { ATTACHMENT_LABELS } from "@/lib/domain";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await getUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const fd = await request.formData().catch(() => null);
  const file = fd?.get("file");
  const loadId = String(fd?.get("loadId") ?? "");
  const label = String(fd?.get("label") ?? "");
  if (!(file instanceof File) || !loadId) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Only photos (JPG, PNG, WebP) and PDF files can be attached." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is too large. The limit is 4 MB." }, { status: 400 });
  if (!(await db.load.findUnique({ where: { id: loadId }, select: { id: true } }))) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  const finalLabel = ATTACHMENT_LABELS.includes(label) ? label : "Other";
  await db.$transaction(async (tx) => {
    await tx.attachment.create({
      data: { loadId, label: finalLabel, name: file.name.slice(0, 180) || "file", mimeType: file.type, size: file.size, data: new Uint8Array(await file.arrayBuffer()) },
    });
    // Uploading a POD ticks the "POD received" box automatically.
    if (finalLabel === "Proof of delivery") await tx.load.update({ where: { id: loadId }, data: { podReceived: true } });
  });
  revalidatePath(`/loads/${loadId}`);
  return NextResponse.json({ ok: true });
}
