"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, CreditCard, BarChart2, TrendingUp, RefreshCw } from "lucide-react";

type RecentCharge = { amount: number; currency: string; created: number; email: string | null };
type Metrics = {
  users: { total: number; subscribed: number; newThisWeek: number };
  sessions: { total: number; completed: number };
  stripe: {
    mrr: number | null;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    recentCharges: RecentCharge[];
  };
};

function fmt(val: number, currency = "eur"): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(val);
}

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "bg-[#1A1A1A] border-[#1A1A1A] text-white" : "bg-white border-[#E7E5E4]"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-white/50" : "text-[#57534E]"}`}>{label}</p>
        <Icon className={`w-4 h-4 ${accent ? "text-white/40" : "text-[#A8A29E]"}`} strokeWidth={1.5} />
      </div>
      <p className={`text-3xl font-serif font-medium ${accent ? "text-white" : "text-[#1A1A1A]"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1.5 ${accent ? "text-white/50" : "text-[#A8A29E]"}`}>{sub}</p>}
    </div>
  );
}

export default function AdminClient() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) { setError("Failed to load metrics."); return; }
      setMetrics((await res.json()) as Metrics);
      setLastRefreshed(new Date());
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const m = metrics;
  const conversionRate = m && m.users.total > 0
    ? ((m.users.subscribed / m.users.total) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-[#FDFCF8] px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium text-[#1A1A1A]">Command Centre</h1>
            <p className="text-sm text-[#A8A29E] mt-1">
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/app" className="text-sm text-[#57534E] hover:text-[#1A1A1A] transition">← App</a>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 border border-[#E7E5E4] rounded-xl px-4 py-2 text-sm text-[#57534E] hover:bg-[#F5F4F0] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {loading && !m ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#A8A29E] animate-spin" />
          </div>
        ) : m ? (
          <>
            {/* MRR + Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                label="MRR"
                value={m.stripe.mrr !== null ? fmt(m.stripe.mrr) : "–"}
                sub={`${m.stripe.activeSubscriptions} active · ${m.stripe.trialingSubscriptions} trialing`}
                icon={CreditCard}
                accent
              />
              <StatCard
                label="ARR (est.)"
                value={m.stripe.mrr !== null ? fmt(m.stripe.mrr * 12) : "–"}
                sub="MRR × 12"
                icon={TrendingUp}
              />
              <StatCard
                label="Total users"
                value={m.users.total.toLocaleString()}
                sub={`+${m.users.newThisWeek} this week`}
                icon={Users}
              />
              <StatCard
                label="Paying users"
                value={m.users.subscribed.toLocaleString()}
                sub={`${conversionRate}% conversion`}
                icon={CreditCard}
              />
              <StatCard
                label="Sessions"
                value={m.sessions.total.toLocaleString()}
                sub={`${m.sessions.completed} completed`}
                icon={BarChart2}
              />
              <StatCard
                label="Completion rate"
                value={m.sessions.total > 0 ? `${Math.round((m.sessions.completed / m.sessions.total) * 100)}%` : "–"}
                sub="sessions with receipt"
                icon={BarChart2}
              />
            </div>

            {/* Recent charges */}
            {m.stripe.recentCharges.length > 0 && (
              <div>
                <h2 className="font-medium text-[#1A1A1A] mb-3">Recent payments</h2>
                <div className="space-y-2">
                  {m.stripe.recentCharges.map((c, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-[#E7E5E4] rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm text-[#1A1A1A] font-medium">{c.email ?? "Unknown"}</p>
                        <p className="text-xs text-[#A8A29E]">
                          {new Date(c.created * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {fmt(c.amount, c.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5 text-xs text-[#57534E] space-y-1.5">
              <p className="font-medium text-[#1A1A1A] mb-2">Notes</p>
              <p>• MRR is calculated from Stripe active subscriptions (annual plans normalised to monthly).</p>
              <p>• Stripe is in <span className="font-mono bg-amber-50 text-amber-700 px-1 rounded">test mode</span> — figures are test data only.</p>
              <p>• Token spend tracking: Groq does not expose per-request token logs via API. Use Groq dashboard → Usage for cost data.</p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
