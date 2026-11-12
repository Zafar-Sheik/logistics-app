import type { Metadata } from "next";
import { AgingReport } from "@/components/aging-report";

export const metadata: Metadata = { title: "Who you owe" };

export default function Page() {
  return <AgingReport side="payables" />;
}
