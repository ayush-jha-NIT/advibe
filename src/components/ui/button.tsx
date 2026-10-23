import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold tracking-tight transition-[background-color,border-color,box-shadow,transform] duration-150 select-none disabled:pointer-events-none disabled:opacity-50 active:enabled:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-[var(--portal-accent)] text-white hover:bg-[var(--portal-accent-hover)]",
        brand: "bg-brand-orange text-white hover:bg-[#e95d00]",
        secondary: "bg-surface-alt text-brand-navy hover:bg-[#e0ecff]",
        outline: "border border-[#b9cdf1] bg-white text-brand-blue hover:bg-[#f0f6ff]",
        ghost: "bg-transparent text-foreground hover:bg-surface-alt",
        destructive: "bg-[#e92c41] text-white hover:bg-[#c91d31]",
        link: "min-h-0 rounded-none bg-transparent px-0 text-brand-blue underline-offset-4 hover:underline",
      },
      size: {
        sm: "min-h-9 rounded-lg px-3 text-xs",
        md: "min-h-11 px-5",
        lg: "min-h-12 px-6 text-base",
        icon: "size-11 min-h-11 px-0",
        "icon-sm": "size-9 min-h-9 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
