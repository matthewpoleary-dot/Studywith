"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import ReferralLink from "@/components/ReferralLink";

type Tab = "account" | "profile" | "billing";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("account");
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

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        setNewEmail(user.email ?? "");
        setDisplayName((user.user_metadata?.full_name as string) ?? "");
        const goal = user.user_metadata?.daily_goal;
        setDailyGoal(goal != null ? String(goal) : "");
      }
    });
  }, []);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setAccountError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
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
    // Verify current password first
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
    const parsed =
      dailyGoal.trim() === "" ? null : parseInt(dailyGoal, 10);
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
            ["billing", "Plan & Billing"],
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

      {/* ── Account tab ── */}
      {tab === "account" && (
        <div className="space-y-6">

          {/* Email */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-1">Email address</h2>
            <p className="text-sm text-[#57534E] mb-4">
              Current:{" "}
              <span className="font-medium">{user?.email ?? "—"}</span>
            </p>
            {emailSent ? (
              <p className="text-sm text-[#D97706]">
                Confirmation sent to <span className="font-medium">{newEmail}</span>. Check your inbox to confirm the change.
              </p>
            ) : (
              <form
                onSubmit={(e) => void handleEmailChange(e)}
                className="flex gap-3"
              >
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="New email address"
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  type="submit"
                  disabled={emailLoading || newEmail === user?.email}
                  className={primaryBtn}
                >
                  {emailLoading ? "Saving…" : "Update"}
                </button>
              </form>
            )}
          </section>

          {/* Password */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-4">
              Change password
            </h2>
            {passwordDone ? (
              <p className="text-sm text-green-600">
                Password updated successfully.
              </p>
            ) : (
              <form
                onSubmit={(e) => void handlePasswordChange(e)}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#57534E]">
                    Current password
                  </label>
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
                  <label className="text-xs font-medium text-[#57534E]">
                    New password
                  </label>
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
                  <label className="text-xs font-medium text-[#57534E]">
                    Confirm new password
                  </label>
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

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className={`mt-1 ${primaryBtn}`}
                >
                  {passwordLoading ? "Updating…" : "Update password"}
                </button>
              </form>
            )}
          </section>

          {/* Danger zone */}
          <section className="bg-white border border-red-200 rounded-2xl p-6">
            <h2 className="font-medium text-red-700 mb-1">Delete account</h2>
            <p className="text-sm text-[#57534E] mb-4">
              This permanently deletes your account and cancels any active subscription. Your trial usage is tracked so a new account with the same email won&apos;t be eligible for another free trial.
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
                {deleteLoading ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Billing tab ── */}
      {tab === "billing" && (() => {
        const referralCode = user?.id.replace(/-/g, "").slice(0, 8).toUpperCase() ?? "";
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://studywith-phi.vercel.app";
        const referralUrl = `${siteUrl}/?ref=${referralCode}`;
        return (
          <div className="space-y-6">
            {/* Current plan */}
            <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
              <h2 className="font-medium text-[#1A1A1A] mb-4">Your plan</h2>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Monthly Plan — Active
                </span>
              </div>
              <ul className="space-y-2 mb-5">
                {[
                  "Unlimited tutoring sessions",
                  "Post-session summaries",
                  "Progress tracking & statistics",
                  "Image & PDF assignment upload",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-[#57534E]">
                    <span className="text-[#D97706]">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="https://billing.stripe.com/p/login/test_00000"
                target="_blank"
                rel="noopener noreferrer"
                className={`${primaryBtn} inline-flex`}
              >
                Manage subscription
              </a>
            </section>

            {/* Refer a friend */}
            {referralCode && (
              <section className="bg-[#F5F4F0] border border-[#E7E5E4] rounded-2xl p-6">
                <h2 className="font-medium text-[#1A1A1A] mb-1">Refer a friend</h2>
                <p className="text-sm text-[#57534E] mb-4">
                  Share your link. Friends get 14 days free instead of the usual 7.
                </p>
                <ReferralLink url={referralUrl} />
              </section>
            )}
          </div>
        );
      })()}

      {/* ── Profile tab ── */}
      {tab === "profile" && (
        <div className="space-y-6">
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-4">
              Personal information
            </h2>
            <form
              onSubmit={(e) => void handleProfileSave(e)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#57534E]">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#57534E]">
                  Email address
                </label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="rounded-xl border border-[#E7E5E4] bg-[#F5F4F0] px-3 py-2.5 text-sm text-[#A8A29E] outline-none cursor-not-allowed"
                />
                <p className="text-xs text-[#A8A29E]">
                  Change your email in the Account tab.
                </p>
              </div>

              {profileError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {profileError}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className={primaryBtn}
                >
                  {profileLoading ? "Saving…" : "Save changes"}
                </button>
                {profileDone && (
                  <p className="text-sm text-green-600">Saved.</p>
                )}
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
                <label className="text-xs font-medium text-[#57534E]">
                  Sessions per day
                </label>
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
                  {goalLoading ? "Saving…" : "Save goal"}
                </button>
                {goalDone && <p className="text-sm text-green-600">Saved.</p>}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
