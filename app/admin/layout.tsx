import { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminSidebar } from "./AdminSidebar";

export const metadata = {
  title: "PactIQ Admin Control Plane",
  description: "Administrative control plane, metrics, and contract inspection dashboard.",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const adminUser = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">Live Production Monitoring</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{adminUser.name || "Administrator"}</p>
              <p className="text-[11px] text-slate-500 font-mono">{adminUser.email}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shadow-xs">
              {(adminUser.name || adminUser.email || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="p-6 sm:p-8 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
