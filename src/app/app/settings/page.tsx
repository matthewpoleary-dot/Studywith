"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import CheckoutButton from "@/components/CheckoutButton";

type Tab = "account" | "profile" | "tutor" | "plan";

type PlanInfo =
  | { subscribed: false }
  | {
      subscribed: true;
      trialing: boolean;
      interval: "month" | "year";
      amount: number;
      currency: string;
      currentPeriodEnd: number;
      trialEnd: number | null;
    };

const SAGE_AVATARS = ["🦊", "🐻", "🦁", "🐺", "🦋", "🐸", "🦜", "🐼"] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p === "account" || p === "profile" || p === "tutor" || p === "plan") return p;
    }
    return "account";
  });
  const [user, setUser] = useState<User | null>(null);

  // Account tab
  const [newEmail, setNewEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordDone, setPasswordDone] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [accountError, setAccountError] = useState<string | null>(null);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Profile tab
  const [displayName, setDisplayName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileDone, setProfileDone] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Daily goal
  const [dailyGoal, setDailyGoal] = useState("");
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalDone, setGoalDone] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  // Tutor avatar
  const [sageAvatar, setSageAvatar] = useState("🌿");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarDone, setAvatarDone] = useState(false);

  // Plan tab
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        // Email intentionally left empty (Task 10: user types new email)
        setDisplayName((user.user_metadata?.full_name as string) ?? "");
        const goal = user.user_metadata?.daily_goal;
        setDailyGoal(goal != null ? String(goal) : "");
        setSageAvatar((user.user_metadata?.sage_avatar as string) ?? "🌿");
      }
    });
  }, []);

  useEffect(() => {
    if (tab !== "plan" || planInfo !== null) return;
    setPlanLoading(true);
    fetch("/api/stripe/plan-info")
      .then((r) => r.json())
      .then((data: PlanInfo) => setPlanInfo(data))
      .catch(() => setPlanInfo({ subscribed: false }))
      .finally(() => setPlanLoading(false));
  }, [tab, planInfo]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/billing-portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    setAccountError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setAccountError(error.message);
    } else {
      setEmailSent(true);
    }
    setEmailLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAccountError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setAccountError("Password must be at least 8 characters.");
      return;
    }
    setPasswordLoading(true);
    setAccountError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });
    if (signInError) {
      setAccountError("Current password is incorrect.");
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setAccountError(error.message);
    } else {
      setPasswordDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  };

  const handleGoalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalLoading(true);
    setGoalError(null);
    const parsed = dailyGoal.trim() === "" ? null : parseInt(dailyGoal, 10);
    if (parsed !== null && (isNaN(parsed) || parsed < 1 || parsed > 20)) {
      setGoalError("Enter a number between 1 and 20, or leave blank to remove.");
      setGoalLoading(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      data: { daily_goal: parsed },
    });
    if (error) {
      setGoalError(error.message);
    } else {
      setGoalDone(true);
      setTimeout(() => setGoalDone(false), 3000);
    }
    setGoalLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/delete-account", { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        window.location.href = "/";
      } else {
        setDeleteError(data.error ?? "Failed to delete account.");
        setDeleteLoading(false);
      }
    } catch {
      setDeleteError("Network error. Please try again.");
      setDeleteLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName.trim() },
    });
    if (error) {
      setProfileError(error.message);
    } else {
      setProfileDone(true);
      setTimeout(() => setProfileDone(false), 3000);
    }
    setProfileLoading(false);
  };

  const handleAvatarSave = async (emoji: string) => {
    setSageAvatar(emoji);
    setAvatarLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.updateUser({ data: { sage_avatar: emoji } });
    setAvatarLoading(false);
    setAvatarDone(true);
    setTimeout(() => setAvatarDone(false), 2000);
  };

  const inputClass =
    "rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition";

  const primaryBtn =
    "self-start rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1A1A1A]/80 transition disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-10 md:py-14">
      <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-8">
        Settings
      </h1>

      {/* Tabs */}
      <div className="flex gap-0 mb-8 border-b border-[#E7E5E4]">
        {(
          [
            ["account", "Account"],
            ["profile", "Personal information"],
            ["tutor", "Tutor"],
            ["plan", "My plan"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              setAccountError(null);
            }}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === id
                ? "border-[#1A1A1A] text-[#1A1A1A]"
                : "border-transparent text-[#57534E] hover:text-[#1A1A1A]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Account tab */}
      {tab === "account" && (
        <div className="space-y-6">
          {/* Email */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-1">Email address</h2>
            <p className="text-sm text-[#57534E] mb-4">
              Current: <span className="font-medium">{user?.email ?? "loading..."}</span>
            </p>
            {emailSent ? (
              <p className="text-sm text-[#D97706]">
                Confirmation sent to <span className="font-medium">{newEmail}</span>. Check your inbox to confirm the change.
              </p>
            ) : (
              <form onSubmit={(e) => void handleEmailChange(e)} className="flex gap-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  type="submit"
                  disabled={emailLoading || !newEmail.trim()}
                  className={primaryBtn}
                >
                  {emailLoading ? "Saving..." : "Update"}
                </button>
              </form>
            )}
          </section>

          {/* Password */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-4">Change password</h2>
            {passwordDone ? (
              <p className="text-sm text-green-600">Password updated successfully.</p>
            ) : (
              <form onSubmit={(e) => void handlePasswordChange(e)} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#57534E]">Current password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#57534E]">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#57534E]">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                    className={inputClass}
                  />
                </div>
                {accountError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {accountError}
                  </p>
                )}
                <button type="submit" disabled={passwordLoading} className={`mt-1 ${primaryBtn}`}>
                  {passwordLoading ? "Updating..." : "Update password"}
                </button>
              </form>
            )}
          </section>

          {/* Danger zone */}
          <section className="bg-white border border-red-200 rounded-2xl p-6">
            <h2 className="font-medium text-red-700 mb-1">Delete account</h2>
            <p className="text-sm text-[#57534E] mb-4">
              This permanently deletes your account and all your sessions. This cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#57534E]">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-red-400 focus:ring-1 focus:ring-red-200 transition"
                />
              </div>
              {deleteError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {deleteError}
                </p>
              )}
              <button
                onClick={() => void handleDeleteAccount()}
                disabled={deleteConfirm !== "DELETE" || deleteLoading}
                className="self-start rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleteLoading ? "Deleting..." : "Delete my account"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="space-y-6">
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-4">Personal information</h2>
            <form onSubmit={(e) => void handleProfileSave(e)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#57534E]">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#57534E]">Email address</label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="rounded-xl border border-[#E7E5E4] bg-[#F5F4F0] px-3 py-2.5 text-sm text-[#A8A29E] outline-none cursor-not-allowed"
                />
                <p className="text-xs text-[#A8A29E]">Change your email in the Account tab.</p>
              </div>
              {profileError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {profileError}
                </p>
              )}
              <div className="flex items-center gap-3">
                <button type="submit" disabled={profileLoading} className={primaryBtn}>
                  {profileLoading ? "Saving..." : "Save changes"}
                </button>
                {profileDone && <p className="text-sm text-green-600">Saved.</p>}
              </div>
            </form>
          </section>

          {/* Daily goal */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-1">Daily study goal</h2>
            <p className="text-sm text-[#57534E] mb-4">
              Set a target number of sessions per day. Leave blank to disable.
            </p>
            <form onSubmit={(e) => void handleGoalSave(e)} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#57534E]">Sessions per day</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(e.target.value)}
                  placeholder="e.g. 2"
                  className={inputClass}
                />
              </div>
              {goalError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {goalError}
                </p>
              )}
              <div className="flex items-center gap-3">
                <button type="submit" disabled={goalLoading} className={primaryBtn}>
                  {goalLoading ? "Saving..." : "Save goal"}
                </button>
                {goalDone && <p className="text-sm text-green-600">Saved.</p>}
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Tutor tab */}
      {tab === "tutor" && (
        <div className="space-y-6">
          {/* Sage avatar picker */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-1">Sage&apos;s avatar</h2>
            <p className="text-sm text-[#57534E] mb-5">
              Pick an emoji to represent Sage in your sessions.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              {SAGE_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => void handleAvatarSave(emoji)}
                  disabled={avatarLoading}
                  className={`w-12 h-12 text-2xl rounded-2xl border-2 flex items-center justify-center transition-all hover:scale-110 ${
                    sageAvatar === emoji
                      ? "border-[#D97706] bg-[#D97706]/8 shadow-sm scale-110"
                      : "border-[#E7E5E4] bg-white hover:border-[#D97706]/40"
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#57534E]">
                Current: <span className="text-lg">{sageAvatar}</span>
              </span>
              {avatarDone && <span className="text-xs text-green-600">Saved.</span>}
            </div>
          </section>
        </div>
      )}

      {/* Plan tab */}
      {tab === "plan" && (
        <div className="space-y-6">
          {planLoading ? (
            <div className="flex items-center justify-center py-16 text-[#A8A29E] text-sm">
              Loading plan details…
            </div>
          ) : planInfo?.subscribed ? (
            <>
              {/* Active / trialing plan card */}
              <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="font-medium text-[#1A1A1A] mb-1">
                      StudyWith Pro
                      {planInfo.interval === "year" ? " (Annual)" : " (Monthly)"}
                    </h2>
                    <p className="text-sm text-[#57534E]">
                      {planInfo.trialing
                        ? "You're currently on a free trial."
                        : "Your subscription is active."}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                      planInfo.trialing
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {planInfo.trialing ? "Trial" : "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#FAFAF8] rounded-xl px-4 py-3">
                    <p className="text-xs text-[#A8A29E] mb-1 uppercase tracking-wide font-medium">
                      Price
                    </p>
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {new Intl.NumberFormat("en-IE", {
                        style: "currency",
                        currency: planInfo.currency.toUpperCase(),
                      }).format(planInfo.amount / 100)}
                      <span className="text-[#A8A29E] font-normal">
                        {" "}/ {planInfo.interval === "year" ? "year" : "month"}
                      </span>
                    </p>
                  </div>

                  <div className="bg-[#FAFAF8] rounded-xl px-4 py-3">
                    <p className="text-xs text-[#A8A29E] mb-1 uppercase tracking-wide font-medium">
                      {planInfo.trialing && planInfo.trialEnd
                        ? "Trial ends"
                        : "Next renewal"}
                    </p>
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {new Date(
                        ((planInfo.trialing && planInfo.trialEnd
                          ? planInfo.trialEnd
                          : planInfo.currentPeriodEnd) ?? 0) * 1000,
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => void handleManageBilling()}
                  disabled={portalLoading}
                  className="rounded-full border border-[#E7E5E4] bg-white px-5 py-2.5 text-sm font-medium text-[#1A1A1A] hover:bg-[#F5F4F0] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {portalLoading ? "Opening…" : "Manage billing →"}
                </button>
              </section>

              {/* Upgrade to annual if currently monthly */}
              {!planInfo.trialing && planInfo.interval === "month" && (
                <section className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">💡</span>
                    <h2 className="font-medium text-[#1A1A1A]">Save with annual billing</h2>
                  </div>
                  <p className="text-sm text-[#57534E] mb-4">
                    Switch to an annual plan and save over 40%. Just €7.42/month.
                  </p>
                  <CheckoutButton
                    plan="annual"
                    label="Switch to Annual | €89/yr"
                    className="inline-flex items-center justify-center rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1A1A1A]/85 transition disabled:opacity-60"
                  />
                </section>
              )}
            </>
          ) : (
            <>
              {/* Unsubscribed — upgrade options */}
              <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#A8A29E] shrink-0" />
                  <h2 className="font-medium text-[#1A1A1A]">Free tier</h2>
                </div>
                <p className="text-sm text-[#57534E]">
                  You&apos;re currently on the free tier. Upgrade to unlock unlimited sessions.
                </p>
              </section>

              <h3 className="font-medium text-[#1A1A1A] text-sm">Choose a plan</h3>

              {/* Trial card */}
              <section className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-medium text-[#1A1A1A] mb-0.5">Free 7-day trial</p>
                    <p className="text-sm text-[#57534E]">
                      Try everything free for 7 days. No charge until the trial ends.
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    Free
                  </span>
                </div>
                <p className="text-xs text-[#A8A29E] mb-4">Then €12.99/month, cancel anytime.</p>
                <CheckoutButton
                  plan="trial"
                  label="Start free trial"
                  className="inline-flex items-center justify-center rounded-full bg-[#D97706] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#B45309] transition disabled:opacity-60"
                />
              </section>

              {/* Monthly card */}
              <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-medium text-[#1A1A1A] mb-0.5">Monthly</p>
                    <p className="text-sm text-[#57534E]">
                      Unlimited sessions, month by month. Cancel anytime.
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#1A1A1A]">
                    €12.99<span className="text-xs font-normal text-[#A8A29E]">/mo</span>
                  </span>
                </div>
                <CheckoutButton
                  plan="monthly"
                  label="Subscribe monthly"
                  className="inline-flex items-center justify-center rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1A1A1A]/85 transition disabled:opacity-60"
                />
              </section>

              {/* Annual card */}
              <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-[#1A1A1A]">Annual</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Save 43%
                      </span>
                    </div>
                    <p className="text-sm text-[#57534E]">
                      Best value. Just €7.42 per month, billed annually.
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#1A1A1A]">
                    €89<span className="text-xs font-normal text-[#A8A29E]">/yr</span>
                  </span>
                </div>
                <CheckoutButton
                  plan="annual"
                  label="Subscribe annually"
                  className="inline-flex items-center justify-center rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1A1A1A]/85 transition disabled:opacity-60"
                />
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
