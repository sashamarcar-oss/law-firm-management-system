// components/ClientNavbar.tsx
import { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown, LogOut, User, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ClientNavbar() {
  const { currentUser, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Safe fallback for avatar letter
  const userInitial =
    currentUser?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
            M
          </div>
          <h1 className="text-lg font-semibold text-slate-800">
            Muthomi Law
          </h1>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">

          {/* Notifications */}
          <button className="relative p-2 rounded-full hover:bg-slate-100 transition">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* PROFILE DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 px-2 py-1 rounded-lg transition"
            >
              <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {userInitial}
              </div>

              <ChevronDown
                size={16}
                className={`text-slate-500 transition-transform duration-300 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* DROPDOWN */}
            <div
              className={`absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 ${
                open
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
              }`}
            >
              {/* User Info */}
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium text-slate-800">
                  {currentUser?.email || "No email"}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {currentUser?.role}
                </p>
              </div>

              {/* Menu */}
              <div className="py-2">
                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 transition">
                  <User size={16} /> Profile
                </button>

                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 transition">
                  <Settings size={16} /> Settings
                </button>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}