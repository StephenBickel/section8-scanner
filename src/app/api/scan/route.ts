import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Demo data for Vercel deployment (no Python available)
const DEMO_DEALS = [
  { address: "1842 E 93rd St, Cleveland OH 44106", price: 55000, beds: 3, baths: 1, sqft: 1200, hud_rent: 1646, monthly_rent: 1646, dscr: 3.67, monthly_cash_flow: 901, coc_return: 109, score: 98, zillow_url: "https://www.zillow.com/homedetails/1842-E-93rd-St-Cleveland-OH-44106/", mortgage: 448, expenses_total: 297, down_payment: 8250, annual_cash_flow: 10812, rent_to_price: 2.99, zip_code: "44106" },
  { address: "4104 Fulton Rd, Cleveland OH 44144", price: 48000, beds: 3, baths: 1, sqft: 1100, hud_rent: 1646, monthly_rent: 1646, dscr: 4.21, monthly_cash_flow: 987, coc_return: 137, score: 99, zillow_url: "https://www.zillow.com/homedetails/4104-Fulton-Rd-Cleveland-OH-44144/", mortgage: 391, expenses_total: 268, down_payment: 7200, annual_cash_flow: 11844, rent_to_price: 3.43, zip_code: "44144" },
  { address: "3219 W 33rd St, Cleveland OH 44109", price: 69900, beds: 5, baths: 2, sqft: 1800, hud_rent: 1760, monthly_rent: 1760, dscr: 3.06, monthly_cash_flow: 789, coc_return: 75, score: 96, zillow_url: "https://www.zillow.com/homedetails/3219-W-33rd-St-Cleveland-OH-44109/", mortgage: 575, expenses_total: 396, down_payment: 10485, annual_cash_flow: 9468, rent_to_price: 2.52, zip_code: "44109" },
  { address: "480 E 115th St, Cleveland OH 44108", price: 74900, beds: 4, baths: 2, sqft: 1600, hud_rent: 1760, monthly_rent: 1760, dscr: 2.84, monthly_cash_flow: 712, coc_return: 63, score: 94, zillow_url: "https://www.zillow.com/homedetails/480-E-115th-St-Cleveland-OH-44108/35229791_zpid/", mortgage: 620, expenses_total: 428, down_payment: 11235, annual_cash_flow: 8544, rent_to_price: 2.35, zip_code: "44108" },
  { address: "7916 Maryland Ave, Cleveland OH 44105", price: 85000, beds: 5, baths: 2, sqft: 2000, hud_rent: 1760, monthly_rent: 1760, dscr: 2.46, monthly_cash_flow: 584, coc_return: 48, score: 89, zillow_url: "https://www.zillow.com/homedetails/7916-Maryland-Ave-Cleveland-OH-44105/", mortgage: 715, expenses_total: 461, down_payment: 12750, annual_cash_flow: 7008, rent_to_price: 2.07, zip_code: "44105" },
  { address: "5230 Essen Ave, Cleveland OH 44105", price: 92000, beds: 4, baths: 1.5, sqft: 1500, hud_rent: 1760, monthly_rent: 1760, dscr: 2.27, monthly_cash_flow: 512, coc_return: 39, score: 82, zillow_url: "https://www.zillow.com/homedetails/5230-Essen-Ave-Cleveland-OH-44105/", mortgage: 775, expenses_total: 473, down_payment: 13800, annual_cash_flow: 6144, rent_to_price: 1.91, zip_code: "44105" },
  { address: "14309 Triskett Rd, Cleveland OH 44111", price: 62000, beds: 3, baths: 1, sqft: 1050, hud_rent: 1646, monthly_rent: 1646, dscr: 3.18, monthly_cash_flow: 824, coc_return: 88, score: 95, zillow_url: "https://www.zillow.com/homedetails/14309-Triskett-Rd-Cleveland-OH-44111/", mortgage: 517, expenses_total: 305, down_payment: 9300, annual_cash_flow: 9888, rent_to_price: 2.65, zip_code: "44111" },
  { address: "3847 E 71st St, Cleveland OH 44105", price: 45000, beds: 2, baths: 1, sqft: 900, hud_rent: 1279, monthly_rent: 1279, dscr: 3.40, monthly_cash_flow: 710, coc_return: 105, score: 93, zillow_url: "https://www.zillow.com/homedetails/3847-E-71st-St-Cleveland-OH-44105/", mortgage: 376, expenses_total: 193, down_payment: 6750, annual_cash_flow: 8520, rent_to_price: 2.84, zip_code: "44105" },
];

function isVercel(): boolean {
  return !!process.env.VERCEL || !!process.env.VERCEL_ENV;
}

function getPythonPath(): string {
  const venvPath = join(
    process.env.HOME || "~",
    "Projects/section8-finder/venv/bin/python3"
  );
  if (existsSync(venvPath)) return venvPath;

  const scraplingPath = join(
    process.env.HOME || "~",
    ".local/pipx/venvs/scrapling/bin/python3"
  );
  if (existsSync(scraplingPath)) return scraplingPath;

  return "python3";
}

async function* demoStream() {
  const encoder = new TextEncoder();
  yield encoder.encode(`data: ${JSON.stringify({ type: "progress", page: 1, total_pages: 1, count: 0 })}\n\n`);

  for (let i = 0; i < DEMO_DEALS.length; i++) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    yield encoder.encode(`data: ${JSON.stringify({ type: "progress", page: 1, total_pages: 1, count: i + 1 })}\n\n`);
    yield encoder.encode(`data: ${JSON.stringify({ type: "property", data: DEMO_DEALS[i] })}\n\n`);
  }

  yield encoder.encode(`data: ${JSON.stringify({ type: "done", total: DEMO_DEALS.length, deals: DEMO_DEALS.length, demo: true })}\n\n`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "cleveland-oh";
  const maxPrice = searchParams.get("maxPrice") || "100000";
  const minScore = searchParams.get("minScore") || "40";
  const maxPages = searchParams.get("maxPages") || "3";

  if (!/^[a-z0-9-]+$/i.test(city)) {
    return new Response(JSON.stringify({ error: "Invalid city format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // On Vercel: return demo data (no Python runtime)
  if (isVercel()) {
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of demoStream()) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Local: run Python scanner subprocess
  const pythonPath = getPythonPath();
  const scannerPath = join(process.cwd(), "scanner.py");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn(pythonPath, [
        scannerPath,
        "--city", city,
        "--max-price", maxPrice,
        "--min-score", minScore,
        "--max-pages", maxPages,
      ], {
        env: { ...process.env },
      });

      let buffer = "";

      proc.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) {
            controller.enqueue(encoder.encode(`data: ${line}\n\n`));
          }
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        const msg = chunk.toString().trim();
        if (msg) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "log", message: msg })}\n\n`)
          );
        }
      });

      proc.on("close", (code) => {
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(`data: ${buffer}\n\n`));
        }
        if (code !== 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: `Scanner exited with code ${code}` })}\n\n`)
          );
        }
        controller.close();
      });

      proc.on("error", (err) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`)
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
