"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Plus, Copy, Check, ChevronDown, ChevronRight,
  Globe, Phone, Mail, ExternalLink, Building2, Users, ClipboardList,
  FileText,
} from "lucide-react";
// AuthGuard removed — internal tool
import CreateListingModal from "@/components/CreateListingModal";
import AddApplicationModal from "@/components/AddApplicationModal";
import ScreeningChecklist from "@/components/ScreeningChecklist";
import { LEASE_RESOURCES } from "@/lib/lease-resources";
import type { HousingAuthority, PropertyListing, TenantApplication } from "@/lib/types";

type Tab = "find" | "listings" | "applications";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-[rgba(119,119,119,0.12)] text-[#777]",
  active: "bg-[rgba(0,255,136,0.12)] text-[#00ff88]",
  rented: "bg-[rgba(170,255,68,0.12)] text-[#aaff44]",
  archived: "bg-[rgba(85,85,85,0.12)] text-[#555]",
  applied: "bg-[rgba(119,119,119,0.12)] text-[#777]",
  screening: "bg-[rgba(255,204,0,0.12)] text-[#ffcc00]",
  voucher_verified: "bg-[rgba(0,200,255,0.12)] text-[#00c8ff]",
  approved: "bg-[rgba(0,255,136,0.12)] text-[#00ff88]",
  lease_signed: "bg-[rgba(170,255,68,0.12)] text-[#aaff44]",
  rejected: "bg-[rgba(255,68,68,0.12)] text-[#ff4444]",
  withdrawn: "bg-[rgba(85,85,85,0.12)] text-[#555]",
};

const WAITLIST_COLORS: Record<string, string> = {
  open: "bg-[rgba(0,255,136,0.12)] text-[#00ff88]",
  closed: "bg-[rgba(255,68,68,0.12)] text-[#ff4444]",
  unknown: "bg-[rgba(119,119,119,0.12)] text-[#777]",
};

const PLATFORM_LABELS: Record<string, string> = {
  gosection8_listing: "GoSection8",
  affordablehousing_listing: "AffordableHousing.com",
  socialserve_listing: "SocialServe",
  craigslist_listing: "Craigslist",
  facebook_listing: "Facebook Marketplace",
};

const APP_STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  voucher_verified: "Voucher Verified",
  approved: "Approved",
  lease_signed: "Lease Signed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function TenantsContent() {
  const [tab, setTab] = useState<Tab>("find");
  const [phas, setPhas] = useState<HousingAuthority[]>([]);
  const [phaSearch, setPhaSearch] = useState("");
  const [phaLoading, setPhaLoading] = useState(false);
  const [expandedPha, setExpandedPha] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [expandedListing, setExpandedListing] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editListing, setEditListing] = useState<PropertyListing | null>(null);

  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [addAppOpen, setAddAppOpen] = useState(false);

  const loadPhas = useCallback(async () => {
    setPhaLoading(true);
    const params = new URLSearchParams();
    if (phaSearch) {
      // Check if 2-letter state abbreviation
      if (/^[A-Za-z]{2}$/.test(phaSearch.trim())) {
        params.set("state", phaSearch.trim());
      } else {
        params.set("city", phaSearch.trim());
      }
    }
    const res = await fetch(`/api/tenants/pha?${params}`);
    const data = await res.json();
    if (Array.isArray(data)) setPhas(data);
    setPhaLoading(false);
  }, [phaSearch]);

  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    const res = await fetch("/api/tenants/listings");
    const data = await res.json();
    if (Array.isArray(data)) setListings(data);
    setListingsLoading(false);
  }, []);

  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    const res = await fetch("/api/tenants/applications");
    const data = await res.json();
    if (Array.isArray(data)) setApplications(data);
    setAppsLoading(false);
  }, []);

  useEffect(() => {
    loadPhas();
  }, [loadPhas]);

  useEffect(() => {
    if (tab === "listings") loadListings();
    if (tab === "applications") loadApplications();
  }, [tab, loadListings, loadApplications]);

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function updateApplication(appId: string, updates: Partial<TenantApplication>) {
    await fetch("/api/tenants/applications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: appId, ...updates }),
    });
    setApplications((apps) =>
      apps.map((a) => (a.id === appId ? { ...a, ...updates } : a))
    );
  }

  async function updateListingStatus(listingId: string, status: string) {
    await fetch("/api/tenants/listings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: listingId, listing_status: status }),
    });
    setListings((ls) =>
      ls.map((l) => (l.id === listingId ? { ...l, listing_status: status as PropertyListing["listing_status"] } : l))
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "find", label: "Find Tenants", icon: Search },
    { key: "listings", label: "My Listings", icon: Building2 },
    { key: "applications", label: "Applications", icon: ClipboardList },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Tenant Finder</h1>
        <p className="text-sm text-[#777]">PHA directory, listing generator, and application tracker</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#222] overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? "border-[#00ff88] text-[#00ff88]"
                : "border-transparent text-[#777] hover:text-white"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Find Tenants */}
      {tab === "find" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                value={phaSearch}
                onChange={(e) => setPhaSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadPhas()}
                className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                placeholder="Search by city or state (e.g. Cleveland or OH)"
              />
            </div>
            <button
              onClick={loadPhas}
              className="px-4 py-2 text-xs font-bold text-black bg-[#00ff88] rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all shrink-0"
            >
              Search
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2 text-xs font-medium text-[#00ff88] border border-[#00ff88]/30 rounded-lg hover:bg-[rgba(0,255,136,0.08)] transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Plus size={12} />
              Create Listing
            </button>
          </div>

          {/* PHA Directory */}
          {phaLoading ? (
            <div className="text-xs text-[#555] py-8 text-center">Loading housing authorities...</div>
          ) : phas.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-lg p-8 text-center">
              <p className="text-sm text-[#555]">No housing authorities found</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">
                {phas.length} Housing Authorities
              </div>
              {phas.map((pha) => {
                const expanded = expandedPha === pha.id;
                return (
                  <div
                    key={pha.id}
                    className="bg-[#111] border border-[#222] rounded-lg hover:border-[#333] transition-colors"
                  >
                    <button
                      onClick={() => setExpandedPha(expanded ? null : pha.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      {expanded ? (
                        <ChevronDown size={14} className="text-[#555] shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-[#555] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white font-medium truncate">
                            {pha.name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${WAITLIST_COLORS[pha.waitlist_status]}`}>
                            {pha.waitlist_status}
                          </span>
                        </div>
                        <span className="text-xs text-[#555] font-[family-name:var(--font-mono)]">
                          {pha.city}, {pha.state}
                        </span>
                      </div>
                      {pha.phone && (
                        <span className="text-xs text-[#777] hidden md:inline font-[family-name:var(--font-mono)]">
                          {pha.phone}
                        </span>
                      )}
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {pha.phone && (
                            <div className="flex items-center gap-2 text-xs text-[#e0e0e0]">
                              <Phone size={12} className="text-[#555]" />
                              <a href={`tel:${pha.phone}`} className="hover:text-[#00ff88]">{pha.phone}</a>
                            </div>
                          )}
                          {pha.email && (
                            <div className="flex items-center gap-2 text-xs text-[#e0e0e0]">
                              <Mail size={12} className="text-[#555]" />
                              <div className="flex items-center gap-1.5">
                                <a href={`mailto:${pha.email}`} className="hover:text-[#00ff88]">{pha.email}</a>
                                <button
                                  onClick={() => copyToClipboard(pha.email!, `email-${pha.id}`)}
                                  className="text-[#555] hover:text-[#00ff88] transition-colors"
                                  title="Copy email"
                                >
                                  {copiedId === `email-${pha.id}` ? <Check size={10} className="text-[#00ff88]" /> : <Copy size={10} />}
                                </button>
                              </div>
                            </div>
                          )}
                          {pha.website && (
                            <div className="flex items-center gap-2 text-xs text-[#e0e0e0]">
                              <Globe size={12} className="text-[#555]" />
                              <a
                                href={pha.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#00ff88] flex items-center gap-1"
                              >
                                Website <ExternalLink size={10} />
                              </a>
                            </div>
                          )}
                          {pha.address && (
                            <div className="flex items-center gap-2 text-xs text-[#e0e0e0]">
                              <Building2 size={12} className="text-[#555]" />
                              {pha.address}
                            </div>
                          )}
                        </div>
                        {pha.voucher_types && pha.voucher_types.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pha.voucher_types.map((v) => (
                              <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.08)] text-[#00ff88]">
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                        {pha.notes && (
                          <p className="text-xs text-[#777] mt-1">{pha.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Listings */}
      {tab === "listings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#555] uppercase tracking-wider">
              {listings.length} Listings
            </span>
            <button
              onClick={() => { setEditListing(null); setCreateOpen(true); }}
              className="px-3 py-1.5 text-xs font-medium text-[#00ff88] border border-[#00ff88]/30 rounded-lg hover:bg-[rgba(0,255,136,0.08)] transition-colors flex items-center gap-1.5"
            >
              <Plus size={12} />
              New Listing
            </button>
          </div>

          {listingsLoading ? (
            <div className="text-xs text-[#555] py-8 text-center">Loading listings...</div>
          ) : listings.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-lg p-8 text-center">
              <p className="text-sm text-[#555] mb-3">No listings yet</p>
              <button
                onClick={() => setCreateOpen(true)}
                className="text-xs text-[#00ff88] hover:underline"
              >
                Create your first listing
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {listings.map((listing) => {
                const expanded = expandedListing === listing.id;
                const platforms = Object.entries(PLATFORM_LABELS);
                return (
                  <div
                    key={listing.id}
                    className="bg-[#111] border border-[#222] rounded-lg hover:border-[#333] transition-colors"
                  >
                    <button
                      onClick={() => setExpandedListing(expanded ? null : listing.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      {expanded ? (
                        <ChevronDown size={14} className="text-[#555] shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-[#555] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white font-medium truncate">
                            {listing.address}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[listing.listing_status]}`}>
                            {listing.listing_status}
                          </span>
                        </div>
                        <span className="text-xs text-[#555] font-[family-name:var(--font-mono)]">
                          {listing.beds}bd/{listing.baths}ba &middot; ${Number(listing.monthly_rent).toLocaleString()}/mo &middot; {listing.city}, {listing.state}
                        </span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3 space-y-4">
                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => { setEditListing(listing); setCreateOpen(true); }}
                            className="text-[10px] px-2 py-1 rounded border border-[#333] text-[#777] hover:border-[#00ff88] hover:text-[#00ff88] transition-colors"
                          >
                            Edit
                          </button>
                          {(["draft", "active", "rented", "archived"] as const).map((s) => (
                            s !== listing.listing_status && (
                              <button
                                key={s}
                                onClick={() => updateListingStatus(listing.id, s)}
                                className="text-[10px] px-2 py-1 rounded border border-[#333] text-[#777] hover:border-[#555] transition-colors capitalize"
                              >
                                Mark {s}
                              </button>
                            )
                          ))}
                        </div>

                        {/* Platform listings */}
                        <div>
                          <span className="text-[10px] text-[#555] uppercase tracking-wider block mb-2">
                            Platform Listings
                          </span>
                          <div className="space-y-2">
                            {platforms.map(([key, label]) => {
                              const content = listing[key as keyof PropertyListing] as string | null;
                              if (!content) return null;
                              return (
                                <div key={key} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-[#e0e0e0]">{label}</span>
                                    <button
                                      onClick={() => copyToClipboard(content, `${listing.id}-${key}`)}
                                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[#333] text-[#777] hover:border-[#00ff88] hover:text-[#00ff88] transition-colors"
                                    >
                                      {copiedId === `${listing.id}-${key}` ? (
                                        <><Check size={10} className="text-[#00ff88]" /> Copied!</>
                                      ) : (
                                        <><Copy size={10} /> Copy</>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="text-[10px] text-[#777] whitespace-pre-wrap font-[family-name:var(--font-mono)] max-h-32 overflow-y-auto">
                                    {content}
                                  </pre>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Applications */}
      {tab === "applications" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#555] uppercase tracking-wider">
              {applications.length} Applications
            </span>
            <button
              onClick={() => setAddAppOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-[#00ff88] border border-[#00ff88]/30 rounded-lg hover:bg-[rgba(0,255,136,0.08)] transition-colors flex items-center gap-1.5"
            >
              <Plus size={12} />
              Add Application
            </button>
          </div>

          {/* Status pipeline summary */}
          {applications.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {(["applied", "screening", "voucher_verified", "approved", "lease_signed"] as const).map((status) => {
                const count = applications.filter((a) => a.status === status).length;
                return (
                  <div key={status} className="bg-[#111] border border-[#222] rounded-lg p-3 text-center">
                    <span className="text-lg font-bold text-white font-[family-name:var(--font-mono)] block">
                      {count}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[status]}`}>
                      {APP_STATUS_LABELS[status]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {appsLoading ? (
            <div className="text-xs text-[#555] py-8 text-center">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-lg p-8 text-center">
              <p className="text-sm text-[#555] mb-3">No applications yet</p>
              <button
                onClick={() => setAddAppOpen(true)}
                className="text-xs text-[#00ff88] hover:underline"
              >
                Add your first application
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {applications.map((app) => {
                const expanded = expandedApp === app.id;
                const linkedListing = listings.find((l) => l.id === app.listing_id);
                return (
                  <div
                    key={app.id}
                    className="bg-[#111] border border-[#222] rounded-lg hover:border-[#333] transition-colors"
                  >
                    <button
                      onClick={() => setExpandedApp(expanded ? null : app.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      {expanded ? (
                        <ChevronDown size={14} className="text-[#555] shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-[#555] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white font-medium">
                            {app.applicant_name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[app.status]}`}>
                            {APP_STATUS_LABELS[app.status]}
                          </span>
                        </div>
                        <div className="text-xs text-[#555] font-[family-name:var(--font-mono)] flex flex-wrap gap-x-3">
                          {app.voucher_amount && (
                            <span>Voucher: ${Number(app.voucher_amount).toLocaleString()}</span>
                          )}
                          {app.pha_name && <span>PHA: {app.pha_name}</span>}
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3 space-y-4">
                        {/* Contact info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {app.applicant_email && (
                            <div className="flex items-center gap-2 text-xs text-[#e0e0e0]">
                              <Mail size={12} className="text-[#555]" />
                              <a href={`mailto:${app.applicant_email}`} className="hover:text-[#00ff88]">
                                {app.applicant_email}
                              </a>
                            </div>
                          )}
                          {app.applicant_phone && (
                            <div className="flex items-center gap-2 text-xs text-[#e0e0e0]">
                              <Phone size={12} className="text-[#555]" />
                              <a href={`tel:${app.applicant_phone}`} className="hover:text-[#00ff88]">
                                {app.applicant_phone}
                              </a>
                            </div>
                          )}
                          {app.household_size && (
                            <div className="flex items-center gap-2 text-xs text-[#e0e0e0]">
                              <Users size={12} className="text-[#555]" />
                              Household: {app.household_size}
                            </div>
                          )}
                        </div>

                        {/* Voucher details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {app.voucher_amount && (
                            <div>
                              <span className="text-[10px] text-[#555] uppercase tracking-wider block">Voucher</span>
                              <span className="text-sm text-white font-[family-name:var(--font-mono)]">
                                ${Number(app.voucher_amount).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {app.voucher_expiry && (
                            <div>
                              <span className="text-[10px] text-[#555] uppercase tracking-wider block">Expires</span>
                              <span className="text-sm text-white font-[family-name:var(--font-mono)]">
                                {new Date(app.voucher_expiry).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {app.move_in_date && (
                            <div>
                              <span className="text-[10px] text-[#555] uppercase tracking-wider block">Move-in</span>
                              <span className="text-sm text-white font-[family-name:var(--font-mono)]">
                                {new Date(app.move_in_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {app.pha_contact && (
                            <div>
                              <span className="text-[10px] text-[#555] uppercase tracking-wider block">PHA Contact</span>
                              <span className="text-xs text-white">{app.pha_contact}</span>
                            </div>
                          )}
                        </div>

                        {app.notes && (
                          <div>
                            <span className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Notes</span>
                            <p className="text-xs text-[#777]">{app.notes}</p>
                          </div>
                        )}

                        {/* Screening Checklist */}
                        <div className="border-t border-[#1a1a1a] pt-3">
                          <span className="text-[10px] text-[#555] uppercase tracking-wider block mb-3">
                            Screening Checklist
                          </span>
                          <ScreeningChecklist
                            application={app}
                            listing={linkedListing}
                            onUpdate={(updates) => updateApplication(app.id, updates)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lease Resources */}
      <div className="mt-8 bg-[#111] border border-[#222] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-[#00ff88]" />
          <span className="text-[10px] text-[#777] uppercase tracking-wider">
            Section 8 Lease Resources
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {LEASE_RESOURCES.map((resource) => (
            <a
              key={resource.title}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 hover:border-[#333] transition-colors block"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-[#e0e0e0]">{resource.title}</span>
                <ExternalLink size={10} className="text-[#555] shrink-0 mt-0.5" />
              </div>
              <p className="text-[10px] text-[#555] mt-1">{resource.description}</p>
              <span className="text-[10px] text-[#00ff88]/60 uppercase mt-1 block">{resource.category}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CreateListingModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditListing(null); }}
        onCreated={(listing) => {
          if (editListing) {
            setListings((ls) => ls.map((l) => (l.id === listing.id ? listing : l)));
          } else {
            setListings((ls) => [listing, ...ls]);
          }
        }}
        editListing={editListing}
      />
      <AddApplicationModal
        open={addAppOpen}
        onClose={() => setAddAppOpen(false)}
        onCreated={(app) => setApplications((a) => [app, ...a])}
        listings={listings}
      />
    </div>
  );
}

export default function TenantsPage() {
  return (
      <TenantsContent />
  );
}
