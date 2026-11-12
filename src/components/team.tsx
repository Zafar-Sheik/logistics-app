"use client";

import { KeyRound, UserPlus } from "lucide-react";
import { createUser, resetUserPassword } from "@/actions/settings";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextField } from "./form";
import { SheetButton } from "./sheet";

export function AddUserButton() {
  return (
    <SheetButton label="Add person" title="Add a team member" variant="primary" icon={<UserPlus className="size-4" />}>
      <ActionForm action={createUser} className="space-y-4">
        <FormMessage />
        <TextField name="name" label="Name" autoComplete="off" />
        <TextField name="email" label="Email" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" />
        <SelectField
          name="role"
          label="Role"
          defaultValue="STAFF"
          options={[{ value: "STAFF", label: "Staff: day-to-day work" }, { value: "ADMIN", label: "Admin: also settings, deleting and voiding" }]}
        />
        <TextField name="password" label="Temporary password" type="text" autoComplete="off" hint="At least 8 characters. Share it with them; they can change it under My account." />
        <SubmitButton block size="lg">Add team member</SubmitButton>
      </ActionForm>
    </SheetButton>
  );
}

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  return (
    <SheetButton label="Reset password" title={`New password for ${name}`} size="sm" variant="ghost" icon={<KeyRound className="size-4" />}>
      <ActionForm action={resetUserPassword.bind(null, userId)} className="space-y-4">
        <FormMessage />
        <TextField name="password" label="New password" type="text" autoComplete="off" hint="At least 8 characters." />
        <SubmitButton block size="lg">Set new password</SubmitButton>
      </ActionForm>
    </SheetButton>
  );
}
