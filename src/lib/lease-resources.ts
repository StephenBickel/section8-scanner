export interface LeaseResource {
  title: string;
  description: string;
  url: string;
  category: "lease" | "inspection" | "compliance" | "forms";
}

export const LEASE_RESOURCES: LeaseResource[] = [
  {
    title: "HUD Model Lease for Section 8",
    description: "Official HUD model lease template required for Housing Choice Voucher tenancies.",
    url: "https://www.hud.gov/program_offices/administration/hudclips/forms/hud5",
    category: "lease",
  },
  {
    title: "HUD Tenancy Addendum (Form 52641-A)",
    description: "Required addendum to all Section 8 leases — covers program obligations for landlord and tenant.",
    url: "https://www.hud.gov/sites/dml/OCHCO/data/52641A.pdf",
    category: "lease",
  },
  {
    title: "Housing Quality Standards (HQS) Checklist",
    description: "Inspection checklist used by PHAs to verify units meet HQS before lease-up.",
    url: "https://www.hud.gov/program_offices/public_indian_housing/programs/hcv/hqs",
    category: "inspection",
  },
  {
    title: "Request for Tenancy Approval (Form 52517)",
    description: "Form submitted by tenant to PHA when selecting a unit — initiates the approval process.",
    url: "https://www.hud.gov/sites/dml/OCHCO/data/52517.pdf",
    category: "forms",
  },
  {
    title: "Fair Housing Act Overview",
    description: "Federal fair housing requirements — protected classes, reasonable accommodations, advertising rules.",
    url: "https://www.hud.gov/program_offices/fair_housing_equal_opp/fair_housing_act_overview",
    category: "compliance",
  },
  {
    title: "Lead-Based Paint Disclosure (Pre-1978)",
    description: "Required EPA lead paint disclosure for properties built before 1978.",
    url: "https://www.epa.gov/lead/protect-your-family-lead-your-home-real-estate-disclosure",
    category: "compliance",
  },
  {
    title: "Section 8 Landlord Guidebook",
    description: "Comprehensive guide for landlords participating in the Housing Choice Voucher program.",
    url: "https://www.hud.gov/topics/housing_choice_voucher_program_section_8",
    category: "forms",
  },
];
