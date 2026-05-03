import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef } from "react";
import gsap from "gsap";

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectIfLoggedIn?: boolean;
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  redirectIfLoggedIn,
}: Props) => {
  const { currentUser, role, loading } = useAuth();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────
  // 🎬 GSAP Animation (only page content)
  // ─────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out" }
      );
    });

    return () => ctx.revert(); // cleanup
  }, [location.pathname]);

  // ─────────────────────────────
  // ⏳ Loading State
  // ─────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse text-lg text-gray-600">
          Loading your session...
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // ❌ Not logged in
  // ─────────────────────────────
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // ─────────────────────────────
  // 🧠 Normalize role
  // ─────────────────────────────
  const normalizedRole = (role || "").toLowerCase();

  // ─────────────────────────────
  // 🔁 Redirect if already logged in (login/signup)
  // ─────────────────────────────
  if (redirectIfLoggedIn) {
    switch (normalizedRole) {
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      case "lawyer":
        return <Navigate to="/lawyer/dashboard" replace />;
      case "client":
        return <Navigate to="/client/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  // ─────────────────────────────
  // 🔐 Role-based protection
  // ─────────────────────────────
  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    switch (normalizedRole) {
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      case "lawyer":
        return <Navigate to="/lawyer/dashboard" replace />;
      case "client":
        return <Navigate to="/client/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  // ─────────────────────────────
  // ✅ Render page content only (animation applied)
  // ─────────────────────────────
  return <div ref={containerRef}>{children}</div>;
};

export default ProtectedRoute;