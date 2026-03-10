interface AlertDeal {
  address: string;
  price: number;
  deal_score: number;
  monthly_cash_flow: number;
  hud_rent: number | null;
  beds: number;
  baths: number;
  zillow_url: string | null;
}

interface AlertEmailOptions {
  userName: string;
  deals: AlertDeal[];
  alertType: "instant" | "daily" | "weekly";
  appUrl: string;
  unsubscribeUrl: string;
}

function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function scoreColor(score: number): string {
  if (score >= 90) return "#00ff88";
  if (score >= 75) return "#aaff44";
  if (score >= 60) return "#ffcc00";
  return "#ff4444";
}

function scoreGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function dealCardHtml(deal: AlertDeal): string {
  const cashFlowColor = deal.monthly_cash_flow >= 0 ? "#00ff88" : "#ff4444";
  return `
    <div style="background:#111;border:1px solid #222;border-radius:8px;padding:20px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="color:#e0e0e0;font-size:15px;font-weight:600;margin-bottom:4px;">${deal.address}</div>
          <div style="color:#777;font-size:12px;">${deal.beds}bd / ${deal.baths}ba</div>
        </div>
        <div style="background:rgba(0,0,0,0.3);border:1px solid ${scoreColor(deal.deal_score)};border-radius:6px;padding:4px 10px;text-align:center;">
          <div style="color:${scoreColor(deal.deal_score)};font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;">${deal.deal_score}</div>
          <div style="color:#777;font-size:9px;text-transform:uppercase;letter-spacing:1px;">${scoreGrade(deal.deal_score)}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#777;font-size:12px;">Price</td>
          <td style="padding:6px 0;color:#e0e0e0;font-size:13px;font-weight:600;text-align:right;font-family:'JetBrains Mono',monospace;">${formatCurrency(deal.price)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#777;font-size:12px;">Monthly Cash Flow</td>
          <td style="padding:6px 0;color:${cashFlowColor};font-size:13px;font-weight:600;text-align:right;font-family:'JetBrains Mono',monospace;">${formatCurrency(deal.monthly_cash_flow)}/mo</td>
        </tr>
        ${deal.hud_rent ? `<tr>
          <td style="padding:6px 0;color:#777;font-size:12px;">HUD Payment Standard</td>
          <td style="padding:6px 0;color:#00ff88;font-size:13px;font-weight:600;text-align:right;font-family:'JetBrains Mono',monospace;">${formatCurrency(deal.hud_rent)}/mo</td>
        </tr>` : ""}
      </table>
      ${deal.zillow_url ? `<a href="${deal.zillow_url}" style="display:inline-block;margin-top:12px;color:#00ff88;font-size:12px;text-decoration:none;border-bottom:1px solid rgba(0,255,136,0.3);">View on Zillow &rarr;</a>` : ""}
    </div>
  `;
}

export function generateAlertEmailHtml(options: AlertEmailOptions): string {
  const { userName, deals, alertType, appUrl, unsubscribeUrl } = options;

  const subjectMap = {
    instant: `New Section 8 Deal${deals.length > 1 ? "s" : ""} Found`,
    daily: "Daily Deal Digest",
    weekly: "Weekly Deal Summary",
  };

  const title = subjectMap[alertType];
  const dealCards = deals.map(dealCardHtml).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <!-- Header -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#00ff88;"></div>
        <span style="color:white;font-size:14px;font-weight:700;letter-spacing:-0.5px;">Section 8 Scanner</span>
      </div>
      <h1 style="color:white;font-size:22px;font-weight:700;margin:0 0 6px 0;">${title}</h1>
      <p style="color:#777;font-size:13px;margin:0;">Hey ${userName}, we found ${deals.length} deal${deals.length > 1 ? "s" : ""} matching your criteria.</p>
    </div>

    <!-- Deal Cards -->
    ${dealCards}

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="${appUrl}" style="display:inline-block;background:#00ff88;color:#000;font-size:13px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:8px;text-transform:uppercase;letter-spacing:0.5px;">
        View Deal${deals.length > 1 ? "s" : ""} &rarr;
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #222;padding-top:20px;margin-top:20px;">
      <p style="color:#555;font-size:11px;margin:0;">
        You received this because you have alerts enabled on Section 8 Scanner.
        <a href="${unsubscribeUrl}" style="color:#555;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateAlertEmailSubject(alertType: "instant" | "daily" | "weekly", dealCount: number): string {
  switch (alertType) {
    case "instant":
      return `🏠 New Section 8 Deal${dealCount > 1 ? "s" : ""} Found`;
    case "daily":
      return `📊 Daily Digest: ${dealCount} new deal${dealCount > 1 ? "s" : ""}`;
    case "weekly":
      return `📈 Weekly Summary: ${dealCount} deal${dealCount > 1 ? "s" : ""} this week`;
  }
}
