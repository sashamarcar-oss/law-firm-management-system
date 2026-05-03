

import { Link, useLocation } from 'react-router-dom';

export default function AdminSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const links = [
    { label: 'Dashboard', href: '/Admin/AdminDashboard' },
    { label: 'Manage Users', href: '/Admin/ManageUsers' },
    { label: 'Conversations', href: '/Admin/ConversationView' },
    { label: 'Audit Logs', href: '/Admin/AdminAuditLogs' },
    { label: 'Client Payments', href: '/Admin/AdminClientPayment' },
    { label: 'Profile', href: '/Admin/AdminProfile' },
  ];

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <nav className="flex flex-col space-y-2">
        {links.map(({ label, href }) => {
          const isActive = currentPath === href || currentPath.startsWith(href + '/');
          return (
            <Link
              key={href}
              to={href}
              className={`block px-3 py-2 rounded transition ${
                isActive ? 'bg-gray-900 font-semibold' : 'hover:bg-gray-700'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}