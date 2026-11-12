import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDocumentView } from "@/lib/documents";
import { renderDocumentPdf } from "@/lib/pdf/document-pdf";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const doc = await getDocumentView((await params).id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pdf = await renderDocumentPdf(doc);
  const download = new URL(request.url).searchParams.has("download");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${doc.number.replace(/[^\w.\-]/g, "_")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
