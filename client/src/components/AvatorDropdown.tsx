"use client";

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

export default function AvatarDropdown() {
  const { currentUser, firebaseUser, logout } = useAuth(); // make sure logout exists
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // CLOSE ON OUTSIDE CLICK
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* AVATAR */}
      <Avatar
        className="cursor-pointer hover:scale-105 transition"
        onClick={() => setOpen(!open)}
      >
        <AvatarImage src={firebaseUser?.photoURL || ""} />
        <AvatarFallback>
          {currentUser?.displayName?.charAt(0) || "E"}
        </AvatarFallback>
      </Avatar>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border z-50">
          {/* USER INFO */}
          <div className="p-3 border-b">
            <p className="text-sm font-semibold">
              {currentUser?.displayName || "Evans"}
            </p>
            <p className="text-xs text-gray-500">
              {firebaseUser?.email}
            </p>
          </div>

          {/* MENU */}
          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                navigate("/lawyer/profile");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100"
            >
              <User size={16} /> Profile
            </button>

            <button
              onClick={() => {
                navigate("/settings");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100"
            >
              <Settings size={16} /> Settings
            </button>

            <button
              onClick={async () => {
                await logout?.(); // ensure logout exists in AuthContext
                navigate("/");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-red-500 hover:bg-red-50"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}