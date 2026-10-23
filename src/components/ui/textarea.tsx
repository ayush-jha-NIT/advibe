import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-28 w-full resize-y rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm leading-6 text-foreground placeholder:text-[#7c90b2] hover:border-[#adc5ea] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-[#e92c41]",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
