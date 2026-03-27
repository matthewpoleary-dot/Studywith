"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, CreditCard, BarChart2, TrendingUp, RefreshCw, BookOpen, Trash2, Upload } from "lucide-react";

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

type LCDocument = {
  title: string;
  subject: string;
  doc_type: string;
  year: number | null;
  chunks: number;
  created_at: string;
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

// ── Knowledge Base Tab ────────────────────────────────────────────────────────
function KnowledgeBaseTab() {
  const [documents, setDocuments] = useState<LCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("LC Biology");
  const [docType, setDocType] = useState("syllabus");
  const [year, setYear] = useState("");
  const [content, setContent] = useState("");

  const SUBJECTS = [
    "LC Biology", "LC Chemistry", "LC Physics", "LC Maths",
    "LC English", "LC Irish", "LC History", "LC Geography",
    "LC Business", "LC Economics", "LC Accounting",
    "LC Agricultural Science", "LC Computer Science",
    "LC French", "LC German", "LC Spanish",
    "LC Home Economics", "LC Art", "LC Music", "LC PE",
    "JC Science", "JC English", "JC Maths", "JC History",
    "JC Irish", "JC Geography", "JC Business Studies",
    "General",
  ];

  const DOC_TYPES = [
    { value: "syllabus", label: "Syllabus / Specification" },
    { value: "marking_scheme", label: "Marking Scheme" },
    { value: "past_paper", label: "Past Paper" },
    { value: "chief_examiner", label: "Chief Examiner Report" },
    { value: "notes", label: "Study Notes" },
    { value: "guidelines", label: "Teacher Guidelines" },
  ];

  const loadDocuments = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/ingest");
    if (res.ok) setDocuments((await res.json()).documents ?? []);
    setLoading(false);
  };

  useEffect(() => { void loadDocuments(); }, []);

  const handleUpload = async () => {
    if (!title.trim() || !content.trim()) {
      setStatus("Title and content are required.");
      return;
    }
    setUploading(true);
    setStatus("Chunking and embedding...");
    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject,
          doc_type: docType,
          year: year ? parseInt(year) : undefined,
          content: content.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setStatus(`Uploaded: ${json.chunks} chunk${json.chunks !== 1 ? "s" : ""} embedded.`);
        setTitle(""); setContent(""); setYear("");
        await loadDocuments();
      } else {
        setStatus(`Error: ${json.error}`);
      }
    } catch {
      setStatus("Network error.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: LCDocument) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    await fetch("/api/admin/ingest", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: doc.title, subject: doc.subject }),
    });
    await loadDocuments();
  };

  return (
    <div className="space-y-8">
      {/* Upload form */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 space-y-4">
        <h2 className="font-medium text-[#1A1A1A]">Upload LC/JC Document</h2>
        <p className="text-xs text-[#A8A29E]">
          Paste syllabi, marking schemes, past papers, or Chief Examiner reports. The AI will use these to guide students with curriculum-accurate detail.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#57534E] mb-1">Document title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. LC Biology Syllabus 2024, 2023 LC Maths Paper 1 Marking Scheme"
              className="w-full rounded-xl border border-[#E7E5E4] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#C8C4C0] focus:outline-none focus:border-[#D97706] bg-[#FAFAF8]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#D97706] bg-[#FAFAF8]"
            >
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] mb-1">Document type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#D97706] bg-[#FAFAF8]"
            >
              {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] mb-1">Year (optional)</label>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2023"
              type="number"
              className="w-full rounded-xl border border-[#E7E5E4] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#C8C4C0] focus:outline-none focus:border-[#D97706] bg-[#FAFAF8]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#57534E] mb-1">
            Content <span className="text-[#A8A29E] font-normal">(paste full text of the document)</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Paste the full text here (syllabus sections, marking scheme points, examiner notes, past paper questions and answers)..."
            className="w-full rounded-xl border border-[#E7E5E4] px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#C8C4C0] focus:outline-none focus:border-[#D97706] bg-[#FAFAF8] resize-y font-mono leading-relaxed"
          />
          <p className="text-[11px] text-[#A8A29E] mt-1">{content.length.toLocaleString()} characters · ~{Math.ceil(content.length / 1500)} chunk{Math.ceil(content.length / 1500) !== 1 ? "s" : ""}</p>
        </div>

        {status && (
          <div className={`text-sm px-4 py-3 rounded-xl border ${status.startsWith("Error") ? "bg-red-50 border-red-200 text-red-600" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
            {status}
          </div>
        )}

        <button
          onClick={() => void handleUpload()}
          disabled={uploading || !title.trim() || !content.trim()}
          className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-[#1A1A1A]/85 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Embedding..." : "Upload & embed"}
        </button>
      </div>

      {/* Document list */}
      <div>
        <h2 className="font-medium text-[#1A1A1A] mb-3">Knowledge base ({documents.length} document{documents.length !== 1 ? "s" : ""})</h2>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-[#A8A29E] animate-spin" /></div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E7E5E4] bg-[#FAFAF8] px-6 py-10 text-center">
            <BookOpen className="w-8 h-8 text-[#C8C4C0] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#57534E]">No documents yet. Upload a syllabus or marking scheme to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-[#E7E5E4] rounded-xl px-4 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{doc.title}</p>
                  <p className="text-xs text-[#A8A29E] mt-0.5">
                    {doc.subject} · {DOC_TYPES.find(t => t.value === doc.doc_type)?.label ?? doc.doc_type}
                    {doc.year ? ` · ${doc.year}` : ""}
                    {" · "}{doc.chunks} chunk{doc.chunks !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => void handleDelete(doc)}
                  className="shrink-0 p-1.5 rounded-lg text-[#A8A29E] hover:text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Admin Client ─────────────────────────────────────────────────────────
type Tab = "metrics" | "knowledge";

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("metrics");
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
            {tab === "metrics" && (
              <button
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center gap-2 border border-[#E7E5E4] rounded-xl px-4 py-2 text-sm text-[#57534E] hover:bg-[#F5F4F0] transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border border-[#E7E5E4] rounded-xl p-1 bg-white w-fit">
          {([ ["metrics", "Metrics", BarChart2], ["knowledge", "Knowledge Base", BookOpen] ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? "bg-[#1A1A1A] text-white" : "text-[#57534E] hover:bg-[#F5F4F0]"}`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {/* Tab content */}
        {tab === "metrics" && (
          loading && !m ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#A8A29E] animate-spin" />
            </div>
          ) : m ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="MRR" value={m.stripe.mrr !== null ? fmt(m.stripe.mrr) : "–"} sub={`${m.stripe.activeSubscriptions} active · ${m.stripe.trialingSubscriptions} trialing`} icon={CreditCard} accent />
                <StatCard label="ARR (est.)" value={m.stripe.mrr !== null ? fmt(m.stripe.mrr * 12) : "–"} sub="MRR × 12" icon={TrendingUp} />
                <StatCard label="Total users" value={m.users.total.toLocaleString()} sub={`+${m.users.newThisWeek} this week`} icon={Users} />
                <StatCard label="Paying users" value={m.users.subscribed.toLocaleString()} sub={`${conversionRate}% conversion`} icon={CreditCard} />
                <StatCard label="Sessions" value={m.sessions.total.toLocaleString()} sub={`${m.sessions.completed} completed`} icon={BarChart2} />
                <StatCard label="Completion rate" value={m.sessions.total > 0 ? `${Math.round((m.sessions.completed / m.sessions.total) * 100)}%` : "–"} sub="sessions with receipt" icon={BarChart2} />
              </div>

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
                        <span className="text-sm font-semibold text-emerald-600">{fmt(c.amount, c.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5 text-xs text-[#57534E] space-y-1.5">
                <p className="font-medium text-[#1A1A1A] mb-2">Notes</p>
                <p>• MRR is calculated from Stripe active subscriptions (annual plans normalised to monthly).</p>
                <p>• Stripe is in <span className="font-mono bg-amber-50 text-amber-700 px-1 rounded">test mode</span>. Figures are test data only.</p>
                <p>• Token spend tracking: Groq does not expose per-request token logs via API. Use Groq dashboard → Usage for cost data.</p>
              </div>
            </>
          ) : null
        )}

        {tab === "knowledge" && <KnowledgeBaseTab />}
      </div>
    </div>
  );
}
