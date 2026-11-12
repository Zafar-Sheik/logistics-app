import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { DocumentView } from "@/lib/documents";
import { money } from "@/lib/format";

const ink = "#0f172a";
const muted = "#64748b";
const faint = "#94a3b8";
const line = "#e2e8f0";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9.5, color: ink, paddingBottom: 56 },
  bar: { height: 8 },
  body: { paddingHorizontal: 40, paddingTop: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { maxHeight: 64, maxWidth: 180, objectFit: "contain" },
  companyName: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1 },
  number: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: "#475569", marginTop: 4, textAlign: "right" },
  stamp: { marginTop: 6, alignSelf: "flex-end", borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 7, paddingTop: 3.5, paddingBottom: 1.5, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  cols: { flexDirection: "row", marginTop: 28, gap: 18 },
  col: { flex: 1 },
  label: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: faint, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  strong: { fontFamily: "Helvetica-Bold" },
  mutedText: { color: "#475569", gap: 2, marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  th: { flexDirection: "row", marginTop: 26, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 4, color: "#ffffff", fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 0.7, borderBottomColor: line },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 40, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cTax: { width: 40, textAlign: "right" },
  cAmt: { width: 84, textAlign: "right" },
  bottom: { flexDirection: "row", marginTop: 20, gap: 24, alignItems: "flex-start" },
  left: { flex: 1 },
  totals: { width: 210 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.7, borderTopColor: line, paddingTop: 6, marginBottom: 5, fontFamily: "Helvetica-Bold" },
  due: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12, color: "#ffffff" },
  bank: { backgroundColor: "#f8fafc", borderRadius: 6, padding: 12, marginBottom: 14 },
  bankRow: { flexDirection: "row", marginBottom: 2.5 },
  bankKey: { width: 78, color: muted },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTopWidth: 0.7, borderTopColor: line, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: faint },
});

function DocumentPdf({ doc }: { doc: DocumentView }) {
  const m = (v: number) => money(v, doc.currency, { plainSymbol: true });
  const c = doc.company;
  const accent = doc.accent;
  const stamp = doc.rawStatus === "PAID" ? "PAID" : doc.rawStatus === "VOID" ? "VOID" : doc.rawStatus === "DRAFT" ? "DRAFT" : null;
  const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  const bankRows: [string, string | null][] = c.bank
    ? [
        ["Bank", c.bank.bankName],
        ["Account name", c.bank.accountName],
        ["Account no.", c.bank.accountNumber],
        ["Branch code", c.bank.branchCode],
        ["Account type", c.bank.accountType],
        ["SWIFT", c.bank.swift],
        ["Reference", doc.number],
      ]
    : [];

  return (
    <Document title={`${doc.title} ${doc.number}`} author={c.name} creator="Haulbook">
      <Page size="A4" style={s.page}>
        <View style={[s.bar, { backgroundColor: accent }]} fixed />
        <View style={s.body}>
          <View style={s.header}>
            <View style={{ maxWidth: 260 }}>
              {c.logo ? <Image src={c.logo} style={s.logo} /> : <Text style={s.companyName}>{c.tradingName || c.name}</Text>}
            </View>
            <View>
              <Text style={[s.title, { color: accent }]}>{doc.title}</Text>
              <Text style={s.number}>{doc.number}</Text>
              {stamp && <Text style={[s.stamp, stamp === "PAID" ? { color: "#059669", borderColor: "#059669" } : { color: muted, borderColor: faint }]}>{stamp}</Text>}
            </View>
          </View>

          <View style={s.cols}>
            <View style={s.col}>
              <Text style={s.label}>From</Text>
              <Text style={s.strong}>{c.name}</Text>
              <View style={s.mutedText}>
                {c.address.map((l) => <Text key={l}>{l}</Text>)}
                {c.phone && <Text>{c.phone}</Text>}
                {c.email && <Text>{c.email}</Text>}
                {c.regNumber && <Text>Reg no: {c.regNumber}</Text>}
                {c.vatNumber && <Text>{doc.taxLabel} no: {c.vatNumber}</Text>}
              </View>
            </View>
            <View style={s.col}>
              <Text style={s.label}>{doc.isInvoice ? "Bill to" : "Prepared for"}</Text>
              <Text style={s.strong}>{doc.customer.name}</Text>
              <View style={s.mutedText}>
                {doc.customer.contactPerson && <Text>Attn: {doc.customer.contactPerson}</Text>}
                {doc.customer.address && <Text>{doc.customer.address}</Text>}
                {doc.customer.vatNumber && <Text>{doc.taxLabel} no: {doc.customer.vatNumber}</Text>}
              </View>
            </View>
            <View style={{ width: 150 }}>
              <View style={s.metaRow}><Text style={{ color: muted }}>Date</Text><Text style={s.strong}>{doc.issueDate}</Text></View>
              <View style={s.metaRow}><Text style={{ color: muted }}>{doc.isInvoice ? "Due date" : "Valid until"}</Text><Text style={s.strong}>{doc.dueDate}</Text></View>
              {doc.reference && <View style={s.metaRow}><Text style={{ color: muted }}>Reference</Text><Text style={[s.strong, { maxWidth: 95, textAlign: "right" }]}>{doc.reference}</Text></View>}
            </View>
          </View>

          <View style={[s.th, { backgroundColor: accent }]} fixed>
            <Text style={s.cDesc}>Description</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cPrice}>Unit price</Text>
            {doc.showTax && <Text style={s.cTax}>{doc.taxLabel}</Text>}
            <Text style={s.cAmt}>Amount</Text>
          </View>
          {doc.lines.map((l) => (
            <View key={l.id} style={s.tr} wrap={false}>
              <Text style={s.cDesc}>{l.description}</Text>
              <Text style={[s.cQty, { color: "#475569" }]}>{qty(l.quantity)}</Text>
              <Text style={[s.cPrice, { color: "#475569" }]}>{m(l.unitPrice)}</Text>
              {doc.showTax && <Text style={[s.cTax, { color: "#475569" }]}>{l.taxRate}%</Text>}
              <Text style={[s.cAmt, s.strong]}>{m(l.amount)}</Text>
            </View>
          ))}

          <View style={s.bottom} wrap={false}>
            <View style={s.left}>
              {doc.isInvoice && c.bank && (
                <View style={s.bank}>
                  <Text style={s.label}>Banking details</Text>
                  {bankRows.filter(([, v]) => v).map(([k, v]) => (
                    <View key={k} style={s.bankRow}>
                      <Text style={s.bankKey}>{k}</Text>
                      <Text style={s.strong}>{v}</Text>
                    </View>
                  ))}
                </View>
              )}
              {doc.notes && (
                <View>
                  <Text style={s.label}>{doc.isInvoice ? "Notes & terms" : "Terms"}</Text>
                  <Text style={s.mutedText}>{doc.notes}</Text>
                </View>
              )}
            </View>
            <View style={s.totals}>
              <View style={s.totalRow}><Text style={{ color: muted }}>Subtotal</Text><Text>{m(doc.subtotal)}</Text></View>
              {doc.showTax && (
                <View style={s.totalRow}>
                  <Text style={{ color: muted }}>{doc.taxLabel}{doc.taxBreakdown.length === 1 ? ` (${doc.taxBreakdown[0].rate}%)` : ""}</Text>
                  <Text>{m(doc.taxTotal)}</Text>
                </View>
              )}
              <View style={s.grand}><Text>Total</Text><Text>{m(doc.total)}</Text></View>
              {doc.isInvoice && doc.amountPaid > 0 && <View style={s.totalRow}><Text style={{ color: muted }}>Paid</Text><Text>- {m(doc.amountPaid)}</Text></View>}
              <View style={[s.due, { backgroundColor: accent }]}>
                <Text style={[s.strong, { fontSize: 10 }]}>{doc.isInvoice ? "Balance due" : "Quote total"}</Text>
                <Text style={[s.strong, { fontSize: 13 }]}>{m(doc.isInvoice ? doc.balance : doc.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Thank you for your business{c.website ? `  ·  ${c.website}` : ""}</Text>
          <Text render={({ pageNumber, totalPages }) => `${doc.number}  ·  Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderDocumentPdf(doc: DocumentView) {
  return renderToBuffer(<DocumentPdf doc={doc} />);
}
