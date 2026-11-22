import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-(--radius) text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-[var(--accent)] text-white shadow-(--shadow-sm) hover:bg-[var(--accent-hover)]",
        secondary:
          "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
        ghost: "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
        soft: "bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-95",
        destructive: "bg-[var(--danger)] text-white hover:opacity-90",
        "ghost-destructive": "text-[var(--danger)] hover:bg-[var(--danger-soft)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-5 text-[15px]",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type, ...props }, ref) => (
    <button
      ref={ref}
      // stop implicit form submissions unless explicitly a submit
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
