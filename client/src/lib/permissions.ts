// src/lib/permissions.ts
import type { AppUser } from "@/context/AuthContext";

export type Permission =
  | "cases:approve"             // Admin only
  | "cases:assign_lawyer"       // Admin only
  | "schedule:set"              // Admin only
  | "users:view_all"            // Admin only
  | "audit_logs:view"           // Admin only
  | "complaints:handle"         // Admin only
  | "cases:view_assigned"       // Lawyer — only assigned cases
  | "cases:accept_decline"      // Lawyer
  | "cases:add_notes"           // Lawyer
  | "cases:update_status"       // Lawyer
  | "cases:create_request"      // Client
  | "cases:view_own"            // Client — only their cases
  | "feedback:leave"            // Client
  | "complaint:file";           // Client

export function can(user: AppUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;

  switch (permission) {
    // ── Admin ──────────────────────────────
    case "cases:approve":
    case "cases:assign_lawyer":
    case "schedule:set":
    case "users:view_all":
    case "audit_logs:view":
    case "complaints:handle":
      return user.role === "admin";

    // ── Lawyer ─────────────────────────────
    case "cases:view_assigned":
    case "cases:accept_decline":
    case "cases:add_notes":
    case "cases:update_status":
      return user.role === "lawyer";

    // ── Client ─────────────────────────────
    case "cases:create_request":
    case "cases:view_own":
    case "feedback:leave":
    case "complaint:file":
      return user.role === "client";

    default:
      return false; // deny unknown permissions
  }
}

// Convenience function for case ownership
export function canViewCase(
  user: AppUser | null | undefined,
  caseOwnerId?: string,
  assignedLawyerId?: string,
): boolean {
  if (!user) return false;

  if (user.role === "admin") return true;
  if (user.role === "lawyer") return assignedLawyerId === user.uid;
  if (user.role === "client") return caseOwnerId === user.uid;

  return false;
}