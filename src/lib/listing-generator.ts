import type { PropertyListing } from "./types";

function formatAmenities(amenities: string[]): string {
  return amenities.length > 0 ? amenities.join(", ") : "Contact for details";
}

function formatPetPolicy(policy: string): string {
  switch (policy) {
    case "cats_only": return "Cats allowed";
    case "dogs_allowed": return "Dogs allowed (breed restrictions may apply)";
    case "all_pets": return "Pet-friendly (all pets welcome)";
    default: return "No pets";
  }
}

function formatDate(date: string | null): string {
  if (!date) return "Immediately";
  return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function generateListings(property: PropertyListing): Record<string, string> {
  const { address, city, state, zip_code, beds, baths, sqft, monthly_rent, hud_payment_standard, description, amenities, pet_policy, available_date, section8_accepted } = property;
  const location = `${city}, ${state}${zip_code ? ` ${zip_code}` : ""}`;
  const bedBath = `${beds} bed / ${baths} bath${sqft ? ` / ${sqft.toLocaleString()} sq ft` : ""}`;
  const petText = formatPetPolicy(pet_policy);
  const amenityText = formatAmenities(amenities);
  const availText = formatDate(available_date);
  const s8Text = section8_accepted ? "Section 8 Housing Choice Vouchers ACCEPTED" : "";
  const hudText = hud_payment_standard ? `HUD Payment Standard: $${Number(hud_payment_standard).toLocaleString()}/mo` : "";

  const gosection8 = [
    `SECTION 8 ACCEPTED — ${bedBath}`,
    "",
    `Address: ${address}`,
    `Location: ${location}`,
    `Rent: $${Number(monthly_rent).toLocaleString()}/month`,
    hudText,
    "",
    s8Text,
    "",
    description || "",
    "",
    `Amenities: ${amenityText}`,
    `Pet Policy: ${petText}`,
    `Available: ${availText}`,
    "",
    "This property participates in the Housing Choice Voucher (Section 8) program. Landlord is experienced with the HCV inspection and approval process.",
    "",
    "Contact us today to schedule a showing!",
  ].filter(Boolean).join("\n");

  const affordablehousing = [
    `Affordable Rental — ${address}`,
    "",
    `${bedBath}`,
    `Monthly Rent: $${Number(monthly_rent).toLocaleString()}`,
    hudText,
    "",
    `Location: ${location}`,
    "",
    description || "",
    "",
    `Features & Amenities:`,
    ...amenities.map(a => `  • ${a}`),
    "",
    `Pet Policy: ${petText}`,
    `Availability: ${availText}`,
    s8Text ? `\n${s8Text}` : "",
    "",
    "Equal Housing Opportunity. Contact property manager for application details.",
  ].filter(Boolean).join("\n");

  const socialserve = [
    `Property Listing — ${address}, ${location}`,
    "",
    `Unit Details:`,
    `  Bedrooms: ${beds}`,
    `  Bathrooms: ${baths}`,
    sqft ? `  Square Footage: ${sqft.toLocaleString()}` : "",
    `  Monthly Rent: $${Number(monthly_rent).toLocaleString()}`,
    hudText ? `  ${hudText}` : "",
    "",
    `Accessibility & Features:`,
    ...amenities.map(a => `  - ${a}`),
    "",
    `Pet Policy: ${petText}`,
    `Available Date: ${availText}`,
    "",
    s8Text || "",
    description || "",
    "",
    "This listing complies with Fair Housing regulations. Contact for reasonable accommodation requests.",
  ].filter(Boolean).join("\n");

  const title = `${beds}BR/${baths}BA ${city.toUpperCase()} — $${Number(monthly_rent).toLocaleString()}/mo — SECTION 8 OK`;
  const craigslist = [
    title,
    "",
    `${address}, ${location}`,
    "",
    `Rent: $${Number(monthly_rent).toLocaleString()}/month`,
    `Bedrooms: ${beds}`,
    `Bathrooms: ${baths}`,
    sqft ? `Sqft: ${sqft.toLocaleString()}` : "",
    "",
    description || "Great rental opportunity!",
    "",
    `What's included:`,
    ...amenities.map(a => `* ${a}`),
    "",
    `Pets: ${petText}`,
    `Available: ${availText}`,
    "",
    s8Text ? `*** ${s8Text} ***` : "",
    hudText || "",
    "",
    "Serious inquiries only. Reply with your name, phone number, and desired move-in date.",
    "Do NOT contact me with unsolicited services.",
  ].filter(Boolean).join("\n");

  const facebook = [
    `${beds}BR/${baths}BA for rent in ${city}! $${Number(monthly_rent).toLocaleString()}/mo`,
    "",
    `${address}, ${location}`,
    sqft ? `${sqft.toLocaleString()} sq ft` : "",
    "",
    description || "Beautiful rental available now!",
    "",
    amenities.length > 0 ? `Includes: ${amenities.join(" | ")}` : "",
    "",
    petText,
    `Move in: ${availText}`,
    "",
    s8Text ? `${s8Text}!` : "",
    "",
    "DM for details or to schedule a tour!",
  ].filter(Boolean).join("\n");

  return {
    gosection8,
    affordablehousing,
    socialserve,
    craigslist,
    facebook,
  };
}
