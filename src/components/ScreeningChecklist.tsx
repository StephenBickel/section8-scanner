"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ExternalLink, AlertTriangle } from "lucide-react";
import type { TenantApplication, PropertyListing } from "@/lib/types";

interface ScreeningChecklistProps {
  application: TenantApplication;
  listing?: PropertyListing | null;
  onUpdate: (updates: Partial<TenantApplication>) => void;
}

interface CheckItem {
  key: string;
  label: string;
  description: string;
  link?: string;
  linkLabel?: string;
  auto?: (app: TenantApplication, listing?: PropertyListing | null) => boolean | null;
}

const CHECKLIST_ITEMS: CheckItem[] = [
  {
    key: "background_check",
    label: "Background Check",
    description: "Run background check via RentSpree ($50, tenant pays)",
    link: "https://www.rentspree.com",
    linkLabel: "Open RentSpree",
  },
  {
    key: "eviction_check",
    label: "Eviction History Check",
    description: "Verify no prior evictions via RentSpree",
    link: "https://www.rentspree.com",
    linkLabel: "Open RentSpree",
  },
  {
    key: "voucher_letter",
    label: "Voucher Letter Verified",
    description: "Confirm voucher letter is valid and current",
  },
  {
    key: "voucher_covers_rent",
    label: "Voucher Amount Covers Rent",
    description: "Verify voucher amount meets or exceeds monthly rent",
    auto: (app, listing) => {
      if (app.voucher_amount && listing?.monthly_rent) {
        return Number(app.voucher_amount) >= Number(listing.monthly_rent);
      }
      return null;
    },
  },
  {
    key: "income_verification",
    label: "Income Verification (Tenant Portion)",
    description: "Verify tenant can cover their portion of rent if applicable",
  },
  {
    key: "pha_inspection",
    label: "PHA Inspection Scheduled",
    description: "Schedule and pass Housing Quality Standards (HQS) inspection",
  },
  {
    key: "lease_signed",
    label: "Lease Executed",
    description: "Lease signed by all parties with HUD Tenancy Addendum",
  },
];

export default function ScreeningChecklist({ application, listing, onUpdate }: ScreeningChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (application.background_check_status === "passed") initial.background_check = true;
    if (application.eviction_check_status === "passed") initial.eviction_check = true;
    if (application.status === "voucher_verified" || application.status === "approved" || application.status === "lease_signed") {
      initial.voucher_letter = true;
      initial.voucher_covers_rent = true;
    }
    if (application.status === "approved" || application.status === "lease_signed") {
      initial.income_verification = true;
      initial.pha_inspection = true;
    }
    if (application.status === "lease_signed") {
      initial.lease_signed = true;
    }
    return initial;
  });

  const [inspectionDate, setInspectionDate] = useState("");
  const [leaseDate, setLeaseDate] = useState("");

  function toggleItem(key: string) {
    const newChecked = { ...checked, [key]: !checked[key] };
    setChecked(newChecked);

    // Map checklist state to application updates
    const updates: Partial<TenantApplication> = {};

    if (key === "background_check") {
      updates.background_check_status = newChecked.background_check ? "passed" : "not_started";
    }
    if (key === "eviction_check") {
      updates.eviction_check_status = newChecked.eviction_check ? "passed" : "not_started";
    }

    // Auto-update status based on progress
    const completedCount = Object.values(newChecked).filter(Boolean).length;
    if (newChecked.lease_signed) {
      updates.status = "lease_signed";
    } else if (completedCount >= 5) {
      updates.status = "approved";
    } else if (newChecked.voucher_letter && newChecked.voucher_covers_rent) {
      updates.status = "voucher_verified";
    } else if (completedCount >= 1) {
      updates.status = "screening";
    }

    onUpdate(updates);
  }

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalItems = CHECKLIST_ITEMS.length;
  const progress = Math.round((completedCount / totalItems) * 100);

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#555] uppercase tracking-wider">Screening Progress</span>
          <span className="text-xs font-[family-name:var(--font-mono)] text-[#00ff88]">
            {completedCount}/{totalItems} ({progress}%)
          </span>
        </div>
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00ff88] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {CHECKLIST_ITEMS.map((item) => {
          const isChecked = checked[item.key] || false;
          const autoResult = item.auto?.(application, listing);

          return (
            <div
              key={item.key}
              className={`border rounded-lg p-3 transition-colors ${
                isChecked ? "border-[#00ff88]/30 bg-[rgba(0,255,136,0.04)]" : "border-[#222] bg-[#0a0a0a]"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleItem(item.key)}
                  className="mt-0.5 shrink-0"
                >
                  {isChecked ? (
                    <CheckCircle2 size={16} className="text-[#00ff88]" />
                  ) : (
                    <Circle size={16} className="text-[#555]" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${isChecked ? "text-[#00ff88]" : "text-[#e0e0e0]"}`}>
                      {item.label}
                    </span>
                    {autoResult !== null && autoResult !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        autoResult
                          ? "bg-[rgba(0,255,136,0.12)] text-[#00ff88]"
                          : "bg-[rgba(255,68,68,0.12)] text-[#ff4444]"
                      }`}>
                        {autoResult ? "PASS" : "FAIL"}
                      </span>
                    )}
                    {autoResult === false && (
                      <AlertTriangle size={12} className="text-[#ff4444]" />
                    )}
                  </div>
                  <p className="text-[10px] text-[#555] mt-0.5">{item.description}</p>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-[#00ff88] hover:underline mt-1"
                    >
                      {item.linkLabel} <ExternalLink size={9} />
                    </a>
                  )}
                  {item.key === "pha_inspection" && isChecked && (
                    <input
                      type="date"
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="mt-2 bg-[#111] border border-[#222] rounded px-2 py-1 text-[10px] text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="Inspection date"
                    />
                  )}
                  {item.key === "lease_signed" && isChecked && (
                    <input
                      type="date"
                      value={leaseDate}
                      onChange={(e) => setLeaseDate(e.target.value)}
                      className="mt-2 bg-[#111] border border-[#222] rounded px-2 py-1 text-[10px] text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="Lease date"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
