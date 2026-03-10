#!/usr/bin/env python3
"""Section 8 deal scanner — streams JSON lines to stdout for the web app."""

import sys
import os
import json
import argparse

# Add section8-finder to path
sys.path.insert(0, os.path.expanduser("~/Projects/section8-finder"))

from zillow import search_properties
from hud import get_rent_for_beds
from scorer import score_deal
from config import LOAN_ASSUMPTIONS


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--city", required=True)
    parser.add_argument("--max-price", type=int, default=100000)
    parser.add_argument("--min-score", type=float, default=40)
    parser.add_argument("--max-pages", type=int, default=3)
    args = parser.parse_args()

    # Flush stdout immediately (important for streaming)
    sys.stdout.reconfigure(line_buffering=True)

    # Redirect print statements from zillow.py etc to stderr so stdout stays clean JSON
    old_stdout = sys.stdout
    sys.stdout = sys.stderr

    try:
        emit = lambda obj: print(json.dumps(obj), file=old_stdout, flush=True)

        emit({"type": "progress", "page": 0, "total_pages": args.max_pages, "count": 0})

        props = search_properties(args.city, max_price=args.max_price, max_pages=args.max_pages)

        emit({"type": "progress", "page": args.max_pages, "total_pages": args.max_pages, "count": len(props)})

        deals = []
        for i, prop in enumerate(props):
            beds = prop.get("beds", 3)
            price = prop.get("price", 0)
            if price <= 0:
                continue

            # Try HUD FMR first, fall back to Rent Zestimate
            hud_rent = get_rent_for_beds(args.city, beds)
            rent = hud_rent or prop.get("rent_zestimate") or 0
            if rent <= 0:
                continue

            # score_deal takes (price, monthly_rent, beds)
            result = score_deal(price, rent, beds)
            if result is None:
                continue

            # Enrich with property info
            result["address"] = prop.get("address", "Unknown")
            result["beds"] = beds
            result["baths"] = prop.get("baths", 0)
            result["sqft"] = prop.get("sqft", 0)
            result["zip_code"] = prop.get("zip_code", "")
            result["hud_rent"] = rent
            result["zillow_url"] = prop.get("url", "")
            result["score"] = result.pop("deal_score")
            result["coc_return"] = result.pop("cash_on_cash")

            emit({"type": "progress", "page": args.max_pages, "total_pages": args.max_pages, "count": i + 1})

            if result["score"] >= args.min_score:
                deals.append(result)
                emit({"type": "property", "data": result})

        emit({"type": "done", "total": len(props), "deals": len(deals)})

    finally:
        sys.stdout = old_stdout


if __name__ == "__main__":
    main()
