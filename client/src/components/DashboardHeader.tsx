"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

export default function DashboardHeader() {
  const { currentUser, role, logout } = useAuth();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  /* Close dropdown when clicking outside */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* Logout */

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const firstName = currentUser?.displayName?.split(" ")[0] || "User";

  const profilePath = `/${role || "client"}/profile`;
  const settingsPath = `/${role || "client"}/settings`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">

      <div className="flex items-center justify-between h-20 px-6">

        {/* Left Section */}

        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Welcome back, {firstName}
          </h1>

          <p className="text-sm text-slate-500">
            Manage your legal appointments
          </p>
        </div>

        {/* Right Section */}

        <div className="flex items-center gap-6">

          {/* Search */}

          <div className="hidden md:flex items-center bg-slate-100 px-3 py-2 rounded-lg w-64">

            <Search size={16} className="text-slate-500" />

            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none ml-2 text-sm w-full"
            />

          </div>

          {/* Notifications */}

          <button className="relative p-2 rounded-full hover:bg-slate-100 transition">

            <Bell className="h-5 w-5 text-slate-700" />

            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
              3
            </span>

          </button>

          {/* Profile */}

          <div ref={profileRef} className="relative flex items-center gap-1">

            {/* Avatar → Go to profile */}

            <button
              onClick={() => navigate(profilePath)}
              className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-600 overflow-hidden hover:bg-indigo-200 transition"
            >

              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                currentUser?.displayName?.[0] || "U"
              )}

            </button>

            {/* Dropdown toggle */}

            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="p-1 rounded hover:bg-slate-100"
            >
              <ChevronDown size={18} />
            </button>

            {/* Dropdown */}

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">

                <div className="p-4 border-b">

                  <p className="font-medium text-slate-900">
                    {currentUser?.displayName || "User"}
                  </p>

                  <p className="text-sm text-slate-500">
                    {currentUser?.email}
                  </p>

                </div>

                <div className="py-2">

                  <button
                    onClick={() => navigate(profilePath)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => navigate(settingsPath)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Settings
                  </button>

                  <hr />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </header>
  );
}