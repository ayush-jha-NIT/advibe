"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  "aria-label": string;
  className?: string;
};

export function Switch({ checked, onCheckedChange, disabled, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-150",
        checked ? "bg-[var(--portal-accent)]" : "bg-[#bac7df]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className={cn("pointer-events-none size-5 rounded-full bg-white shadow-sm transition-transform duration-150", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}
