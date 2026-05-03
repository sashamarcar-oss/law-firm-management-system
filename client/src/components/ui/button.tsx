import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "secondary"
    | "link";           // ← added here
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      loading = false,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        disabled={loading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          "disabled:opacity-60 disabled:pointer-events-none",

          // Variants
          variant === "default" &&
            "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",

          variant === "outline" &&
            "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100",

          variant === "ghost" &&
            "text-gray-900 hover:bg-gray-100 active:bg-gray-200",

          variant === "secondary" &&
            "bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400",

          variant === "destructive" &&
            "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",

          // Added link variant
          variant === "link" &&
            "text-blue-600 hover:text-blue-800 hover:underline underline-offset-4 p-0 h-auto",

          // Sizes
          size === "sm" && "px-3 py-1.5 text-sm",
          size === "md" && "px-4 py-2 text-sm",
          size === "lg" && "px-6 py-3 text-base",
          size === "icon" && "h-10 w-10 p-0",

          // Loading state
          loading && "opacity-70 cursor-wait",

          className
        )}
        {...props}
      >
        {loading && (
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        )}

        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export default Button;