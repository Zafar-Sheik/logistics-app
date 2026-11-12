import type { Metadata } from "next";
import { ExpenseFormPage } from "../form-page";

export const metadata: Metadata = { title: "New expense" };

export default function Page() {
  return <ExpenseFormPage />;
}
