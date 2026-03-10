"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";
import type { Profile } from "@/lib/types";

function SettingsContent() {
  const { user, profile, setProfile } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    if (data) setProfile(data as Profile);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const planBadgeColor =
    profile?.plan === "investor"
      ? "bg-[rgba(170,255,68,0.12)] text-[#aaff44]"
      : profile?.plan === "pro"
        ? "bg-[rgba(0,255,136,0.12)] text-[#00ff88]"
        : "bg-[rgba(119,119,119,0.12)] text-[#777]";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-[#777]">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-[#111] border border-[#222] rounded-lg p-6 mb-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Profile
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#222] rounded-lg text-[#555] text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 transition-all"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saved && (
              <span className="text-xs text-[#00ff88]">Saved!</span>
            )}
          </div>
        </div>
      </div>

      {/* Plan Section */}
      <div className="bg-[#111] border border-[#222] rounded-lg p-6 mb-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Plan
        </h2>

        <div className="flex items-center gap-3 mb-4">
          <span
            className={`text-xs font-bold uppercase px-3 py-1 rounded ${planBadgeColor}`}
          >
            {profile?.plan ?? "free"}
          </span>
          {profile?.plan === "free" && (
            <a
              href="/pricing"
              className="text-xs text-[#00ff88] hover:underline"
            >
              Upgrade &rarr;
            </a>
          )}
        </div>

        <div className="text-xs text-[#555] font-[family-name:var(--font-mono)] space-y-1">
          <p>
            Scans today: {profile?.daily_scans_used ?? 0}
            {profile?.plan === "free" ? " / 3" : " (unlimited)"}
          </p>
          {profile?.stripe_subscription_id && (
            <p>
              Subscription: {profile.stripe_subscription_id}
            </p>
          )}
        </div>
      </div>

      {/* Alert Preferences */}
      <div className="bg-[#111] border border-[#222] rounded-lg p-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Alert Preferences
        </h2>

        <p className="text-xs text-[#555]">
          Configure alerts per saved search from the{" "}
          <a href="/dashboard" className="text-[#00ff88] hover:underline">
            Dashboard
          </a>
          . Alert types include instant, daily digest, and weekly summary.
        </p>

        {profile?.plan === "free" && (
          <div className="mt-3 bg-[rgba(255,204,0,0.08)] border border-[rgba(255,204,0,0.2)] rounded-lg p-3 text-xs text-[#ffcc00]">
            Alerts require a Pro or Investor plan.{" "}
            <a href="/pricing" className="underline hover:no-underline">
              Upgrade now
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
