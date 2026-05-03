"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { X, Menu } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">

      {/* ---------------- Mobile Sidebar ---------------- */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <aside className="relative z-50 w-64 bg-white dark:bg-slate-800 shadow-xl p-6">
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X size={20} className="text-slate-700 dark:text-slate-200" />
            </button>

            {/* Sidebar Content */}
            <nav className="mt-10 space-y-4">
              <a href="/dashboard/client" className="block py-2 px-3 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                Dashboard
              </a>
              <a href="/dashboard/client/appointments" className="block py-2 px-3 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                Appointments
              </a>
              <a href="/dashboard/client/profile" className="block py-2 px-3 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                Profile
              </a>
            </nav>
          </aside>
        </div>
      )}

      {/* ---------------- Desktop Sidebar ---------------- */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex-col">
        <nav className="space-y-4 mt-10">
          <a href="/dashboard/client" className="block py-2 px-3 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            Dashboard
          </a>
          <a href="/dashboard/client/appointments" className="block py-2 px-3 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            Appointments
          </a>
          <a href="/dashboard/client/profile" className="block py-2 px-3 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            Profile
          </a>
        </nav>
      </aside>

      {/* ---------------- Main Content ---------------- */}
      <div className="flex-1 flex flex-col overflow-x-hidden">

        {/* Mobile Hamburger */}
        <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <Menu size={20} className="text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Dashboard</h1>
        </div>

        {/* Children (Navbar + Content) */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}