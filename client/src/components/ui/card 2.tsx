import React from "react";

export const Card = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="border rounded-lg shadow-sm bg-white">
      {children}
    </div>
  );
};

export const CardHeader = ({ children }: { children: React.ReactNode }) => {
  return <div className="p-4 border-b font-semibold">{children}</div>;
};

export const CardTitle = ({ children }: { children: React.ReactNode }) => {
  return <h2 className="text-lg">{children}</h2>;
};

export const CardContent = ({ children }: { children: React.ReactNode }) => {
  return <div className="p-4">{children}</div>;
};