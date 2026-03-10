"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";
import type { Profile, AlertPreferences } from "@/lib/types";

function SettingsContent() {
  const { user, profile, setProfile } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Alert preferences state
  const [alertPrefs, setAlertPrefs] = useState<AlertPreferences | null>(null);
  const [alertLoading, setAlertLoading] = useState(true);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [alertEmail, setAlertEmail] = useState("");
  const [digestFrequency, setDigestFrequency] = useState<"instant" | "daily" | "weekly">("instant");
  const [minDealScore, setMinDealScore] = useState(70);
  const [priceDropThreshold, setPriceDropThreshold] = useState(5);
  const [notifyNewDeals, setNotifyNewDeals] = useState(true);
  const [notifyPriceDrops, setNotifyPriceDrops] = useState(true);
  const [notifyScoreChanges, setNotifyScoreChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      loadAlertPrefs();
    }
  }, [user]);

  async function loadAlertPrefs() {
    const supabase = createClient();
    const { data } = await supabase
      .from("alert_preferences")
      .select("*")
      .eq("user_id", user!.id)
      .single();

    if (data) {
      const prefs = data as AlertPreferences;
      setAlertPrefs(prefs);
      setEmailEnabled(prefs.email_enabled);
      setAlertEmail(prefs.email_address ?? user?.email ?? "");
      setDigestFrequency(prefs.digest_frequency);
      setMinDealScore(prefs.min_deal_score);
      setPriceDropThreshold(prefs.price_drop_threshold);
      setNotifyNewDeals(prefs.notify_new_deals);
      setNotifyPriceDrops(prefs.notify_price_drops);
      setNotifyScoreChanges(prefs.notify_score_changes);
    } else {
      setAlertEmail(user?.email ?? "");
    }
    setAlertLoading(false);
  }

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

  const handleAlertSave = async () => {
    if (!user) return;
    setAlertSaving(true);

    const supabase = createClient();
    const prefsData = {
      user_id: user.id,
      email_enabled: emailEnabled,
      email_address: alertEmail,
      digest_frequency: digestFrequency,
      min_deal_score: minDealScore,
      price_drop_threshold: priceDropThreshold,
      notify_new_deals: notifyNewDeals,
      notify_price_drops: notifyPriceDrops,
      notify_score_changes: notifyScoreChanges,
      updated_at: new Date().toISOString(),
    };

    if (alertPrefs) {
      const { data } = await supabase
        .from("alert_preferences")
        .update(prefsData)
        .eq("id", alertPrefs.id)
        .select()
        .single();
      if (data) setAlertPrefs(data as AlertPreferences);
    } else {
      const { data } = await supabase
        .from("alert_preferences")
        .insert(prefsData)
        .select()
        .single();
      if (data) setAlertPrefs(data as AlertPreferences);
    }

    setAlertSaving(false);
    setAlertSaved(true);
    setTimeout(() => setAlertSaved(false), 2000);
  };

  const planBadgeColor =
    profile?.plan === "investor"
      ? "bg-[rgba(170,255,68,0.12)] text-[#aaff44]"
      : profile?.plan === "pro"
        ? "bg-[rgba(0,255,136,0.12)] text-[#00ff88]"
        : "bg-[rgba(119,119,119,0.12)] text-[#777]";

  const isPaidPlan = profile?.plan === "pro" || profile?.plan === "investor";

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

      {/* Email Alerts Section */}
      <div className="bg-[#111] border border-[#222] rounded-lg p-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Email Alerts
        </h2>

        {!isPaidPlan ? (
          <div className="bg-[rgba(255,204,0,0.08)] border border-[rgba(255,204,0,0.2)] rounded-lg p-3 text-xs text-[#ffcc00]">
            Alerts require a Pro or Investor plan.{" "}
            <a href="/pricing" className="underline hover:no-underline">
              Upgrade now
            </a>
          </div>
        ) : alertLoading ? (
          <div className="text-xs text-[#555]">Loading preferences...</div>
        ) : (
          <div className="space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white">Enable Email Alerts</div>
                <div className="text-xs text-[#555]">Receive notifications about new deals and price changes</div>
              </div>
              <button
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  emailEnabled ? "bg-[#00ff88]" : "bg-[#333]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    emailEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {emailEnabled && (
              <>
                {/* Email address */}
                <div>
                  <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
                    Alert Email
                  </label>
                  <input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none transition-colors"
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
                    Frequency
                  </label>
                  <div className="flex gap-2">
                    {(["instant", "daily", "weekly"] as const).map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setDigestFrequency(freq)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                          digestFrequency === freq
                            ? "bg-[rgba(0,255,136,0.12)] text-[#00ff88] border border-[rgba(0,255,136,0.3)]"
                            : "bg-[#1a1a1a] text-[#777] border border-[#222] hover:text-white"
                        }`}
                      >
                        {freq === "instant" ? "Instant" : freq === "daily" ? "Daily Digest" : "Weekly Digest"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min deal score slider */}
                <div>
                  <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
                    Minimum Deal Score: <span className="text-[#00ff88] font-[family-name:var(--font-mono)]">{minDealScore}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={minDealScore}
                    onChange={(e) => setMinDealScore(Number(e.target.value))}
                    className="w-full accent-[#00ff88]"
                  />
                  <div className="flex justify-between text-[10px] text-[#555] mt-1">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Price drop threshold */}
                <div>
                  <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
                    Price Drop Threshold: <span className="text-[#00ff88] font-[family-name:var(--font-mono)]">{priceDropThreshold}%</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={priceDropThreshold}
                    onChange={(e) => setPriceDropThreshold(Number(e.target.value))}
                    className="w-full accent-[#00ff88]"
                  />
                  <div className="flex justify-between text-[10px] text-[#555] mt-1">
                    <span>1%</span>
                    <span>10%</span>
                    <span>20%</span>
                  </div>
                </div>

                {/* Notification types */}
                <div>
                  <label className="block text-xs text-[#777] uppercase tracking-wider mb-2">
                    Notification Types
                  </label>
                  <div className="space-y-2">
                    {[
                      { label: "New Deals", checked: notifyNewDeals, setter: setNotifyNewDeals },
                      { label: "Price Drops", checked: notifyPriceDrops, setter: setNotifyPriceDrops },
                      { label: "Score Changes", checked: notifyScoreChanges, setter: setNotifyScoreChanges },
                    ].map(({ label, checked, setter }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setter(e.target.checked)}
                          className="accent-[#00ff88] w-3.5 h-3.5"
                        />
                        <span className="text-sm text-[#e0e0e0]">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAlertSave}
                    disabled={alertSaving}
                    className="px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 transition-all"
                  >
                    {alertSaving ? "Saving..." : "Save Alert Preferences"}
                  </button>
                  {alertSaved && (
                    <span className="text-xs text-[#00ff88]">Saved!</span>
                  )}
                </div>
              </>
            )}
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
