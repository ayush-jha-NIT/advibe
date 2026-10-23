"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type Tab = { value: string; label: string };

type TabsProps = {
  tabs: readonly Tab[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
};

export function Tabs({ tabs, value, onValueChange, label, className }: TabsProps) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const select = (i: number) => {
    const tab = tabs[i];
    if (tab) {
      onValueChange(tab.value);
      refs.current[i]?.focus();
    }
  };

  return (
    <div role="tablist" aria-label={label} className={cn("flex max-w-full gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((tab, index) => (
        <button
          key={tab.value}
          ref={(element) => { refs.current[index] = element; }}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          tabIndex={value === tab.value ? 0 : -1}
          onClick={() => onValueChange(tab.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") { event.preventDefault(); select((index + 1) % tabs.length); }
            if (event.key === "ArrowLeft") { event.preventDefault(); select((index - 1 + tabs.length) % tabs.length); }
            if (event.key === "Home") { event.preventDefault(); select(0); }
            if (event.key === "End") { event.preventDefault(); select(tabs.length - 1); }
          }}
          className={cn(
            "min-h-11 shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
            value === tab.value ? "border-[var(--portal-accent)] text-[var(--portal-accent)]" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
