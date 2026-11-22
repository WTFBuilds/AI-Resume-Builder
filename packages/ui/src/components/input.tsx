import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../cn";

const fieldBase =
  "w-full rounded-(--radius) border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] shadow-(--shadow-sm) outline-none transition-colors placeholder:text-[var(--muted)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-9", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, "min-h-24 py-2 leading-relaxed resize-y", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(fieldBase, "h-9 appearance-none bg-no-repeat pr-8", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.5rem center",
        backgroundSize: "1rem",
      }}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]",
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = "Label";
