import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-navy-100 text-navy-800",
        open: "bg-green-100 text-green-800",
        closed: "bg-slate-100 text-slate-600",
        available: "bg-green-100 text-green-800",
        filling: "bg-amber-100 text-amber-800",
        full: "bg-red-100 text-red-700",
        active: "bg-saffron-100 text-saffron-800",
        inactive: "bg-slate-100 text-slate-500",
        entry: "bg-green-100 text-green-800",
        exit: "bg-red-100 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
