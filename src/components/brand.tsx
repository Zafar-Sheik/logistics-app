import { Truck } from "lucide-react";
import { cx } from "@/lib/format";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white", className)}>
      <Truck className="size-5" />
    </span>
  );
}
