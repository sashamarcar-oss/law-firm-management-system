// src/components/layout/Navbar.tsx
import { NotificationBell } from "./NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";

interface NavbarProps {
  role: "admin" | "lawyer" | "client";
}

// Extend AppUser locally to include missing properties
interface ExtendedAppUser {
  name?: string;
  photoURL?: string;
}

export default function Navbar({ role }: NavbarProps) {
  const { currentUser, logout } = useAuth();

  // Cast currentUser to ExtendedAppUser or undefined if no user
  const user = currentUser as ExtendedAppUser | undefined;

  const initials = user?.name
    ? user.name.substring(0, 2).toUpperCase()
    : "U";

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-bold">
              L
            </div>
            <h1 className="text-xl font-semibold">
              Law Firm {role.charAt(0).toUpperCase() + role.slice(1)} Portal
            </h1>
          </div>

          {/* Right side - Profile + Notification Bell + Logout */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar + Name */}
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.name || "User"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Logout button */}
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
              <LogOut className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}