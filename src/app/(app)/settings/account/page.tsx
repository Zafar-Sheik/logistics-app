import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { changePasswordAction, logoutAction, updateProfileAction } from "@/actions/auth";
import { ActionForm, FormMessage, FormSection, SubmitButton, TextField } from "@/components/form";
import { Button, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="My account" subtitle={user.email} back={{ href: "/settings", label: "Settings" }} />
      <div className="space-y-4">
        <ActionForm action={updateProfileAction} className="space-y-3">
          <FormSection title="Profile">
            <TextField name="name" label="Your name" defaultValue={user.name} wrapClass="sm:col-span-2" />
            <div className="space-y-3 sm:col-span-2"><FormMessage /><SubmitButton variant="secondary">Save name</SubmitButton></div>
          </FormSection>
        </ActionForm>
        <ActionForm action={changePasswordAction} className="space-y-3">
          <FormSection title="Change password">
            <TextField name="current" label="Current password" type="password" autoComplete="current-password" />
            <TextField name="next" label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." />
            <div className="space-y-3 sm:col-span-2"><FormMessage /><SubmitButton variant="secondary">Update password</SubmitButton></div>
          </FormSection>
        </ActionForm>
        <form action={logoutAction}>
          <Button variant="dangerGhost"><LogOut className="size-4" /> Sign out</Button>
        </form>
      </div>
    </>
  );
}
