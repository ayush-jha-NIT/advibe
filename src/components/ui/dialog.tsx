"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type DialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
    return () => { if (node.open) node.close(); };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={() => onOpenChange(false)}
      onCancel={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg max-h-[min(90dvh,800px)] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-foreground shadow-2xl backdrop:bg-[#041b3d]/65",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-bold tracking-tight">{title}</h2>
          {description ? <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close dialog" onClick={() => onOpenChange(false)}>
          <X className="size-5" aria-hidden />
        </Button>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div> : null}
    </dialog>
  );
}
