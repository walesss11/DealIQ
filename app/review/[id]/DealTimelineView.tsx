"use client";

export interface DealMilestone {
  id: string;
  versionNumber: number;
  filename: string;
  date: string;
  title: string;
  type: "upload" | "review" | "negotiation" | "revision" | "comparison";
  description: string;
  stats?: {
    high: number;
    worth_reviewing: number;
    understand: number;
  };
  comparisonStats?: {
    totalChanges?: number;
    addressedCount?: number;
    partiallyAddressedCount?: number;
    unresolvedCount?: number;
    newProvisionsCount?: number;
    acceptedCount?: number;
    partiallyAcceptedCount?: number;
    unchangedCount?: number;
  };
  isActiveVersion?: boolean;
  onSelectVersion?: (versionNumber: number) => void;
}

interface DealTimelineViewProps {
  milestones: DealMilestone[];
  onSelectVersion: (versionNumber: number) => void;
  onUploadRevision: () => void;
}

export function DealTimelineView({
  milestones,
  onSelectVersion,
  onUploadRevision,
}: DealTimelineViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="card-surface rounded-2xl p-6 sm:p-8 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800 border border-slate-200">
              <span>⏳</span> Deal Progression Timeline
            </span>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">
              Contract Lifecycle & Revision History
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Track the full evolution of this deal from original draft to latest negotiated revision.
            </p>
          </div>

          <button
            type="button"
            onClick={onUploadRevision}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition self-start sm:self-center cursor-pointer"
          >
            <span>+ Add Revised Contract</span>
          </button>
        </div>

        {/* Timeline Stream */}
        <div className="mt-8 relative pl-6 border-l-2 border-slate-200 space-y-8 ml-3 sm:ml-4">
          {milestones.map((m, idx) => {
            const isLast = idx === milestones.length - 1;

            return (
              <div key={m.id} className="relative group">
                {/* Node indicator */}
                <div
                  className={`absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white text-xs ${
                    m.isActiveVersion
                      ? "border-blue-600 text-blue-600 ring-4 ring-blue-100"
                      : "border-slate-400 text-slate-500"
                  }`}
                >
                  {m.type === "revision" || m.type === "comparison" ? "🔄" : m.versionNumber}
                </div>

                {/* Card */}
                <div
                  className={`rounded-xl border p-5 transition ${
                    m.isActiveVersion
                      ? "border-blue-300 bg-blue-50/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{m.title}</span>
                      {m.isActiveVersion && (
                        <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          Active View
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{m.date}</span>
                  </div>

                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">{m.description}</p>

                  {/* Badges / Stats */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {m.stats && (
                      <div className="flex items-center gap-2">
                        {m.stats.high > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
                            {m.stats.high} High Attention
                          </span>
                        )}
                        {m.stats.worth_reviewing > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            {m.stats.worth_reviewing} Worth Reviewing
                          </span>
                        )}
                        {m.stats.understand > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                            {m.stats.understand} Standard
                          </span>
                        )}
                      </div>
                    )}

                    {m.comparisonStats && (
                      <div className="flex items-center gap-2">
                        {((m.comparisonStats.addressedCount ?? m.comparisonStats.acceptedCount ?? 0) > 0) && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            ✓ {m.comparisonStats.addressedCount ?? m.comparisonStats.acceptedCount} Addressed
                          </span>
                        )}
                        {((m.comparisonStats.partiallyAddressedCount ?? m.comparisonStats.partiallyAcceptedCount ?? 0) > 0) && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            ~ {m.comparisonStats.partiallyAddressedCount ?? m.comparisonStats.partiallyAcceptedCount} Partial
                          </span>
                        )}
                        {((m.comparisonStats.unresolvedCount ?? m.comparisonStats.unchangedCount ?? 0) > 0) && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                            ✗ {m.comparisonStats.unresolvedCount ?? m.comparisonStats.unchangedCount} Unresolved
                          </span>
                        )}
                        {((m.comparisonStats.newProvisionsCount ?? 0) > 0) && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                            + {m.comparisonStats.newProvisionsCount} New
                          </span>
                        )}
                      </div>
                    )}

                    {!m.isActiveVersion && (
                      <button
                        type="button"
                        onClick={() => onSelectVersion(m.versionNumber)}
                        className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                      >
                        <span>Open Version {m.versionNumber} Report</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
