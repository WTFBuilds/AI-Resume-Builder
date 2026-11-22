import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-(--radius-lg) border border-[var(--line)] bg-[var(--surface)] shadow-(--shadow-sm)",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "neutral" | "accent" | "warning" | "danger" }) {
  const palette = {
    neutral: "bg-[var(--surface-2)] text-[var(--ink-2)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  }[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        palette,
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-(--radius-lg) border border-dashed border-[var(--line-strong)] px-6 py-16 text-center",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-[var(--ink-2)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
