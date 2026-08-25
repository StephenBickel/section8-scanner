"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Import } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PropertyListing, PortfolioProperty } from "@/lib/types";

const AMENITIES_OPTIONS = [
  "Washer/Dryer",
  "Washer/Dryer Hookups",
  "Dishwasher",
  "Central AC",
  "Window AC",
  "Updated Kitchen",
  "Hardwood Floors",
  "Garage",
  "Off-Street Parking",
  "Fenced Yard",
  "Patio/Deck",
  "Storage",
  "Basement",
  "Near Public Transit",
  "Near Schools",
];

const PET_OPTIONS = [
  { value: "no_pets", label: "No Pets" },
  { value: "cats_only", label: "Cats Only" },
  { value: "dogs_allowed", label: "Dogs Allowed" },
  { value: "all_pets", label: "All Pets Welcome" },
];

interface CreateListingModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (listing: PropertyListing) => void;
  editListing?: PropertyListing | null;
}

export default function CreateListingModal({ open, onClose, onCreated, editListing }: CreateListingModalProps) {
  const [loading, setLoading] = useState(false);
  const [portfolioProperties, setPortfolioProperties] = useState<PortfolioProperty[]>([]);
  const [form, setForm] = useState({
    address: "",
    city: "",
    state: "",
    zip_code: "",
    beds: 3,
    baths: 1,
    sqft: "",
    monthly_rent: "",
    hud_payment_standard: "",
    description: "",
    amenities: [] as string[],
    pet_policy: "no_pets",
    available_date: "",
    section8_accepted: true,
  });

  useEffect(() => {
    if (editListing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the controlled editor when its record changes
      setForm({
        address: editListing.address,
        city: editListing.city,
        state: editListing.state,
        zip_code: editListing.zip_code || "",
        beds: editListing.beds,
        baths: editListing.baths,
        sqft: editListing.sqft?.toString() || "",
        monthly_rent: editListing.monthly_rent.toString(),
        hud_payment_standard: editListing.hud_payment_standard?.toString() || "",
        description: editListing.description || "",
        amenities: editListing.amenities || [],
        pet_policy: editListing.pet_policy,
        available_date: editListing.available_date || "",
        section8_accepted: editListing.section8_accepted,
      });
    }
  }, [editListing]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("portfolio_properties")
      .select("*")
      .order("address")
      .then(({ data }) => {
        if (data) setPortfolioProperties(data);
      });
  }, [open]);

  function importFromPortfolio(prop: PortfolioProperty) {
    setForm((f) => ({
      ...f,
      address: prop.address,
      city: prop.city,
      zip_code: prop.zip_code || "",
      beds: prop.beds,
      baths: prop.baths,
      sqft: prop.sqft?.toString() || "",
      monthly_rent: prop.current_rent?.toString() || "",
      hud_payment_standard: prop.hud_rent?.toString() || "",
    }));
  }

  function toggleAmenity(amenity: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      sqft: form.sqft ? parseInt(form.sqft) : null,
      monthly_rent: parseFloat(form.monthly_rent),
      hud_payment_standard: form.hud_payment_standard ? parseFloat(form.hud_payment_standard) : null,
      available_date: form.available_date || null,
    };

    // Generate listings
    const genRes = await fetch("/api/tenants/generate-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const generated = await genRes.json();

    const listingPayload = {
      ...(editListing ? { id: editListing.id } : {}),
      ...payload,
      gosection8_listing: generated.gosection8,
      affordablehousing_listing: generated.affordablehousing,
      socialserve_listing: generated.socialserve,
      craigslist_listing: generated.craigslist,
      facebook_listing: generated.facebook,
    };

    const res = await fetch("/api/tenants/listings", {
      method: editListing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listingPayload),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onCreated(data);
      onClose();
      if (!editListing) {
        setForm({
          address: "", city: "", state: "", zip_code: "", beds: 3, baths: 1, sqft: "",
          monthly_rent: "", hud_payment_standard: "", description: "", amenities: [],
          pet_policy: "no_pets", available_date: "", section8_accepted: true,
        });
      }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#222] sticky top-0 bg-[#111] z-10">
          <h2 className="text-sm font-bold text-white">
            {editListing ? "Edit Listing" : "Create Listing"}
          </h2>
          <button onClick={onClose} className="text-[#777] hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Import from portfolio */}
          {!editListing && portfolioProperties.length > 0 && (
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">
                Import from Portfolio
              </label>
              <div className="flex flex-wrap gap-2">
                {portfolioProperties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => importFromPortfolio(p)}
                    className="text-[10px] px-2 py-1 rounded border border-[#333] text-[#777] hover:border-[#00ff88] hover:text-[#00ff88] transition-colors flex items-center gap-1"
                  >
                    <Import size={10} />
                    {p.address}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Address</label>
              <input
                required
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">City</label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                placeholder="Cleveland"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">State</label>
                <input
                  required
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                  placeholder="OH"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">ZIP</label>
                <input
                  value={form.zip_code}
                  onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none"
                  placeholder="44101"
                />
              </div>
            </div>
          </div>

          {/* Property details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Beds</label>
              <input
                type="number"
                required
                min={0}
                value={form.beds}
                onChange={(e) => setForm((f) => ({ ...f, beds: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white font-[family-name:var(--font-mono)] focus:border-[#00ff88] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Baths</label>
              <input
                type="number"
                required
                min={0}
                step={0.5}
                value={form.baths}
                onChange={(e) => setForm((f) => ({ ...f, baths: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white font-[family-name:var(--font-mono)] focus:border-[#00ff88] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Sqft</label>
              <input
                type="number"
                value={form.sqft}
                onChange={(e) => setForm((f) => ({ ...f, sqft: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white font-[family-name:var(--font-mono)] focus:border-[#00ff88] focus:outline-none"
                placeholder="1200"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Rent/mo</label>
              <input
                type="number"
                required
                value={form.monthly_rent}
                onChange={(e) => setForm((f) => ({ ...f, monthly_rent: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white font-[family-name:var(--font-mono)] focus:border-[#00ff88] focus:outline-none"
                placeholder="1200"
              />
            </div>
          </div>

          {/* HUD + Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">HUD Payment Standard</label>
              <input
                type="number"
                value={form.hud_payment_standard}
                onChange={(e) => setForm((f) => ({ ...f, hud_payment_standard: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white font-[family-name:var(--font-mono)] focus:border-[#00ff88] focus:outline-none"
                placeholder="1400"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Available Date</label>
              <input
                type="date"
                value={form.available_date}
                onChange={(e) => setForm((f) => ({ ...f, available_date: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white focus:border-[#00ff88] focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#00ff88] focus:outline-none resize-none"
              placeholder="Describe the property..."
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_OPTIONS.map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    form.amenities.includes(amenity)
                      ? "border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.08)]"
                      : "border-[#333] text-[#777] hover:border-[#555]"
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          {/* Pet policy */}
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Pet Policy</label>
            <div className="flex flex-wrap gap-2">
              {PET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, pet_policy: opt.value }))}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    form.pet_policy === opt.value
                      ? "border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.08)]"
                      : "border-[#333] text-[#777] hover:border-[#555]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 8 toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.section8_accepted}
              onChange={(e) => setForm((f) => ({ ...f, section8_accepted: e.target.checked }))}
              className="accent-[#00ff88]"
            />
            <span className="text-xs text-[#e0e0e0]">Section 8 Vouchers Accepted</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md text-sm font-bold text-black bg-[#00ff88] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {editListing ? "Update Listing" : "Create & Generate Listings"}
          </button>
        </form>
      </div>
    </div>
  );
}
