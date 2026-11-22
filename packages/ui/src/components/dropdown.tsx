"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../cn";

const MenuCloseContext = createContext<() => void>(() => {});

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  width?: number;
}

/** Minimal dropdown menu: portal, outside-click + esc close, flip-aware. */
export function Dropdown({ trigger, children, align = "end", width = 200 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = align === "end" ? rect.right - width : rect.left;
    const estimatedH = menuRef.current?.offsetHeight ?? 180;
    const top =
      rect.bottom + 6 + estimatedH > window.innerHeight
        ? Math.max(8, rect.top - estimatedH - 6)
        : rect.bottom + 6;
    setPos({ top, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) });
  }, [open, align, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <span ref={triggerRef} className="inline-flex">
      <span onClick={() => setOpen((v) => !v)}>{trigger}</span>
      {open && typeof document !== "undefined"
        ? createPortal(
            <MenuCloseContext.Provider value={close}>
              <div
                ref={menuRef}
                role="menu"
                style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
                className="fixed z-50 overflow-hidden rounded-(--radius) border border-[var(--line)] bg-[var(--surface)] py-1 shadow-(--shadow-md)"
              >
                {children}
              </div>
            </MenuCloseContext.Provider>,
            document.body,
          )
        : null}
    </span>
  );
}

export function MenuItem({
  onSelect,
  children,
  danger,
  disabled,
  icon,
}: {
  onSelect?: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const close = useContext(MenuCloseContext);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        close();
        onSelect?.();
      }}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] outline-none transition-colors disabled:opacity-40",
        danger
          ? "text-[var(--danger)] hover:bg-[var(--danger-soft)]"
          : "text-[var(--ink)] hover:bg-[var(--surface-2)]",
      )}
    >
      {icon ? <span className="text-[var(--muted)] [&_svg]:size-3.5">{icon}</span> : null}
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
      {children}
    </div>
  );
}

export function MenuSeparator() {
  return <div className="my-1 border-t border-[var(--line)]" />;
}
