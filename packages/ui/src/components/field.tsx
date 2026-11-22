import type { ReactNode } from "react";
import { cn } from "../cn";
import { Label } from "./input";

/** Labeled form field row — the standard editor form unit. */
export function Field({
  label,
  children,
  className,
  hint,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}
