"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { setTutorialDone } from "@/actions/auth";
import { btn } from "./ui";

export function ReplayTourButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className={btn()} onClick={() => start(async () => { await setTutorialDone(false); router.push("/"); })}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
      Replay the welcome tour
    </button>
  );
}
