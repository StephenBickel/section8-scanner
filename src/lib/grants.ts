// Rehab grant & assistance programs by city/state for Section 8 investors
// Sources: HUD, city community development departments, state housing agencies

export interface GrantProgram {
  name: string;
  type: "grant" | "forgivable_loan" | "low_interest_loan" | "tax_credit";
  amount: string; // e.g. "Up to $25,000"
  source: string; // administering agency
  url: string;
  requirements: string;
  phone?: string;
}

export interface CityGrants {
  city: string;
  state: string;
  programs: GrantProgram[];
}

// Map city slug (e.g. "cleveland-oh") to grant programs
export const CITY_GRANTS: Record<string, CityGrants> = {
  "cleveland-oh": {
    city: "Cleveland",
    state: "OH",
    programs: [
      {
        name: "Housing Trust Fund — Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $50,000/unit",
        source: "City of Cleveland Dept. of Community Development",
        url: "https://www.clevelandohio.gov/city-hall/departments/community-development/programs-services/housing-trust-fund",
        requirements: "Must rent to households at or below 60% AMI. Property must pass HQS inspection. Affordability period: 15 years.",
      },
      {
        name: "CDBG Housing Development",
        type: "grant",
        amount: "Up to $1,000,000 (project-based)",
        source: "City of Cleveland CDBG Program",
        url: "https://www.clevelandohio.gov/city-hall/departments/community-development/programs-services/housing-development",
        requirements: "Annual RFP process. Must benefit low/moderate-income persons. CDBG-eligible activities only.",
      },
      {
        name: "HOME Investment Partnerships",
        type: "forgivable_loan",
        amount: "Varies by project",
        source: "City of Cleveland / HUD HOME Program",
        url: "https://www.clevelandohio.gov/city-hall/departments/community-development/programs-services/housing-development",
        requirements: "Must create affordable rental units. 15-year affordability period. Income-restricted tenants.",
      },
    ],
  },
  "columbus-oh": {
    city: "Columbus",
    state: "OH",
    programs: [
      {
        name: "Rental Rehab Program",
        type: "forgivable_loan",
        amount: "Up to $35,000/unit",
        source: "City of Columbus Housing Division",
        url: "https://www.columbus.gov/housing",
        requirements: "Must rent to low-income tenants. 10-year affordability period.",
      },
      {
        name: "HOME Program — Rental",
        type: "forgivable_loan",
        amount: "Varies by project",
        source: "Ohio Housing Finance Agency",
        url: "https://ohiohome.org",
        requirements: "Must serve households at or below 80% AMI.",
      },
    ],
  },
  "akron-oh": {
    city: "Akron",
    state: "OH",
    programs: [
      {
        name: "CDBG Residential Rehab",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Akron Dept. of Planning & Urban Development",
        url: "https://www.akronohio.gov/planning",
        requirements: "Property must be in CDBG-eligible area. Income-restricted tenants.",
      },
    ],
  },
  "dayton-oh": {
    city: "Dayton",
    state: "OH",
    programs: [
      {
        name: "CDBG Housing Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Dayton Dept. of Planning & Community Development",
        url: "https://www.daytonohio.gov/363/Housing-Rehabilitation",
        requirements: "Must be in city limits. Low/moderate-income benefit.",
      },
    ],
  },
  "toledo-oh": {
    city: "Toledo",
    state: "OH",
    programs: [
      {
        name: "CDBG Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $20,000",
        source: "City of Toledo Dept. of Neighborhoods",
        url: "https://toledo.oh.gov/departments/neighborhoods",
        requirements: "Must rent to low-income households for minimum 5 years.",
      },
    ],
  },
  "cincinnati-oh": {
    city: "Cincinnati",
    state: "OH",
    programs: [
      {
        name: "CDBG Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $30,000/unit",
        source: "City of Cincinnati DCED",
        url: "https://www.cincinnati-oh.gov/community-development/",
        requirements: "Must rent to households at or below 80% AMI. 10-year compliance.",
      },
    ],
  },
  "memphis-tn": {
    city: "Memphis",
    state: "TN",
    programs: [
      {
        name: "Affordable Rental Housing Partnership Program",
        type: "forgivable_loan",
        amount: "Up to $40,000/unit",
        source: "City of Memphis Division of Housing & Community Development",
        url: "https://memphistn.gov/affordable-housing/",
        requirements: "Must partner with CHDO. Units rented to low-to-moderate income families. HOME-funded.",
        phone: "(901) 636-6605",
      },
      {
        name: "HOME Program — Rental Rehab",
        type: "forgivable_loan",
        amount: "Varies by project",
        source: "Tennessee Housing Development Agency (THDA)",
        url: "https://thda.org/govt-non-profit/home-program/",
        requirements: "Must serve households at or below 80% AMI. 15-20 year affordability period.",
      },
    ],
  },
  "chattanooga-tn": {
    city: "Chattanooga",
    state: "TN",
    programs: [
      {
        name: "CDBG Housing Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Chattanooga Community Development",
        url: "https://www.chattanooga.gov/economic-community-development",
        requirements: "Must be in CDBG target area. Low/moderate-income benefit.",
      },
    ],
  },
  "detroit-mi": {
    city: "Detroit",
    state: "MI",
    programs: [
      {
        name: "CDBG Rental Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $50,000/unit",
        source: "City of Detroit Housing & Revitalization Dept.",
        url: "https://detroitmi.gov/opportunities/affordable-housing",
        requirements: "Must create/preserve affordable rental units. Apply through annual NOFA. Units at or below 60% AMI.",
      },
      {
        name: "HOME Rental Development",
        type: "forgivable_loan",
        amount: "Varies (project-based)",
        source: "City of Detroit / Wayne County HOME Program",
        url: "https://engage.waynecountymi.gov/chdo-home",
        requirements: "Must partner with CHDO or apply through county. Low-income rental units.",
      },
      {
        name: "Neighborhood Enterprise Zone (NEZ)",
        type: "tax_credit",
        amount: "Up to 50% property tax reduction for 12 years",
        source: "City of Detroit",
        url: "https://detroitmi.gov/",
        requirements: "Property must be in designated NEZ. Must rehabilitate property. Application required.",
      },
    ],
  },
  "flint-mi": {
    city: "Flint",
    state: "MI",
    programs: [
      {
        name: "CDBG Housing Rehab",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Flint Community & Economic Development",
        url: "https://www.cityofflint.com",
        requirements: "Low/moderate-income area. Lead paint remediation included.",
      },
    ],
  },
  "lansing-mi": {
    city: "Lansing",
    state: "MI",
    programs: [
      {
        name: "Rental Rehab Program",
        type: "forgivable_loan",
        amount: "Up to $20,000/unit",
        source: "City of Lansing Development Office",
        url: "https://www.lansingmi.gov/development",
        requirements: "Must maintain affordable rents for 5 years.",
      },
    ],
  },
  "grand-rapids-mi": {
    city: "Grand Rapids",
    state: "MI",
    programs: [
      {
        name: "HOME Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $30,000/unit",
        source: "City of Grand Rapids Community Development",
        url: "https://www.grandrapidsmi.gov/Government/Departments/Community-Development",
        requirements: "Must serve households at or below 80% AMI. 10-15 year affordability.",
      },
    ],
  },
  "indianapolis-in": {
    city: "Indianapolis",
    state: "IN",
    programs: [
      {
        name: "HOME Program — Rental Development",
        type: "forgivable_loan",
        amount: "Varies by project",
        source: "Indiana Housing & Community Development Authority (IHCDA)",
        url: "https://www.in.gov/ihcda/developers/home-investment-partnerships-program-home/",
        requirements: "Must create affordable rental units at or below 60% AMI. 15-20 year affordability.",
        phone: "(317) 232-7777",
      },
      {
        name: "CDBG Rental Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $25,000/unit",
        source: "City of Indianapolis DMMD",
        url: "https://www.indy.gov/agency/department-of-metropolitan-development",
        requirements: "Must be in CDBG-eligible census tract. Low/mod-income tenants.",
      },
      {
        name: "Landlord Mitigation Reserve Fund",
        type: "grant",
        amount: "Up to $5,000 per unit (damage/loss mitigation)",
        source: "IHCDA / Governor's Office",
        url: "https://www.in.gov/ihcda/",
        requirements: "Must rent to voucher holders. Covers damages beyond security deposit.",
      },
    ],
  },
  "gary-in": {
    city: "Gary",
    state: "IN",
    programs: [
      {
        name: "CDBG Housing Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Gary Community Development",
        url: "https://gary.gov",
        requirements: "Must be in city limits. Low/moderate-income benefit.",
      },
    ],
  },
  "south-bend-in": {
    city: "South Bend",
    state: "IN",
    programs: [
      {
        name: "CDBG Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of South Bend Community Investment",
        url: "https://southbendin.gov/department/community-investment/",
        requirements: "Must serve low-income tenants. 5-year affordability period.",
      },
    ],
  },
  "birmingham-al": {
    city: "Birmingham",
    state: "AL",
    programs: [
      {
        name: "CDBG Housing Rehabilitation",
        type: "grant",
        amount: "Varies by project",
        source: "City of Birmingham Community Development",
        url: "https://www.birminghamal.gov/government/city-departments/community-development/community-development-block-grant",
        requirements: "Must benefit low/moderate-income persons. Apply through annual action plan cycle.",
      },
      {
        name: "HOME Program — Rental",
        type: "forgivable_loan",
        amount: "Varies",
        source: "Alabama Housing Finance Authority (AHFA)",
        url: "https://www.ahfa.com",
        requirements: "Must create/preserve affordable housing. Income-restricted tenants.",
      },
    ],
  },
  "st-louis-mo": {
    city: "St. Louis",
    state: "MO",
    programs: [
      {
        name: "Affordable Housing Commission Fund",
        type: "forgivable_loan",
        amount: "Up to $50,000/unit",
        source: "St. Louis Affordable Housing Commission",
        url: "https://www.stlouis-mo.gov/government/departments/affordable-housing/",
        requirements: "Must create/preserve affordable units. 15-year affordability.",
      },
      {
        name: "CDBG Rehab Program",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "St. Louis Community Development Administration",
        url: "https://www.stlouis-mo.gov/government/departments/community-development/",
        requirements: "CDBG-eligible area. Low/mod-income benefit.",
      },
    ],
  },
  "kansas-city-mo": {
    city: "Kansas City",
    state: "MO",
    programs: [
      {
        name: "HOME Rental Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $35,000/unit",
        source: "City of Kansas City Neighborhoods & Housing Services",
        url: "https://www.kcmo.gov/city-hall/departments/neighborhoods-housing-services",
        requirements: "Must serve households at or below 80% AMI.",
      },
    ],
  },
  "milwaukee-wi": {
    city: "Milwaukee",
    state: "WI",
    programs: [
      {
        name: "Rental Rehabilitation Program",
        type: "forgivable_loan",
        amount: "Up to $40,000/unit",
        source: "City of Milwaukee Dept. of Neighborhood Services",
        url: "https://city.milwaukee.gov/DNS",
        requirements: "Must rent to low-income households. 10-year affordability period.",
      },
      {
        name: "CDBG Housing Programs",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Milwaukee Community Development Grants",
        url: "https://city.milwaukee.gov/CDGA",
        requirements: "Must be in CDBG-eligible area. Low/mod-income benefit.",
      },
    ],
  },
  "baltimore-md": {
    city: "Baltimore",
    state: "MD",
    programs: [
      {
        name: "Rental Housing Rehab",
        type: "low_interest_loan",
        amount: "Up to $50,000/unit",
        source: "Baltimore Housing (DHCD)",
        url: "https://dhcd.baltimorecity.gov/",
        requirements: "Must maintain affordable rents. Property must pass inspection.",
      },
      {
        name: "HOME Program — Rental",
        type: "forgivable_loan",
        amount: "Varies by project",
        source: "Maryland DHCD",
        url: "https://dhcd.maryland.gov",
        requirements: "Income-restricted. 15-20 year affordability.",
      },
    ],
  },
  "philadelphia-pa": {
    city: "Philadelphia",
    state: "PA",
    programs: [
      {
        name: "Rental Improvement Fund",
        type: "forgivable_loan",
        amount: "Up to $25,000/unit",
        source: "Philadelphia Housing Development Corp (PHDC)",
        url: "https://www.phdcphila.org/",
        requirements: "Must rent to households at or below 80% AMI for 10 years.",
      },
      {
        name: "CDBG Housing Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Philadelphia DHCD",
        url: "https://www.phila.gov/departments/division-of-housing-and-community-development/",
        requirements: "Low/moderate-income area. Compliance period applies.",
      },
    ],
  },
  "pittsburgh-pa": {
    city: "Pittsburgh",
    state: "PA",
    programs: [
      {
        name: "Rental Rehab Assistance",
        type: "forgivable_loan",
        amount: "Up to $30,000/unit",
        source: "Urban Redevelopment Authority of Pittsburgh",
        url: "https://www.ura.org/",
        requirements: "Must maintain affordable rents for 10 years.",
      },
    ],
  },
  "houston-tx": {
    city: "Houston",
    state: "TX",
    programs: [
      {
        name: "HOME Rental Program",
        type: "forgivable_loan",
        amount: "Varies by project",
        source: "City of Houston Housing & Community Development",
        url: "https://www.houstontx.gov/housing/",
        requirements: "Must serve households at or below 80% AMI. 15-20 year affordability.",
      },
      {
        name: "CDBG Rental Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $25,000/unit",
        source: "City of Houston HCDD",
        url: "https://www.houstontx.gov/housing/",
        requirements: "Must be in CDBG-eligible area. Low/mod-income tenants.",
      },
    ],
  },
  "dallas-tx": {
    city: "Dallas",
    state: "TX",
    programs: [
      {
        name: "HOME/CDBG Rental Rehab",
        type: "forgivable_loan",
        amount: "Varies (project-based)",
        source: "City of Dallas Housing & Neighborhood Revitalization",
        url: "https://dallascityhall.com/departments/housing-neighborhood-revitalization/",
        requirements: "Must create affordable rental units. Income-restricted.",
      },
    ],
  },
  "san-antonio-tx": {
    city: "San Antonio",
    state: "TX",
    programs: [
      {
        name: "Under 1 Roof Program",
        type: "grant",
        amount: "Up to $25,000 (roof/critical repairs)",
        source: "City of San Antonio Neighborhood & Housing Services",
        url: "https://www.sanantonio.gov/NHSD",
        requirements: "Must be owner-occupied or renting to low-income tenants.",
      },
    ],
  },
  "fort-worth-tx": {
    city: "Fort Worth",
    state: "TX",
    programs: [
      {
        name: "CDBG Housing Rehab",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Fort Worth Neighborhood Services",
        url: "https://www.fortworthtexas.gov/departments/neighborhood-services",
        requirements: "Must be in CDBG-eligible area.",
      },
    ],
  },
  "jacksonville-fl": {
    city: "Jacksonville",
    state: "FL",
    programs: [
      {
        name: "HOME Rental Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $30,000/unit",
        source: "City of Jacksonville Housing & Neighborhoods",
        url: "https://www.coj.net/departments/neighborhoods",
        requirements: "Must rent to low-income households. 10-year affordability.",
      },
    ],
  },
  "oklahoma-city-ok": {
    city: "Oklahoma City",
    state: "OK",
    programs: [
      {
        name: "CDBG Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Oklahoma City Planning Dept.",
        url: "https://www.okc.gov/departments/planning",
        requirements: "CDBG-eligible area. Low/moderate-income tenants.",
      },
    ],
  },
  "tulsa-ok": {
    city: "Tulsa",
    state: "OK",
    programs: [
      {
        name: "CDBG Housing Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Tulsa Grants Administration",
        url: "https://www.cityoftulsa.org/government/departments/grants-administration/",
        requirements: "Must be in CDBG target area.",
      },
    ],
  },
  "louisville-ky": {
    city: "Louisville",
    state: "KY",
    programs: [
      {
        name: "HOME Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $30,000/unit",
        source: "Louisville Metro Housing Authority",
        url: "https://louisvilleky.gov/government/housing",
        requirements: "Must serve low-income households. 15-year affordability.",
      },
    ],
  },
  "little-rock-ar": {
    city: "Little Rock",
    state: "AR",
    programs: [
      {
        name: "CDBG Residential Rehab",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Little Rock Housing & Neighborhood Programs",
        url: "https://www.littlerock.gov/for-residents/housing-and-neighborhood-programs/",
        requirements: "Low/moderate-income census tracts.",
      },
    ],
  },
  "buffalo-ny": {
    city: "Buffalo",
    state: "NY",
    programs: [
      {
        name: "Rental Rehabilitation Program",
        type: "forgivable_loan",
        amount: "Up to $35,000/unit",
        source: "City of Buffalo Office of Strategic Planning",
        url: "https://www.buffalony.gov/",
        requirements: "Must maintain affordable rents. 10-year compliance period.",
      },
    ],
  },
  "rochester-ny": {
    city: "Rochester",
    state: "NY",
    programs: [
      {
        name: "HOME/CDBG Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $30,000/unit",
        source: "City of Rochester Bureau of Housing",
        url: "https://www.cityofrochester.gov/housing/",
        requirements: "Must serve low-income tenants. 10-15 year affordability.",
      },
    ],
  },
  "syracuse-ny": {
    city: "Syracuse",
    state: "NY",
    programs: [
      {
        name: "CDBG Housing Rehab",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Syracuse Community Development",
        url: "https://www.syrgov.net/community-development",
        requirements: "CDBG-eligible area. Low/moderate-income benefit.",
      },
    ],
  },
  "atlanta-ga": {
    city: "Atlanta",
    state: "GA",
    programs: [
      {
        name: "HOME Rental Development",
        type: "forgivable_loan",
        amount: "Varies by project",
        source: "Invest Atlanta / Georgia DCA",
        url: "https://www.investatlanta.com/",
        requirements: "Must create affordable rental units. Income-restricted.",
      },
    ],
  },
  "savannah-ga": {
    city: "Savannah",
    state: "GA",
    programs: [
      {
        name: "CDBG Housing Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Savannah Housing Dept.",
        url: "https://www.savannahga.gov/housing",
        requirements: "Low/moderate-income area. Must pass inspection.",
      },
    ],
  },
  "new-orleans-la": {
    city: "New Orleans",
    state: "LA",
    programs: [
      {
        name: "Soft Second Mortgage / Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $50,000/unit",
        source: "New Orleans Office of Community Development",
        url: "https://www.nola.gov/community-development/",
        requirements: "Must serve low-income tenants. 15-year affordability. Annual NOFA.",
      },
    ],
  },
  "jackson-ms": {
    city: "Jackson",
    state: "MS",
    programs: [
      {
        name: "CDBG Housing Rehabilitation",
        type: "forgivable_loan",
        amount: "Up to $25,000",
        source: "City of Jackson Community Development",
        url: "https://www.jacksonms.gov",
        requirements: "Low/moderate-income census tracts.",
      },
    ],
  },
  "richmond-va": {
    city: "Richmond",
    state: "VA",
    programs: [
      {
        name: "HOME Rental Rehab",
        type: "forgivable_loan",
        amount: "Up to $30,000/unit",
        source: "City of Richmond Housing & Community Development",
        url: "https://www.rva.gov/housing-community-development",
        requirements: "Must serve households at or below 80% AMI.",
      },
    ],
  },
};

// Federal programs available everywhere
export const FEDERAL_PROGRAMS: GrantProgram[] = [
  {
    name: "HUD HOME Investment Partnerships",
    type: "forgivable_loan",
    amount: "Varies by locality",
    source: "U.S. Department of Housing & Urban Development",
    url: "https://www.hud.gov/program_offices/comm_planning/home",
    requirements: "Applied through local participating jurisdictions. Must create affordable housing. 15-20 year affordability period.",
  },
  {
    name: "CDBG — Community Development Block Grant",
    type: "grant",
    amount: "Varies by locality",
    source: "U.S. Department of Housing & Urban Development",
    url: "https://www.hud.gov/program_offices/comm_planning/cdbg",
    requirements: "Applied through city/county. Must benefit low/moderate-income persons. Eligible activities include housing rehabilitation.",
  },
  {
    name: "Opportunity Zones Tax Incentive",
    type: "tax_credit",
    amount: "Defer/reduce capital gains taxes",
    source: "IRS / U.S. Treasury",
    url: "https://opportunityzones.hud.gov/",
    requirements: "Investment must be in a designated Qualified Opportunity Zone. Hold for 10+ years for maximum benefit.",
  },
];

export function getGrantsForCity(citySlug: string): { local: GrantProgram[]; federal: GrantProgram[] } {
  const cityData = CITY_GRANTS[citySlug];
  return {
    local: cityData?.programs ?? [],
    federal: FEDERAL_PROGRAMS,
  };
}

export function getMaxGrantAmount(citySlug: string): number {
  const cityData = CITY_GRANTS[citySlug];
  if (!cityData) return 25000; // default CDBG estimate
  
  let max = 0;
  for (const p of cityData.programs) {
    const match = p.amount.match(/\$(\d{1,3}(?:,\d{3})*)/);
    if (match) {
      const val = parseInt(match[1].replace(/,/g, ""));
      if (val > max) max = val;
    }
  }
  return max || 25000;
}

export const TYPE_LABELS: Record<GrantProgram["type"], string> = {
  grant: "Grant",
  forgivable_loan: "Forgivable Loan",
  low_interest_loan: "Low-Interest Loan",
  tax_credit: "Tax Credit",
};

export const TYPE_COLORS: Record<GrantProgram["type"], string> = {
  grant: "text-[#00ff88] bg-[rgba(0,255,136,0.1)]",
  forgivable_loan: "text-[#aaff44] bg-[rgba(170,255,68,0.1)]",
  low_interest_loan: "text-[#ffcc00] bg-[rgba(255,204,0,0.1)]",
  tax_credit: "text-[#88ccff] bg-[rgba(136,204,255,0.1)]",
};
