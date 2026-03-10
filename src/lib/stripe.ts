import Stripe from "stripe";

export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

// Replace these with real Stripe Price IDs after creating products in Stripe Dashboard
export const PRICE_IDS = {
  pro_monthly: "price_PLACEHOLDER_pro",
  investor_monthly: "price_PLACEHOLDER_investor",
} as const;

export const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "3 scans per day",
      "Basic deal scoring",
      "View HUD FMR data",
    ],
    limits: [
      "No saved searches",
      "No email alerts",
      "No portfolio tracking",
      "No PDF reports",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceId: PRICE_IDS.pro_monthly,
    features: [
      "Unlimited scans",
      "Save searches & alerts",
      "Portfolio tracking (10 properties)",
      "PDF deal reports",
      "Email alerts (instant/daily/weekly)",
      "Priority support",
    ],
    limits: [
      "No API access",
      "No bulk export",
    ],
  },
  investor: {
    name: "Investor",
    price: 79,
    priceId: PRICE_IDS.investor_monthly,
    features: [
      "Everything in Pro",
      "Unlimited portfolio properties",
      "API access",
      "Bulk CSV export",
      "Multi-market dashboard",
      "Custom alert rules",
      "Dedicated support",
    ],
    limits: [],
  },
} as const;
