import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";

/**
 * Checks if a user has admin privileges.
 * 1. Checks if user.role in DB is 'ADMIN' or 'SUPER_ADMIN'.
 * 2. Checks if user.email matches ADMIN_EMAILS environment variable.
 * 3. In development (when ADMIN_EMAILS is not configured), defaults to allowing authenticated users.
 */
export function isAdminUser(user: { email: string; role?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;

  // 1. Database-backed role check
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return true;
  }
  if (user.role === "USER") {
    return false;
  }

  // 2. Environment variable check
  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  if (adminEmailsEnv) {
    const allowed = adminEmailsEnv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return allowed.includes(user.email.toLowerCase());
  }

  return false;
}

export function isSuperAdminUser(user: { email: string; role?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "USER" || user.role === "ADMIN") return false;

  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  if (adminEmailsEnv) {
    const allowed = adminEmailsEnv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return allowed.includes(user.email.toLowerCase());
  }

  return false;
}

/**
 * Server-side guard for admin pages.
 * Redirects to /login if not authenticated, or /dashboard if not an admin.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!isAdminUser(user)) {
    redirect("/dashboard");
  }

  return user;
}
