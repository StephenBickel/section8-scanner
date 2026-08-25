import { create } from "zustand";
import { safeZillowUrl } from "@/lib/security/scanner-url";

interface Deal {
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
  listing_type?: "standard" | "auction" | "pre_foreclosure" | "foreclosure" | "fsbo";
}

interface ScanProgress {
  page: number;
  totalPages: number;
  count: number;
}

interface ScanStats {
  total: number;
  deals: number;
}

interface ScanState {
  // Scan parameters
  city: string;
  maxPrice: number;
  minScore: number;
  maxPages: number;

  // Scan results
  scanning: boolean;
  deals: Deal[];
  progress: ScanProgress;
  scanDone: boolean;
  scanStats: ScanStats | null;
  isDemo: boolean;
  error: string | null;
  logs: string[];

  // Actions
  setCity: (city: string) => void;
  setMaxPrice: (price: number) => void;
  setMinScore: (score: number) => void;
  setMaxPages: (pages: number) => void;
  startScan: () => void;
  stopScan: () => void;
}

// Keep abort controller outside the store (not serializable)
let abortController: AbortController | null = null;

export const useScanStore = create<ScanState>((set, get) => ({
  city: "cleveland-oh",
  maxPrice: 100000,
  minScore: 40,
  maxPages: 3,

  scanning: false,
  deals: [],
  progress: { page: 0, totalPages: 0, count: 0 },
  scanDone: false,
  scanStats: null,
  isDemo: false,
  error: null,
  logs: [],

  setCity: (city) => set({ city }),
  setMaxPrice: (maxPrice) => set({ maxPrice }),
  setMinScore: (minScore) => set({ minScore }),
  setMaxPages: (maxPages) => set({ maxPages }),

  stopScan: () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    set({ scanning: false });
  },

  startScan: async () => {
    const state = get();
    if (state.scanning) return;

    // Reset state
    set({
      scanning: true,
      deals: [],
      scanDone: false,
      scanStats: null,
      isDemo: false,
      error: null,
      logs: [],
      progress: { page: 0, totalPages: state.maxPages, count: 0 },
    });

    abortController = new AbortController();

    try {
      const params = new URLSearchParams({
        city: state.city,
        maxPrice: state.maxPrice.toString(),
        minScore: state.minScore.toString(),
        maxPages: state.maxPages.toString(),
      });

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiBase}/api/scan?${params}`, {
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        set({ error: "Failed to connect to scanner", scanning: false });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const msg = JSON.parse(jsonStr);

            if (msg.type === "property") {
              const deal = msg.data as Deal;
              set((s) => ({ deals: [...s.deals, { ...deal, zillow_url: safeZillowUrl(deal.zillow_url) ?? "" }] }));
            } else if (msg.type === "progress") {
              set({
                progress: {
                  page: msg.page,
                  totalPages: msg.total_pages,
                  count: msg.count,
                },
              });
            } else if (msg.type === "done") {
              set({
                scanStats: { total: msg.total, deals: msg.deals },
                scanDone: true,
                isDemo: !!msg.demo,
              });
            } else if (msg.type === "error") {
              set({ error: msg.message });
            } else if (msg.type === "log") {
              set((s) => ({ logs: [...s.logs, msg.message] }));
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        set({ error: e.message });
      }
    } finally {
      set({ scanning: false });
      abortController = null;
    }
  },
}));
