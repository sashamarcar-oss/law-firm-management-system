import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-[#0F172A] text-white hidden md:flex flex-col">
      {/* Logo / Title */}
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Muthomi Law Firm</h2>
        <p className="text-xs text-gray-400">Enterprise Legal Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 text-sm">
        <NavLink
          to="/client"
          className={({ isActive }) =>
            `block hover:bg-gray-800 p-2 rounded ${isActive ? "bg-gray-900 font-semibold" : ""}`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `block hover:bg-gray-800 p-2 rounded ${isActive ? "bg-gray-900 font-semibold" : ""}`
          }
        >
          Secure Messages
        </NavLink>
        <NavLink
          to="/billing"
          className={({ isActive }) =>
            `block hover:bg-gray-800 p-2 rounded ${isActive ? "bg-gray-900 font-semibold" : ""}`
          }
        >
          Billing
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `block hover:bg-gray-800 p-2 rounded ${isActive ? "bg-gray-900 font-semibold" : ""}`
          }
        >
          Profile
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;