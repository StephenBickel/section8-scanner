#!/usr/bin/env python3
"""FastAPI server wrapping the Section 8 scanner for SSE streaming.

Runs on the Mac mini, exposed via Tailscale Funnel.
Start: uvicorn api_server:app --host 0.0.0.0 --port 8100
"""

import asyncio
import json
import os
import sys
import subprocess

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(title="Section 8 Deal Scanner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vercel frontend
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Find Python with scrapling installed
PYTHON = os.path.expanduser("~/Projects/section8-finder/venv/bin/python3")
if not os.path.exists(PYTHON):
    PYTHON = os.path.expanduser("~/.local/pipx/venvs/scrapling/bin/python3")

SCANNER = os.path.join(os.path.dirname(__file__), "scanner.py")


async def stream_scan(city: str, max_price: int, min_score: float, max_pages: int):
    """Run scanner.py as subprocess and stream SSE events."""
    proc = await asyncio.create_subprocess_exec(
        PYTHON, SCANNER,
        "--city", city,
        "--max-price", str(max_price),
        "--min-score", str(min_score),
        "--max-pages", str(max_pages),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )

    try:
        async for line in proc.stdout:
            text = line.decode().strip()
            if text:
                yield f"data: {text}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    finally:
        await proc.wait()


@app.get("/api/scan")
async def scan(
    city: str = Query(..., description="City slug, e.g. cleveland-oh"),
    maxPrice: int = Query(100000),
    minScore: float = Query(40),
    maxPages: int = Query(3),
):
    return StreamingResponse(
        stream_scan(city, maxPrice, minScore, maxPages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "scanner": os.path.exists(SCANNER)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
