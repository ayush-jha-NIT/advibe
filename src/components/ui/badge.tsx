import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex max-w-full items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-[#eef2f8] text-[#395072]",
        info: "bg-[#e6f0ff] text-[#0758d5]",
        success: "bg-[#dff8e8] text-[#078343]",
        warning: "bg-[#fff1db] text-[#a95b00]",
        danger: "bg-[#ffe3e7] text-[#c61c32]",
        purple: "bg-[#eee5ff] text-[#5920bd]",
        orange: "bg-[#fff0e2] text-[#c35400]",
      },
      shape: { soft: "rounded-md", pill: "rounded-full" },
    },
    defaultVariants: { tone: "neutral", shape: "soft" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ tone, shape, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, shape }), className)} {...props} />;
}
