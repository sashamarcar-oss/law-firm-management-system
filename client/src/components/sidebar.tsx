"use client";

import { Home, Calendar, FileText, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/client/dashboard", icon: Home, label: "Dashboard" },
  { to: "/client/appointments", icon: Calendar, label: "Appointments" },
  { to: "/client/cases", icon: FileText, label: "Cases" },
  { to: "/client/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const navItem =
    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition";

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">

      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b">
        <h1 className="text-xl font-bold text-indigo-600">
          LegalConnect
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">

        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${navItem} ${
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

      </nav>

      {/* Profile */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-full" />
          <div className="text-sm">
            <p className="font-medium text-slate-800">Client User</p>
            <p className="text-xs text-slate-500">Client</p>
          </div>
        </div>
      </div>

    </aside>
  );
}