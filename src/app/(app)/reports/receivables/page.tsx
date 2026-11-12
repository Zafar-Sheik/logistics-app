import type { Metadata } from "next";
import { AgingReport } from "@/components/aging-report";

export const metadata: Metadata = { title: "Who owes you" };

export default function Page() {
  return <AgingReport side="receivables" />;
}
