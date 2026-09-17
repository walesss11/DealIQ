"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export interface NavbarUser {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  userRole?: string | null;
  onboardingCompleted?: boolean;
}

interface NavbarProps {
  user?: NavbarUser | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setLoggingOut(false);
    }
  }

  const navLinks = [
    { label: "Home", href: "/dashboard" },
    { label: "Deals", href: "/deals" },
    { label: "Settings", href: "/settings" },
  ];

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email
    ? user.email[0].toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        {/* Brand & Logo */}
        <div className="flex items-center gap-8">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-black text-sm shadow-2xs group-hover:bg-blue-900 transition-colors">
              P
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-950">PactIQ</span>
              <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md hidden sm:inline">
                Workspace
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Side CTAs & User Menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* + New Review CTA */}
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Review Contract</span>
              </Link>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-slate-200 transition focus:outline-none cursor-pointer"
                >
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt={user.name || "User profile"}
                      className="h-8 w-8 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {initials}
                    </div>
                  )}
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg z-50 animate-in fade-in-50 duration-150">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-950 truncate">{user.name || "PactIQ User"}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        {user.userRole && (
                          <span className="mt-1.5 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800 capitalize">
                            {user.userRole.replace("_", " ")}
                          </span>
                        )}
                      </div>

                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                        >
                          <span>🏠</span>
                          <span>Workspace Home</span>
                        </Link>
                        <Link
                          href="/deals"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                        >
                          <span>📁</span>
                          <span>Your Deals</span>
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                        >
                          <span>⚙️</span>
                          <span>Settings & Preferences</span>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={loggingOut}
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition text-left cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-950 transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {user && mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
