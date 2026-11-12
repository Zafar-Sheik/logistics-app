import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><SearchX className="size-7" /></span>
      <h1 className="mt-4 text-lg font-bold text-slate-900">We could not find that</h1>
      <p className="mt-1 text-sm text-slate-500">It may have been deleted, or the link is wrong.</p>
      <LinkButton href="/" className="mt-5">Back to Home</LinkButton>
    </div>
  );
}
