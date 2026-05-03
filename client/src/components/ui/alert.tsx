import type { ReactNode } from "react";

type Variant = "default" | "destructive";

interface AlertProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

export function Alert({ children, variant = "default", className }: AlertProps) {
  const baseStyle = "flex items-start gap-2 p-4 rounded-lg border";

  const variantStyle =
    variant === "destructive"
      ? "bg-red-50 border-red-400 text-red-700"
      : "bg-gray-50 border-gray-300 text-gray-800";

  return (
    <div className={`${baseStyle} ${variantStyle} ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function AlertTitle({ children }: { children: ReactNode }) {
  return <h4 className="font-semibold">{children}</h4>;
}

export function AlertDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm opacity-90">{children}</p>;
}