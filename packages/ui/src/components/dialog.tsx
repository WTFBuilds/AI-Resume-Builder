"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../cn";
import { Button } from "./button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/** Minimal accessible dialog: portal, overlay, esc, initial focus, scroll lock. */
export function Dialog({ open, onClose, title, description, children, footer, width }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus], input, button, textarea")?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open, onKey]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-(--radius-lg) border border-[var(--line)] bg-[var(--surface)] shadow-(--shadow-lg)",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)]">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-[var(--ink-2)]">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </div>
        {children ? <div className="px-5 py-4">{children}</div> : null}
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
