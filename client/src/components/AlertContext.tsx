// src/context/AlertContext.tsx
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type AlertType = "success" | "error" | "info";

interface AlertContextType {
  showAlert: (title: string, description: string, type?: AlertType) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alert, setAlert] = useState<{
    title: string;
    description: string;
    type: AlertType;
  } | null>(null);

  const showAlert = (
    title: string,
    description: string,
    type: AlertType = "info"
  ) => {
    setAlert({ title, description, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const getIcon = () => {
    if (!alert) return null;

    switch (alert.type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      {alert && (
        <div className="fixed top-4 right-4 z-50">
          <Alert
            variant={alert.type === "error" ? "destructive" : "default"}
            className="max-w-sm shadow-lg flex items-start gap-2"
          >
            {getIcon()}
            <div>
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.description}</AlertDescription>
            </div>
          </Alert>
        </div>
      )}
    </AlertContext.Provider>
  );
};