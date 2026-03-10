"use client";

import { useState, useEffect } from "react";
import { X, Send, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";
import { DEFAULT_TEMPLATES, renderTemplate } from "@/lib/email-templates";
import type { OutreachCampaign } from "@/lib/types";

interface OutreachModalProps {
  deal: {
    address: string;
    price: number;
    monthly_rent: number;
    dscr: number;
    score: number;
    monthly_cash_flow: number;
    zip_code: string;
  };
  onClose: () => void;
}

export default function OutreachModal({ deal, onClose }: OutreachModalProps) {
  const { profile } = useAuthStore();
  const isInvestor = profile?.plan === "investor";

  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState(0);
  const [contactForm, setContactForm] = useState({
    owner_name: "",
    owner_email: "",
    owner_phone: "",
  });
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [showManualEntry, setShowManualEntry] = useState(true);

  useEffect(() => {
    if (!isInvestor) return;
    const supabase = createClient();
    supabase
      .from("outreach_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCampaigns(data);
      });
  }, [isInvestor]);

  if (!isInvestor) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-sm p-6 text-center">
          <Lock size={32} className="text-[#555] mx-auto mb-4" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
            Investor Plan Required
          </h3>
          <p className="text-xs text-[#777] mb-4">
            Seller outreach is available on the Investor plan ($79/mo).
            Contact property owners directly with personalized email campaigns.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs text-[#777] border border-[#222] hover:border-[#555] transition-colors"
            >
              Close
            </button>
            <a
              href="/pricing"
              className="flex-1 py-2 rounded-lg text-xs font-bold bg-[#00ff88] text-black text-center hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all"
            >
              Upgrade
            </a>
          </div>
        </div>
      </div>
    );
  }

  const template = DEFAULT_TEMPLATES[selectedTemplateIdx];
  const mergeVars: Record<string, string> = {
    address: deal.address,
    price: "$" + Math.round(deal.price).toLocaleString(),
    monthly_rent: "$" + Math.round(deal.monthly_rent).toLocaleString(),
    dscr: deal.dscr.toFixed(2),
    score: deal.score.toString(),
    cash_flow: "$" + Math.round(deal.monthly_cash_flow).toLocaleString(),
    owner_name: contactForm.owner_name || "[Owner Name]",
    user_name: profile?.full_name || "Investor",
  };

  const previewSubject = renderTemplate(template.subject, mergeVars);
  const previewBody = renderTemplate(template.body, mergeVars);

  const handleSend = async () => {
    if (!contactForm.owner_email || !contactForm.owner_name) return;
    setSendStatus("sending");

    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: contactForm.owner_email,
          to_name: contactForm.owner_name,
          subject: previewSubject,
          body: previewBody,
          deal_address: deal.address,
          deal_zip: deal.zip_code,
          campaign_id: campaigns[0]?.id ?? null,
        }),
      });

      if (res.ok) {
        setSendStatus("sent");
      } else {
        setSendStatus("error");
      }
    } catch {
      setSendStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Contact Seller
          </h3>
          <button onClick={onClose} className="text-[#555] hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Deal info */}
        <div className="bg-[#1a1a1a] rounded-lg p-3 mb-4 text-xs">
          <p className="text-white font-medium">{deal.address}</p>
          <p className="text-[#555] font-[family-name:var(--font-mono)] mt-1">
            ${Math.round(deal.price).toLocaleString()} &middot; DSCR {deal.dscr.toFixed(2)} &middot; Score {deal.score}
          </p>
        </div>

        {/* Contact info */}
        {showManualEntry ? (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#555] uppercase tracking-wider">
                Seller Contact (Manual Entry)
              </span>
              <button
                disabled
                className="text-[10px] text-[#555] border border-[#222] rounded px-2 py-0.5 cursor-not-allowed"
                title="Coming soon — requires API key"
              >
                Auto Skip Trace — Coming Soon
              </button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Owner Name"
                value={contactForm.owner_name}
                onChange={(e) => setContactForm({ ...contactForm, owner_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none"
              />
              <input
                type="email"
                placeholder="Owner Email"
                value={contactForm.owner_email}
                onChange={(e) => setContactForm({ ...contactForm, owner_email: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Owner Phone (optional)"
                value={contactForm.owner_phone}
                onChange={(e) => setContactForm({ ...contactForm, owner_phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowManualEntry(true)}
            className="text-xs text-[#00ff88] hover:underline mb-4 block"
          >
            + Enter contact manually
          </button>
        )}

        {/* Template selector */}
        <div className="mb-4">
          <span className="block text-[10px] text-[#555] uppercase tracking-wider mb-2">
            Email Template
          </span>
          <div className="flex gap-2">
            {DEFAULT_TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => setSelectedTemplateIdx(i)}
                className={`text-[10px] px-3 py-1.5 rounded border transition-colors ${
                  selectedTemplateIdx === i
                    ? "border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.08)]"
                    : "border-[#222] text-[#777] hover:border-[#555]"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="mb-4">
          <span className="block text-[10px] text-[#555] uppercase tracking-wider mb-2">
            Preview
          </span>
          <div className="bg-[#0d0d0d] border border-[#222] rounded-lg p-4 text-xs">
            <p className="text-[#777] mb-1">
              <span className="text-[#555]">Subject:</span> {previewSubject}
            </p>
            <div className="border-t border-[#222] mt-2 pt-2 text-[#e0e0e0] whitespace-pre-wrap">
              {previewBody}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-xs text-[#777] border border-[#222] hover:border-[#555] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!contactForm.owner_email || !contactForm.owner_name || sendStatus === "sending" || sendStatus === "sent"}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-[#00ff88] text-black hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            <Send size={12} />
            {sendStatus === "sending"
              ? "Sending..."
              : sendStatus === "sent"
                ? "Sent!"
                : sendStatus === "error"
                  ? "Retry"
                  : "Send Email"}
          </button>
        </div>
        {sendStatus === "error" && (
          <p className="text-xs text-[#ff4444] mt-2 text-center">
            Failed to send. Resend API key may not be configured.
          </p>
        )}
        {sendStatus === "sent" && (
          <p className="text-xs text-[#00ff88] mt-2 text-center">
            Email queued successfully!
          </p>
        )}
      </div>
    </div>
  );
}
