import * as React from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  htmlFor: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Field({ label, htmlFor, description, error, required, children, className }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label}{required ? <span className="ml-1 text-[#d82239]" aria-hidden>*</span> : null}
      </label>
      {children}
      {description ? <p id={htmlFor + "-description"} className="text-xs text-muted-foreground">{description}</p> : null}
      {error ? <p id={htmlFor + "-error"} role="alert" className="text-xs font-medium text-[#c61c32]">{error}</p> : null}
    </div>
  );
}
