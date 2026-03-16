interface ExportDeal {
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
  listing_type?: string;
}

export function exportToCSV(deals: ExportDeal[], filename: string = "section8-deals") {
  const headers = [
    "Rank",
    "Address",
    "Price",
    "Beds",
    "Baths",
    "Sqft",
    "HUD Rent",
    "DSCR",
    "Monthly Cash Flow",
    "Annual Cash Flow",
    "CoC Return %",
    "Score",
    "Down Payment",
    "Mortgage",
    "Total Expenses",
    "Rent-to-Price %",
    "Zip Code",
    "Listing Type",
    "Zillow URL",
  ];

  const rows = deals.map((d, i) => [
    i + 1,
    `"${d.address}"`,
    d.price,
    d.beds,
    d.baths,
    d.sqft,
    d.hud_rent,
    d.dscr.toFixed(2),
    d.monthly_cash_flow.toFixed(0),
    d.annual_cash_flow.toFixed(0),
    d.coc_return.toFixed(1),
    d.score,
    d.down_payment.toFixed(0),
    d.mortgage.toFixed(0),
    d.expenses_total.toFixed(0),
    d.rent_to_price.toFixed(2),
    d.zip_code,
    d.listing_type || "standard",
    d.zillow_url,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadFile(csv, `${filename}.csv`, "text/csv");
}

export function exportToJSON(deals: ExportDeal[], filename: string = "section8-deals") {
  const json = JSON.stringify(deals, null, 2);
  downloadFile(json, `${filename}.json`, "application/json");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
