"use client";

import { useEffect, useState } from "react";
import { PromoteAdminModal } from "./PromoteAdminModal";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        q: search,
        role: roleFilter,
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers();
  }

  async function handleRoleChange(userId: string, newRole: "USER" | "ADMIN" | "SUPER_ADMIN", userName: string) {
    const isDemoting = newRole === "USER";
    const confirmPrompt = isDemoting
      ? `Are you sure you want to revoke Admin privileges from ${userName}?`
      : `Are you sure you want to promote ${userName} to ${newRole}?`;

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setToastMessage(data.message || "Role updated successfully.");
      setTimeout(() => setToastMessage(null), 3000);
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user role.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
            User Directory & Access Control
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Manage registered accounts, review personas, and grant admin management privileges.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsPromoteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
          >
            <span>🛡️</span>
            <span>+ Add / Promote Admin</span>
          </button>

          <button
            type="button"
            onClick={() => loadUsers()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-surface rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] max-w-md flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name or email address..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Personas</option>
            <option value="Creator / Influencer">Creator / Influencer</option>
            <option value="Freelancer / Consultant">Freelancer / Consultant</option>
            <option value="Agency / Studio">Agency / Studio</option>
            <option value="Tech / Startup Worker">Tech / Startup Worker</option>
            <option value="Small Business Owner">Small Business Owner</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-surface rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-4 py-3.5">System Privilege</th>
                <th className="px-4 py-3.5">Persona Role</th>
                <th className="px-4 py-3.5">Experience</th>
                <th className="px-4 py-3.5">Activity Stats</th>
                <th className="px-4 py-3.5 text-right">Joined</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading users directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No users matched the criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuperAdmin = u.role === "SUPER_ADMIN";
                  const isAdmin = u.role === "ADMIN" || u.isAdmin;
                  const isActionLoading = actionLoadingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-white font-bold text-xs shadow-xs ${
                            isSuperAdmin ? "bg-amber-600" : isAdmin ? "bg-indigo-600" : "bg-slate-900"
                          }`}>
                            {(u.name || u.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-950">{u.name || "User"}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* System Privilege Badge */}
                      <td className="px-4 py-4">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            <span>👑</span> Super Admin
                          </span>
                        ) : isAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                            <span>🛡️</span> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                            <span>👤</span> User
                          </span>
                        )}
                      </td>

                      {/* Persona Role */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {u.userRole || "Unspecified"}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-600">
                        {u.contractExperience || "Standard"}
                      </td>

                      <td className="px-4 py-4 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{u.stats.contractsCount} contracts</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500">{u.stats.conversationsCount} chats</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right text-slate-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isActionLoading ? (
                          <span className="text-xs text-slate-400 font-mono">Updating...</span>
                        ) : isSuperAdmin ? (
                          <span className="text-[11px] text-amber-700 font-semibold italic">Owner</span>
                        ) : isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(u.id, "USER", u.name || u.email)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 shadow-2xs transition cursor-pointer"
                          >
                            <span>Revoke Admin</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(u.id, "ADMIN", u.name || u.email)}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 shadow-2xs transition cursor-pointer"
                          >
                            <span>+ Make Admin</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              ← Previous
            </button>
            <span className="font-semibold text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Promote Admin Modal */}
      <PromoteAdminModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        onSuccess={() => loadUsers()}
      />
    </div>
  );
}
