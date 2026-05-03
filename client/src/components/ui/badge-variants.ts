// src/components/ui/badge-variants.ts   ← new file for the cva definition
import { cva, type VariantProps } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white hover:bg-slate-900/90",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-200/80",
        destructive: "bg-red-600 text-white hover:bg-red-600/90",
        outline:
          "border border-slate-300 text-slate-700 bg-transparent hover:bg-slate-100",
        success: "bg-emerald-600 text-white hover:bg-emerald-600/90",
        warning: "bg-amber-500 text-white hover:bg-amber-500/90",
        info: "bg-blue-600 text-white hover:bg-blue-600/90",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2.5 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
        icon: "h-6 w-6 p-0",
      },
      animate: {
        pulse: "animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type BadgeVariants = VariantProps<typeof badgeVariants>