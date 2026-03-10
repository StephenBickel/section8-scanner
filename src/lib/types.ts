export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan: "free" | "pro" | "investor";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  daily_scans_used: number;
  daily_scans_reset_at: string;
  created_at: string;
  updated_at: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  city: string;
  max_price: number;
  min_score: number;
  max_pages: number;
  alert_enabled: boolean;
  alert_frequency: "instant" | "daily" | "weekly";
  alert_email: boolean;
  alert_sms: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  address: string;
  city: string;
  zip_code: string | null;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  hud_rent: number | null;
  rent_zestimate: number | null;
  monthly_rent: number;
  dscr: number;
  monthly_cash_flow: number;
  annual_cash_flow: number;
  cash_on_cash: number;
  rent_to_price: number;
  down_payment: number;
  mortgage: number;
  expenses_total: number;
  deal_score: number;
  zillow_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  price_history: Array<{ price: number; date: string }>;
  is_active: boolean;
}

export interface PortfolioProperty {
  id: string;
  user_id: string;
  deal_id: string | null;
  address: string;
  city: string;
  zip_code: string | null;
  purchase_price: number;
  purchase_date: string | null;
  beds: number;
  baths: number;
  sqft: number;
  current_rent: number | null;
  hud_rent: number | null;
  is_section8: boolean;
  tenant_name: string | null;
  lease_start: string | null;
  lease_end: string | null;
  vacancy_status: "occupied" | "vacant" | "turning";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioTransaction {
  id: string;
  property_id: string;
  user_id: string;
  type: "rent" | "mortgage" | "tax" | "insurance" | "maintenance" | "management" | "other_income" | "other_expense";
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface ScanRun {
  id: string;
  user_id: string | null;
  saved_search_id: string | null;
  city: string;
  max_price: number;
  min_score: number;
  properties_found: number;
  deals_found: number;
  new_deals: number;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface Alert {
  id: string;
  user_id: string;
  saved_search_id: string | null;
  deal_id: string | null;
  alert_type: "new_deal" | "price_drop" | "score_change";
  channel: "email" | "sms" | "push";
  sent_at: string;
  metadata: Record<string, unknown>;
}

// Scanner deal (from SSE stream, slightly different shape than DB deal)
export interface ScannerDeal {
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
}

export interface SellerContact {
  id: string;
  deal_id: string | null;
  address: string;
  city: string;
  zip_code: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  skip_trace_source: string | null;
  skip_traced_at: string | null;
  created_at: string;
}

export interface OutreachCampaign {
  id: string;
  user_id: string;
  name: string;
  template_subject: string;
  template_body: string;
  status: "draft" | "active" | "paused" | "completed";
  auto_send: boolean;
  min_deal_score: number;
  created_at: string;
  updated_at: string;
}

export interface OutreachEmail {
  id: string;
  campaign_id: string;
  user_id: string;
  seller_contact_id: string;
  deal_id: string | null;
  subject: string;
  body: string;
  status: "pending" | "sent" | "opened" | "replied" | "bounced" | "failed";
  sequence_step: number;
  scheduled_at: string | null;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface NeighborhoodScore {
  id: string;
  zip_code: string;
  city: string | null;
  crime_score: number | null;
  crime_grade: string | null;
  school_score: number | null;
  walkability_score: number | null;
  data_source: string | null;
  raw_data: Record<string, unknown>;
  fetched_at: string;
}

export interface ManagementExpense {
  id: string;
  property_id: string;
  user_id: string;
  management_type: "self" | "property_manager" | "hybrid";
  pm_fee_pct: number;
  pm_monthly_cost: number;
  self_manage_tools: Array<{ name: string; cost: number }>;
  self_manage_monthly_cost: number;
  monthly_savings: number;
  created_at: string;
  updated_at: string;
}

export type PlanType = "free" | "pro" | "investor";

export const PLAN_LIMITS = {
  free: { scans_per_day: 3, portfolio_max: 0, alerts: false, reports: false, api_access: false },
  pro: { scans_per_day: Infinity, portfolio_max: 10, alerts: true, reports: true, api_access: false },
  investor: { scans_per_day: Infinity, portfolio_max: Infinity, alerts: true, reports: true, api_access: true },
} as const;
