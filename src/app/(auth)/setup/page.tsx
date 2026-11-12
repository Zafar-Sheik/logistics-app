import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await db.user.count()) > 0) redirect("/login");
  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold text-slate-900">Let&apos;s set up your business</h1>
      <p className="mt-1 text-sm text-slate-500">Two quick steps and you&apos;re ready to book your first load.</p>
      <SetupForm />
    </Card>
  );
}
