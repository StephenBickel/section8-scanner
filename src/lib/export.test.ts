import { describe, expect, it } from "vitest";

import { serializeDealsToCSV } from "./export";

describe("serializeDealsToCSV", () => {
  it("escapes CSV structure and neutralizes spreadsheet formulas", () => {
    const csv = serializeDealsToCSV([{
      address: '=HYPERLINK("https://evil.test","click"), Apt 2\nCleveland',
      price: 48_000,
      beds: 3,
      baths: 1,
      sqft: 1_100,
      hud_rent: 1_646,
      monthly_rent: 1_646,
      dscr: 4.21,
      monthly_cash_flow: 987,
      coc_return: 137,
      score: 99,
      zillow_url: "+cmd|' /C calc'!A0",
      mortgage: 391,
      expenses_total: 268,
      down_payment: 7_200,
      annual_cash_flow: 11_844,
      rent_to_price: 3.43,
      zip_code: "@SUM(1+1)",
      listing_type: "standard",
    }]);

    expect(csv).toContain('"\'=HYPERLINK(""https://evil.test"",""click""), Apt 2\nCleveland"');
    expect(csv).toContain('"\'+cmd|\' /C calc\'!A0"');
    expect(csv).toContain('"\'@SUM(1+1)"');
    expect(csv.split("\n")[0]).toContain('"Address"');
  });
});
