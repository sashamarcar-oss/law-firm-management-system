"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

type LogoutStatus = "loading" | "success" | "error";

export default function LogoutScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [status, setStatus] = useState<LogoutStatus>("loading");

  useEffect(() => {
    let isActive = true;

    const logoutUser = async () => {
      try {
        await logout();
        localStorage.removeItem("user");

        if (!isActive) return;

        setStatus("success");
        window.setTimeout(() => {
          navigate("/login", { replace: true });
        }, 800);
      } catch (error) {
        console.error("Logout error:", error);
        if (isActive) {
          setStatus("error");
        }
      }
    };

    void logoutUser();

    return () => {
      isActive = false;
    };
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-black px-6 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
          {status === "loading" ? (
            <>
              <LoaderCircle className="mx-auto mb-4 h-10 w-10 animate-spin text-amber-300" />
              <h1 className="text-2xl font-semibold">Signing you out</h1>
              <p className="mt-2 text-sm text-white/65">
                Closing your session securely. This takes a moment.
              </p>
            </>
          ) : null}

          {status === "success" ? (
            <>
              <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-300" />
              <h1 className="text-2xl font-semibold">Signed out</h1>
              <p className="mt-2 text-sm text-white/65">
                Redirecting you to the login page.
              </p>
            </>
          ) : null}

          {status === "error" ? (
            <>
              <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-rose-300" />
              <h1 className="text-2xl font-semibold">Logout failed</h1>
              <p className="mt-2 text-sm text-white/65">
                We could not finish signing you out cleanly.
              </p>
              <button
                onClick={() => navigate("/", { replace: true })}
                className="mt-6 w-full rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                Return Home
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
