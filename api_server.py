#!/usr/bin/env python3
"""Authenticated FastAPI wrapper for the Section 8 scanner."""

import asyncio
import json
import logging
import os
import re
import secrets
import subprocess
import sys

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

LOGGER = logging.getLogger("section8-scanner")
CITY_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SCANNER = os.getenv("SCANNER_SCRIPT", os.path.join(os.path.dirname(__file__), "scanner.py"))
PYTHON = os.getenv("SCANNER_PYTHON", sys.executable)
SCAN_TIMEOUT_SECONDS = min(max(int(os.getenv("SCANNER_TIMEOUT_SECONDS", "280")), 10), 290)
MAX_CONCURRENT_SCANS = min(max(int(os.getenv("SCANNER_MAX_CONCURRENT", "1")), 1), 10)
SCAN_SEMAPHORE = asyncio.Semaphore(MAX_CONCURRENT_SCANS)

app = FastAPI(title="Section 8 Deal Scanner API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["GET"],
        allow_headers=["Accept", "Cache-Control", "X-Scanner-Key"],
    )


def require_scanner_key(
    supplied_key: str | None = Header(default=None, alias="X-Scanner-Key"),
) -> None:
    """Reject live scans unless the caller knows the configured shared key."""
    configured_key = os.getenv("SCANNER_API_KEY")
    if not configured_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Scanner API key is not configured",
        )
    if supplied_key is None or not secrets.compare_digest(supplied_key, configured_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )


async def stream_scan(city: str, max_price: int, min_score: float, max_pages: int):
    """Run scanner.py with bounded concurrency and stream only its JSON stdout."""
    async with SCAN_SEMAPHORE:
        proc = await asyncio.create_subprocess_exec(
            PYTHON,
            SCANNER,
            "--city", city,
            "--max-price", str(max_price),
            "--min-score", str(min_score),
            "--max-pages", str(max_pages),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={**os.environ, "PYTHONUNBUFFERED": "1"},
        )

        async def drain_stderr() -> None:
            assert proc.stderr is not None
            saw_output = False
            async for _ in proc.stderr:
                saw_output = True
            if saw_output:
                LOGGER.warning("Scanner subprocess wrote diagnostic output")

        stderr_task = asyncio.create_task(drain_stderr())
        try:
            assert proc.stdout is not None
            async with asyncio.timeout(SCAN_TIMEOUT_SECONDS):
                async for line in proc.stdout:
                    text = line.decode("utf-8", errors="replace").strip()
                    if text:
                        yield f"data: {text}\n\n"
                return_code = await proc.wait()
                if return_code != 0:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Scanner failed'})}\n\n"
        except TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Scanner timed out'})}\n\n"
        except asyncio.CancelledError:
            raise
        except Exception:
            LOGGER.exception("Scanner subprocess failed")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Scanner unavailable'})}\n\n"
        finally:
            if proc.returncode is None:
                proc.terminate()
                try:
                    await asyncio.wait_for(proc.wait(), timeout=5)
                except TimeoutError:
                    proc.kill()
                    await proc.wait()
            await stderr_task


@app.get("/api/scan", dependencies=[Depends(require_scanner_key)])
async def scan(
    city: str = Query(..., min_length=1, max_length=80, pattern=CITY_PATTERN.pattern),
    maxPrice: int = Query(100000, ge=1, le=5000000),
    minScore: float = Query(40, ge=0, le=100),
    maxPages: int = Query(3, ge=1, le=10),
):
    return StreamingResponse(
        stream_scan(city, maxPrice, minScore, maxPages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "scanner": os.path.isfile(SCANNER)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8100)
