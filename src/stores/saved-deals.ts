import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SavedDeal {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  hud_rent: number;
  monthly_rent: number;
  dscr: number;
  monthly_cash_flow: number;
  coc_return: number;
  score: number;
  zillow_url: string;
  mortgage: number;
  expenses_total: number;
  down_payment: number;
  annual_cash_flow: number;
  rent_to_price: number;
  zip_code: string;
  listing_type?: string;
  // Metadata
  saved_at: string;
  city: string;
  notes?: string;
}

interface SavedDealsState {
  deals: SavedDeal[];
  addDeal: (deal: Omit<SavedDeal, "saved_at">) => void;
  removeDeal: (address: string) => void;
  isDealSaved: (address: string) => boolean;
  updateNote: (address: string, note: string) => void;
  clearAll: () => void;
}

export const useSavedDealsStore = create<SavedDealsState>()(
  persist(
    (set, get) => ({
      deals: [],
      addDeal: (deal) => {
        const existing = get().deals.find((d) => d.address === deal.address);
        if (existing) return;
        set({ deals: [...get().deals, { ...deal, saved_at: new Date().toISOString() }] });
      },
      removeDeal: (address) => {
        set({ deals: get().deals.filter((d) => d.address !== address) });
      },
      isDealSaved: (address) => {
        return get().deals.some((d) => d.address === address);
      },
      updateNote: (address, note) => {
        set({
          deals: get().deals.map((d) =>
            d.address === address ? { ...d, notes: note } : d
          ),
        });
      },
      clearAll: () => set({ deals: [] }),
    }),
    { name: "section8-saved-deals" }
  )
);
