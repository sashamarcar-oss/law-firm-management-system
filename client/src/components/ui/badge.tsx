// src/components/ui/badge.tsx          ← only the component
import * as React from "react"
import { cn } from "@/lib/utils"
import { badgeVariants } from "@/components/ui/badge-variants"   // ← new import

import type { VariantProps } from "class-variance-authority"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  asChild?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      animate,
      icon,
      children,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? "span" : "div"

    return (
      <Comp
        ref={ref}
        className={cn(badgeVariants({ variant, size, animate, className }))}
        role="status"
        aria-live="polite"
        {...props}
      >
        {icon && <span className="flex shrink-0 items-center">{icon}</span>}
        {children}
      </Comp>
    )
  }
)

Badge.displayName = "Badge"

export { Badge }