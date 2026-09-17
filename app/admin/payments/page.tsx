import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const [payments, totalPaymentsCount, paidPayments] = await Promise.all([
    prisma.payment.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        review: {
          include: {
            contractVersion: {
              include: { contract: { select: { filename: true } } },
            },
          },
        },
      },
    }),
    prisma.payment.count(),
    prisma.payment.findMany({
      where: { status: "paid" },
      select: { amount: true, currency: true },
    }),
  ]);

  const totalRevenueUSD = paidPayments.reduce(
    (sum, p) => sum + (p.currency === "USD" ? p.amount : p.amount / 1500),
    0
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
          Payments & Revenue Ledger
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Transaction records, Paystack & Stripe references, and billing status.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Revenue</span>
          <p className="mt-2 text-3xl font-black text-emerald-700">${Math.round(totalRevenueUSD).toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">Estimated cumulative gross volume</p>
        </div>

        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Transactions</span>
          <p className="mt-2 text-3xl font-black text-slate-950">{totalPaymentsCount}</p>
          <p className="mt-1 text-xs text-slate-500">{paidPayments.length} successful payments</p>
        </div>

        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Payment Gateways</span>
          <div className="mt-3 flex items-center gap-2">
            <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-md border border-slate-200">
              Paystack
            </span>
            <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-md border border-slate-200">
              Stripe
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Multi-currency checkout active</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card-surface rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider">
            Recent Transactions
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-4 py-3.5">Contract Document</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Gateway</th>
                <th className="px-4 py-3.5">Reference</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-950">{p.user?.name || "User"}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">{p.user?.email || "N/A"}</p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {p.review?.contractVersion?.contract?.filename || "Contract Review"}
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-slate-900">
                      {p.currency === "NGN" ? `₦${p.amount.toLocaleString()}` : `$${p.amount.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-slate-700 uppercase text-[11px]">
                        {p.provider}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                      {p.transactionReference || p.id.slice(0, 12)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          p.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.status === "pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-500 text-[11px]">
                      {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
