"use client";

import { Check, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { PLAN_DETAILS } from "@/lib/stripe";
import type { PlanType } from "@/lib/types";

const tiers: { key: PlanType; popular?: boolean }[] = [
  { key: "free" },
  { key: "pro", popular: true },
  { key: "investor" },
];

export default function PricingPage() {
  const { user, profile } = useAuthStore();
  const currentPlan = profile?.plan ?? "free";

  const handleSubscribe = (plan: PlanType) => {
    if (plan === "free") return;
    // TODO: Create Stripe Checkout session
    // For now, redirect to a placeholder
    alert(
      `Stripe Checkout not yet configured.\n\nStephen needs to create Stripe products:\n- Pro ($29/mo): price_PLACEHOLDER_pro\n- Investor ($79/mo): price_PLACEHOLDER_investor\n\nThen set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY env vars.`
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-2xl font-bold text-white mb-2">
          Find better deals, faster
        </h1>
        <p className="text-sm text-[#777] max-w-md mx-auto">
          Choose the plan that fits your investment strategy. Upgrade or downgrade anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map(({ key, popular }) => {
          const plan = PLAN_DETAILS[key];
          const isCurrent = user && currentPlan === key;

          return (
            <div
              key={key}
              className={`relative bg-[#111] border rounded-lg p-6 flex flex-col ${
                popular
                  ? "border-[#00ff88] shadow-[0_0_30px_rgba(0,255,136,0.08)]"
                  : "border-[#222]"
              }`}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white font-[family-name:var(--font-mono)]">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-xs text-[#555]">/month</span>
                  )}
                  {plan.price === 0 && (
                    <span className="text-xs text-[#555]">forever</span>
                  )}
                </div>
              </div>

              <div className="space-y-3 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <Check size={14} className="text-[#00ff88] shrink-0 mt-0.5" />
                    <span className="text-xs text-[#e0e0e0]">{feature}</span>
                  </div>
                ))}
                {plan.limits.map((limit) => (
                  <div key={limit} className="flex items-start gap-2">
                    <X size={14} className="text-[#555] shrink-0 mt-0.5" />
                    <span className="text-xs text-[#555]">{limit}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-lg text-sm font-bold bg-[#1a1a1a] text-[#555] cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(key)}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                    popular
                      ? "bg-[#00ff88] text-black hover:shadow-[0_0_30px_rgba(0,255,136,0.3)]"
                      : "border border-[#222] text-[#777] hover:border-[#00ff88] hover:text-[#00ff88]"
                  }`}
                >
                  {key === "free" ? "Get Started" : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Stripe setup note */}
      <div className="mt-12 bg-[#111] border border-[#222] rounded-lg p-4 text-center">
        <p className="text-xs text-[#555]">
          <span className="text-[#ffcc00]">Setup required:</span> Create Stripe products in your{" "}
          <span className="font-[family-name:var(--font-mono)] text-[#777]">Stripe Dashboard</span>.
          Set <span className="font-[family-name:var(--font-mono)] text-[#777]">STRIPE_SECRET_KEY</span>,{" "}
          <span className="font-[family-name:var(--font-mono)] text-[#777]">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span>,{" "}
          and <span className="font-[family-name:var(--font-mono)] text-[#777]">STRIPE_WEBHOOK_SECRET</span> env vars.
          Then update price IDs in <span className="font-[family-name:var(--font-mono)] text-[#777]">src/lib/stripe.ts</span>.
        </p>
      </div>
    </div>
  );
}
