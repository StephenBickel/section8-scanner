import { describe, expect, it } from "vitest";

import { generateAlertEmailHtml } from "./alert-email";

describe("generateAlertEmailHtml", () => {
  it("escapes user content and rejects unsafe links", () => {
    const html = generateAlertEmailHtml({
      userName: '<img src=x onerror="alert(1)">',
      deals: [{
        address: "<script>alert(1)</script>",
        price: 10,
        deal_score: 80,
        monthly_cash_flow: 1,
        hud_rent: null,
        beds: 1,
        baths: 1,
        zillow_url: "https://zillow.com.evil.test/phish",
      }],
      alertType: "instant",
      appUrl: "javascript:alert(1)",
      unsubscribeUrl: "https://app.example.com/unsubscribe",
    });

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("zillow.com.evil.test");
    expect(html).not.toContain('href="javascript:');
  });
});
