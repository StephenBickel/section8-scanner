"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { TenantApplication, PropertyListing } from "@/lib/types";

interface AddApplicationModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (app: TenantApplication) => void;
  listings: PropertyListing[];
}

export default function AddApplicationModal({ open, onClose, onCreated, listings }: AddApplicationModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    listing_id: "",
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    voucher_amount: "",
    voucher_expiry: "",
    pha_name: "",
    pha_contact: "",
    household_size: "",
    move_in_date: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      listing_id: form.listing_id || null,
      applicant_name: form.applicant_name,
      applicant_email: form.applicant_email || null,
      applicant_phone: form.applicant_phone || null,
      voucher_amount: form.voucher_amount ? parseFloat(form.voucher_amount) : null,
      voucher_expiry: form.voucher_expiry || null,
      pha_name: form.pha_name || null,
      pha_contact: form.pha_contact || null,
      household_size: form.household_size ? parseInt(form.household_size) : null,
      move_in_date: form.move_in_date || null,
      notes: form.notes || null,
    };

    const res = await fetch("/api/tenants/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onCreated(data);
      onClose();
      setForm({
        listing_id: "", applicant_name: "", applicant_email: "", applicant_phone: "",
        voucher_amount: "", voucher_expiry: "", pha_name: "", pha_contact: "",
        household_size: "", move_in_date: "", notes: "",
      });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#222] sticky top-0 bg-[#111] z-10">
          <h2 className="text-sm font-bold text-white">Add Application</h2>
          <button onClick={onClose} className="text-[#777] hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Link to listing */}
          {listings.length > 0 && (
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Property Listing</label>
              <select
                value={form.listing_id}
                onChange={(e) => setForm((f) => ({ ...f, listing_id: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white focus:border-[#00ff88] focus:outline-none"
              >
                <option value="">Select a listing...</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>{l.address}, {l.city}</option>
                ))}
              </select>
            </div>
          )}

          {/* Applicant info */}
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Applicant Name</label>
            <input
              required
              value={form.applicant_name}
              onChange={(e) => setForm((f) => ({ ...f, applicant_name: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
              placeholder="Full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Email</label>
              <input
                type="email"
                value={form.applicant_email}
                onChange={(e) => setForm((f) => ({ ...f, applicant_email: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Phone</label>
              <input
                type="tel"
                value={form.applicant_phone}
                onChange={(e) => setForm((f) => ({ ...f, applicant_phone: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Voucher details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Voucher Amount</label>
              <input
                type="number"
                value={form.voucher_amount}
                onChange={(e) => setForm((f) => ({ ...f, voucher_amount: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white font-[family-name:var(--font-mono)] placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                placeholder="1200"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Voucher Expiry</label>
              <input
                type="date"
                value={form.voucher_expiry}
                onChange={(e) => setForm((f) => ({ ...f, voucher_expiry: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white focus:border-[#00ff88] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">PHA Name</label>
              <input
                value={form.pha_name}
                onChange={(e) => setForm((f) => ({ ...f, pha_name: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                placeholder="Housing Authority"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">PHA Contact</label>
              <input
                value={form.pha_contact}
                onChange={(e) => setForm((f) => ({ ...f, pha_contact: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                placeholder="Phone or email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Household Size</label>
              <input
                type="number"
                min={1}
                value={form.household_size}
                onChange={(e) => setForm((f) => ({ ...f, household_size: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white font-[family-name:var(--font-mono)] focus:border-[#00ff88] focus:outline-none"
                placeholder="4"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Move-in Date</label>
              <input
                type="date"
                value={form.move_in_date}
                onChange={(e) => setForm((f) => ({ ...f, move_in_date: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white focus:border-[#00ff88] focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none resize-none"
              placeholder="Additional notes..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md text-sm font-bold text-black bg-[#00ff88] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Add Application
          </button>
        </form>
      </div>
    </div>
  );
}
