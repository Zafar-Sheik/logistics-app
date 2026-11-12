import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { loginAction } from "@/actions/auth";
import { ActionForm, FormMessage, SubmitButton, TextField } from "@/components/form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  if ((await db.user.count()) === 0) redirect("/setup");
  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to manage your loads, invoices and payments.</p>
      <ActionForm action={loginAction} className="mt-5 space-y-4">
        <FormMessage />
        <TextField name="email" label="Email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" required />
        <TextField name="password" label="Password" type="password" autoComplete="current-password" required />
        <SubmitButton block size="lg">Sign in</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-xs text-slate-500">Forgot your password? Ask the account owner to reset it under Settings → Team.</p>
    </Card>
  );
}
