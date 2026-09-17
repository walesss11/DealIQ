"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContractInspectDrawer } from "./ContractInspectDrawer";

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedInspectId, setSelectedInspectId] = useState<string | null>(null);

  async function loadContracts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        q: search,
        status: statusFilter,
        type: typeFilter,
      });

      const res = await fetch(`/api/admin/contracts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load contracts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContracts();
  }, [page, statusFilter, typeFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadContracts();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
            Contracts Audit & Ingestion Log
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Search, inspect, and audit all contract documents and AI reviews across PactIQ.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadContracts()}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
        >
          <span>🔄</span>
          <span>Refresh Table</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card-surface rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] max-w-md flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename, user email, or contract type..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
          >
            Search
          </button>
        </form>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="complete">Complete</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Contract Types</option>
            <option value="Brand Deal Agreement">Brand Deal Agreement</option>
            <option value="Freelance Agreement">Freelance Agreement</option>
            <option value="Employment Agreement">Employment Agreement</option>
            <option value="Non-Disclosure Agreement">Non-Disclosure Agreement</option>
            <option value="Commercial Agreement">Commercial Agreement</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card-surface rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">Filename</th>
                <th className="px-4 py-3.5">Contract Type</th>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Versions</th>
                <th className="px-4 py-3.5">Review Findings</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading contracts...
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No contracts matched the selected filters.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-950 truncate max-w-[240px]">{c.filename}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {new Date(c.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {c.contractType || "General Agreement"}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{c.user?.name || "User"}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">{c.user?.email || "N/A"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        v{c.activeVersionNumber} ({c.totalVersions} total)
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {c.review ? (
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold" title="High Attention">
                            {c.review.counts.high} H
                          </span>
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold" title="Worth Reviewing">
                            {c.review.counts.worth} W
                          </span>
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="Understand">
                            {c.review.counts.understand} U
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No review</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          c.status === "complete"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : c.status === "processing"
                            ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedInspectId(c.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                      >
                        <span>🔍</span>
                        <span>Diagnostics</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Deep Inspection Drawer */}
      <ContractInspectDrawer
        contractId={selectedInspectId}
        onClose={() => setSelectedInspectId(null)}
      />
    </div>
  );
}
