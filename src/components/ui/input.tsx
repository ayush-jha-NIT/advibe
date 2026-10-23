import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", invalid = false, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-11 w-full min-w-0 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-foreground shadow-xs placeholder:text-[#7c90b2] hover:border-[#adc5ea] focus-visible:border-brand-blue focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[#f4f7fb] disabled:opacity-65 aria-invalid:border-[#e92c41]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
