"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function RoleRedirect() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return; // wait for auth

    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    const role = currentUser.role.toLowerCase();

    switch (role) {
      case "admin":
        navigate("/admin/dashboard", { replace: true });
        break;
      case "lawyer":
        navigate("/lawyer/dashboard", { replace: true });
        break;
      case "client":
        navigate("/client/dashboard", { replace: true });
        break;
      default:
        navigate("/login", { replace: true });
    }
  }, [currentUser, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-pulse text-lg text-gray-600">
        Loading your dashboard...
      </div>
    </div>
  );
}