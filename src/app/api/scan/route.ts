import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";

import { parseScanRequest, toScanSearchParams } from "@/lib/security/scan-request";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ScannerMode = "demo" | "local" | "remote";

const DEMO_DEALS = [
  { address: "4104 Fulton Rd, Cleveland OH 44144", price: 48000, beds: 3, baths: 1, sqft: 1100, hud_rent: 1646, monthly_rent: 1646, dscr: 4.21, monthly_cash_flow: 987, coc_return: 137, score: 99, zillow_url: "https://www.zillow.com/", mortgage: 391, expenses_total: 268, down_payment: 7200, annual_cash_flow: 11844, rent_to_price: 3.43, zip_code: "44144", listing_type: "standard" },
  { address: "1842 E 93rd St, Cleveland OH 44106", price: 55000, beds: 3, baths: 1, sqft: 1200, hud_rent: 1646, monthly_rent: 1646, dscr: 3.67, monthly_cash_flow: 901, coc_return: 109, score: 98, zillow_url: "https://www.zillow.com/", mortgage: 448, expenses_total: 297, down_payment: 8250, annual_cash_flow: 10812, rent_to_price: 2.99, zip_code: "44106", listing_type: "foreclosure" },
];

let activeLocalScans = 0;

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  };
}

function scannerMode(): ScannerMode | null {
  const value = process.env.SCANNER_MODE || "demo";
  return value === "demo" || value === "local" || value === "remote" ? value : null;
}

function configuredConcurrency(): number {
  const parsed = Number(process.env.SCANNER_MAX_CONCURRENT || "1");
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 1;
}

async function* demoStream(encoder: TextEncoder) {
  yield encoder.encode(`data: ${JSON.stringify({ type: "progress", page: 1, total_pages: 1, count: 0 })}\n\n`);
  for (let index = 0; index < DEMO_DEALS.length; index += 1) {
    yield encoder.encode(`data: ${JSON.stringify({ type: "progress", page: 1, total_pages: 1, count: index + 1 })}\n\n`);
    yield encoder.encode(`data: ${JSON.stringify({ type: "property", data: DEMO_DEALS[index] })}\n\n`);
  }
  yield encoder.encode(`data: ${JSON.stringify({ type: "done", total: DEMO_DEALS.length, deals: DEMO_DEALS.length, demo: true })}\n\n`);
}

function demoResponse(encoder: TextEncoder): Response {
  return new Response(new ReadableStream({
    async start(controller) {
      for await (const chunk of demoStream(encoder)) controller.enqueue(chunk);
      controller.close();
    },
  }), { headers: sseHeaders() });
}

async function remoteResponse(query: URLSearchParams, request: NextRequest): Promise<Response> {
  const baseUrl = process.env.SCANNER_API_URL || process.env.MAC_MINI_API_URL;
  const apiKey = process.env.SCANNER_API_KEY;
  if (!baseUrl || !apiKey) {
    return jsonError("Remote scanner is not configured", 503);
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL("/api/scan", baseUrl);
    if (!['http:', 'https:'].includes(upstreamUrl.protocol)) throw new Error("unsupported protocol");
  } catch {
    return jsonError("Remote scanner is not configured", 503);
  }
  upstreamUrl.search = query.toString();

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Scanner-Key": apiKey,
      },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(290_000)]),
    });
    if (!upstream.ok || !upstream.body) {
      console.error("Remote scanner returned a non-success response", upstream.status);
      return jsonError("Scanner unavailable", 502);
    }
    return new Response(upstream.body, { headers: sseHeaders() });
  } catch {
    console.error("Remote scanner request failed");
    return jsonError("Scanner unavailable", 502);
  }
}

function localResponse(
  query: ReturnType<typeof parseScanRequest>,
  encoder: TextEncoder,
  request: NextRequest
): Response {
  const scannerPath = process.env.SCANNER_SCRIPT || join(process.cwd(), "scanner.py");
  if (!existsSync(/* turbopackIgnore: true */ scannerPath)) return jsonError("Local scanner is not configured", 503);
  if (activeLocalScans >= configuredConcurrency()) return jsonError("Scanner is busy", 429);

  activeLocalScans += 1;
  let released = false;
  let child: ReturnType<typeof spawn> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const release = () => {
    if (!released) {
      released = true;
      activeLocalScans -= 1;
    }
    if (timeout) clearTimeout(timeout);
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let buffer = "";
      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
        release();
      };
      const abort = () => {
        child?.kill("SIGTERM");
        close();
      };
      request.signal.addEventListener("abort", abort, { once: true });

      const proc = spawn(/* turbopackIgnore: true */ process.env.SCANNER_PYTHON || "python3", [
        scannerPath,
        "--city", query.city,
        "--max-price", String(query.maxPrice),
        "--min-score", String(query.minScore),
        "--max-pages", String(query.maxPages),
      ], { env: { ...process.env } });
      child = proc;

      timeout = setTimeout(() => {
        child?.kill("SIGTERM");
        if (!closed) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Scanner timed out" })}\n\n`));
        }
      }, 280_000);

      proc.stdout.on("data", (chunk: Buffer) => {
        if (closed) return;
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) controller.enqueue(encoder.encode(`data: ${line}\n\n`));
        }
      });
      proc.stderr.on("data", () => {
        console.error("Local scanner wrote diagnostic output");
      });
      proc.on("close", (code) => {
        if (!closed && buffer.trim()) controller.enqueue(encoder.encode(`data: ${buffer}\n\n`));
        if (!closed && code !== 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Scanner failed" })}\n\n`));
        }
        request.signal.removeEventListener("abort", abort);
        close();
      });
      proc.on("error", () => {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Scanner unavailable" })}\n\n`));
        request.signal.removeEventListener("abort", abort);
        close();
      });
    },
    cancel() {
      child?.kill("SIGTERM");
      release();
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

export async function GET(request: NextRequest) {
  let scanRequest: ReturnType<typeof parseScanRequest>;
  try {
    scanRequest = parseScanRequest(new URL(request.url).searchParams);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid scan request", 400);
  }

  const mode = scannerMode();
  if (!mode) return jsonError("Invalid scanner configuration", 503);

  const encoder = new TextEncoder();
  if (mode === "demo") return demoResponse(encoder);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  if (mode === "remote") {
    return remoteResponse(toScanSearchParams(scanRequest), request);
  }
  return localResponse(scanRequest, encoder, request);
}
