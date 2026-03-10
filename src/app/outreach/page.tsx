"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Plus,
  Play,
  Pause,
  Search,
  Send,
  Eye,
  MessageSquare,
  AlertTriangle,
  X,
  Users,
  BarChart3,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";
import { DEFAULT_TEMPLATES } from "@/lib/email-templates";
import type { OutreachCampaign, OutreachEmail, SellerContact } from "@/lib/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string): string {
  switch (status) {
    case "sent":
      return "bg-[rgba(0,255,136,0.12)] text-[#00ff88]";
    case "opened":
      return "bg-[rgba(0,136,255,0.12)] text-[#0088ff]";
    case "replied":
      return "bg-[rgba(170,255,68,0.12)] text-[#aaff44]";
    case "bounced":
    case "failed":
      return "bg-[rgba(255,68,68,0.12)] text-[#ff4444]";
    case "pending":
      return "bg-[rgba(255,204,0,0.12)] text-[#ffcc00]";
    default:
      return "bg-[rgba(119,119,119,0.12)] text-[#777]";
  }
}

function campaignStatusBadge(status: string): string {
  switch (status) {
    case "active":
      return "bg-[rgba(0,255,136,0.12)] text-[#00ff88]";
    case "paused":
      return "bg-[rgba(255,204,0,0.12)] text-[#ffcc00]";
    case "completed":
      return "bg-[rgba(119,119,119,0.12)] text-[#777]";
    default:
      return "bg-[rgba(119,119,119,0.12)] text-[#555]";
  }
}

type Tab = "campaigns" | "contacts" | "emails";

function OutreachContent() {
  const { profile } = useAuthStore();
  const isInvestor = true; // Internal tool — no plan gating

  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [contacts, setContacts] = useState<SellerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [campaignsRes, emailsRes, contactsRes] = await Promise.all([
      supabase
        .from("outreach_campaigns")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("outreach_emails")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("seller_contacts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (campaignsRes.data) setCampaigns(campaignsRes.data);
    if (emailsRes.data) setEmails(emailsRes.data);
    if (contactsRes.data) setContacts(contactsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isInvestor) loadData();
    else setLoading(false);
  }, [isInvestor, loadData]);

  const toggleCampaignStatus = async (campaign: OutreachCampaign) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    const res = await fetch("/api/outreach/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaign.id, status: newStatus }),
    });
    if (res.ok) loadData();
  };

  // Stats
  const totalSent = emails.filter((e) => e.status !== "pending").length;
  const totalOpened = emails.filter((e) => e.status === "opened" || e.status === "replied").length;
  const totalReplied = emails.filter((e) => e.status === "replied").length;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0";

  if (!isInvestor) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <Mail size={48} className="text-[#555] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Seller Outreach</h2>
          <p className="text-sm text-[#777] mb-6">
            Contact property owners directly with personalized email campaigns.
            Skip trace sellers, send sequences, and track open/reply rates.
          </p>
          <a
            href="/pricing"
            className="inline-block px-6 py-3 bg-[#00ff88] text-black text-sm font-bold uppercase rounded-lg hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] transition-all"
          >
            Upgrade to Investor — $79/mo
          </a>
        </div>
      </div>
    );
  }

  const filteredContacts = contactSearch
    ? contacts.filter(
        (c) =>
          c.address.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.owner_name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.city.toLowerCase().includes(contactSearch.toLowerCase())
      )
    : contacts;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Outreach</h1>
          <p className="text-sm text-[#777]">Contact sellers & manage campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateCampaign(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-lg hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] transition-all"
        >
          <Plus size={14} />
          New Campaign
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Campaigns", value: campaigns.length.toString(), icon: Mail },
          { label: "Contacts", value: contacts.length.toString(), icon: Users },
          { label: "Emails Sent", value: totalSent.toString(), icon: Send },
          { label: "Open Rate", value: `${openRate}%`, icon: Eye },
          { label: "Reply Rate", value: `${replyRate}%`, icon: MessageSquare },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[#111] border border-[#222] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className="text-[#555]" />
              <span className="text-[10px] text-[#555] uppercase tracking-wider">
                {label}
              </span>
            </div>
            <span className="text-xl font-bold text-white font-[family-name:var(--font-mono)]">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#222]">
        {(
          [
            { key: "campaigns", label: "Campaigns", icon: BarChart3 },
            { key: "contacts", label: "Contacts", icon: Users },
            { key: "emails", label: "Email Log", icon: Mail },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? "border-[#00ff88] text-[#00ff88]"
                : "border-transparent text-[#777] hover:text-white"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-xs text-[#555]">Loading...</div>
      ) : (
        <>
          {/* Campaigns Tab */}
          {activeTab === "campaigns" && (
            <div>
              {campaigns.length === 0 ? (
                <div className="bg-[#111] border border-[#222] rounded-lg p-12 text-center">
                  <Mail size={32} className="text-[#555] mx-auto mb-3" />
                  <p className="text-sm text-[#555] mb-3">No campaigns yet</p>
                  <button
                    onClick={() => setShowCreateCampaign(true)}
                    className="text-xs text-[#00ff88] hover:underline"
                  >
                    Create your first campaign &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="bg-[#111] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm text-white font-medium">
                            {campaign.name}
                          </h3>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${campaignStatusBadge(campaign.status)}`}
                          >
                            {campaign.status}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleCampaignStatus(campaign)}
                          className="text-[#777] hover:text-[#00ff88] transition-colors"
                          title={campaign.status === "active" ? "Pause" : "Resume"}
                        >
                          {campaign.status === "active" ? (
                            <Pause size={14} />
                          ) : (
                            <Play size={14} />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-[#555] font-[family-name:var(--font-mono)]">
                        Subject: {campaign.template_subject}
                      </p>
                      <div className="text-[10px] text-[#555] mt-1 flex gap-3">
                        <span>Min score: {campaign.min_deal_score}</span>
                        <span>Auto-send: {campaign.auto_send ? "On" : "Off"}</span>
                        <span>Created: {formatDate(campaign.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === "contacts" && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]"
                  />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none"
                  />
                </div>
              </div>

              {filteredContacts.length === 0 ? (
                <div className="bg-[#111] border border-[#222] rounded-lg p-12 text-center">
                  <Users size={32} className="text-[#555] mx-auto mb-3" />
                  <p className="text-sm text-[#555] mb-1">No contacts yet</p>
                  <p className="text-xs text-[#555]">
                    Contacts are added when you use &quot;Contact Seller&quot; on deal cards
                  </p>
                </div>
              ) : (
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                          Owner
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                          Address
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                          Source
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map((contact) => (
                        <tr
                          key={contact.id}
                          className="border-t border-[#222] hover:bg-[rgba(0,255,136,0.03)]"
                        >
                          <td className="px-4 py-3 text-xs text-white">
                            {contact.owner_name || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#777]">
                            {contact.address}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#777] font-[family-name:var(--font-mono)]">
                            {contact.owner_email || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#777] font-[family-name:var(--font-mono)]">
                            {contact.owner_phone || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] text-[#555]">
                              {contact.skip_trace_source || "manual"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Emails Tab */}
          {activeTab === "emails" && (
            <div>
              {emails.length === 0 ? (
                <div className="bg-[#111] border border-[#222] rounded-lg p-12 text-center">
                  <Send size={32} className="text-[#555] mx-auto mb-3" />
                  <p className="text-sm text-[#555]">No emails sent yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className="bg-[#111] border border-[#222] rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white">{email.subject}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusBadge(email.status)}`}
                        >
                          {email.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#555] font-[family-name:var(--font-mono)] flex gap-3">
                        <span>Step {email.sequence_step}</span>
                        {email.sent_at && <span>Sent: {formatDate(email.sent_at)}</span>}
                        {email.opened_at && <span>Opened: {formatDate(email.opened_at)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Campaign Modal */}
      {showCreateCampaign && (
        <CreateCampaignModal
          onClose={() => setShowCreateCampaign(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [templateIdx, setTemplateIdx] = useState(0);
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [saving, setSaving] = useState(false);

  const template = DEFAULT_TEMPLATES[templateIdx];

  useEffect(() => {
    setCustomSubject(template.subject);
    setCustomBody(template.body);
  }, [template]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const res = await fetch("/api/outreach/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        template_subject: customSubject,
        template_body: customBody,
        status: "draft",
      }),
    });

    if (res.ok) {
      onCreated();
      onClose();
    }
    setSaving(false);
  };

  const inputClass =
    "w-full px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            New Campaign
          </h3>
          <button onClick={onClose} className="text-[#555] hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
              Campaign Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Cleveland Q1 Outreach"
            />
          </div>

          <div>
            <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-2">
              Start from Template
            </label>
            <div className="flex gap-2">
              {DEFAULT_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTemplateIdx(i)}
                  className={`text-[10px] px-3 py-1.5 rounded border transition-colors ${
                    templateIdx === i
                      ? "border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.08)]"
                      : "border-[#222] text-[#777] hover:border-[#555]"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
              Subject Line
            </label>
            <input
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
              Email Body
            </label>
            <textarea
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              rows={8}
              className={`${inputClass} resize-y font-[family-name:var(--font-mono)] text-xs`}
            />
            <p className="text-[10px] text-[#555] mt-1">
              Merge fields: {"{owner_name}"}, {"{address}"}, {"{price}"}, {"{monthly_rent}"}, {"{dscr}"}, {"{score}"}, {"{user_name}"}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-xs text-[#777] border border-[#222] hover:border-[#555] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-[#00ff88] text-black hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 transition-all"
            >
              {saving ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OutreachPage() {
  return (
    <AuthGuard>
      <OutreachContent />
    </AuthGuard>
  );
}
