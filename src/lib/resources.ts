export interface Resource {
  name: string;
  url: string;
  description: string;
}

export interface ResourceCategory {
  category: string;
  icon: string;
  resources: Resource[];
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    category: "Tenant Finding",
    icon: "users",
    resources: [
      {
        name: "AffordableHousing.com",
        url: "https://www.affordablehousing.com",
        description: "List Section 8 properties to find qualified tenants",
      },
      {
        name: "GoSection8.com",
        url: "https://www.gosection8.com",
        description: "Largest Section 8 tenant marketplace",
      },
      {
        name: "Zillow Rental Manager",
        url: "https://www.zillow.com/rental-manager",
        description: "Free rental listings syndicated across Zillow network",
      },
    ],
  },
  {
    category: "Property Management",
    icon: "building",
    resources: [
      {
        name: "TenantCloud",
        url: "https://www.tenantcloud.com",
        description: "Rent collection + maintenance tracking ($15/mo)",
      },
      {
        name: "RentSpree",
        url: "https://www.rentspree.com",
        description: "Tenant screening reports ($50 one-time)",
      },
      {
        name: "Avail (Realtor.com)",
        url: "https://www.avail.co",
        description: "Free landlord software for small portfolios",
      },
    ],
  },
  {
    category: "Loan Providers",
    icon: "dollar",
    resources: [
      {
        name: "BiggerPockets DSCR Lenders",
        url: "https://www.biggerpockets.com",
        description: "Community-vetted DSCR lender directory",
      },
      {
        name: "Kiavi",
        url: "https://www.kiavi.com",
        description: "DSCR loans for rental investors, fast closing",
      },
      {
        name: "Lima One Capital",
        url: "https://www.limaone.com",
        description: "Rental portfolio loans and bridge financing",
      },
    ],
  },
  {
    category: "Crime & Safety Data",
    icon: "shield",
    resources: [
      {
        name: "SpotCrime",
        url: "https://www.spotcrime.com",
        description: "Neighborhood crime maps and alerts",
      },
      {
        name: "CrimeGrade.org",
        url: "https://crimegrade.org",
        description: "Letter grades (A-F) for crime per zip code",
      },
      {
        name: "AreaVibes",
        url: "https://www.areavibes.com",
        description: "Livability scores including crime, schools, amenities",
      },
    ],
  },
  {
    category: "HUD & Government Data",
    icon: "government",
    resources: [
      {
        name: "HUD User",
        url: "https://www.huduser.gov",
        description: "Official Fair Market Rent data and Section 8 resources",
      },
      {
        name: "HUD PHA Contact",
        url: "https://www.hud.gov/program_offices/public_indian_housing/pha/contacts",
        description: "Find your local Public Housing Authority",
      },
      {
        name: "Section 8 Bible",
        url: "https://www.biggerpockets.com/forums/52",
        description: "BiggerPockets Section 8 investor forum",
      },
    ],
  },
];
