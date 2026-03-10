"use client";

import { useState, useRef, useEffect } from "react";
import { TOP_MARKETS, type CityOption } from "@/lib/cities";
import { ChevronDown } from "lucide-react";

interface CitySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CitySelector({ value, onChange }: CitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = TOP_MARKETS.find((c) => c.value === value);

  const filtered = search
    ? TOP_MARKETS.filter(
        (c) =>
          c.label.toLowerCase().includes(search.toLowerCase()) ||
          c.state.toLowerCase().includes(search.toLowerCase()) ||
          c.value.toLowerCase().includes(search.toLowerCase())
      )
    : TOP_MARKETS;

  // Check if user typed a custom city value (city-state format)
  const isCustomFormat = /^[a-z0-9]+-[a-z]{2}$/i.test(search.trim());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (city: CityOption) => {
    onChange(city.value);
    setSearch("");
    setOpen(false);
  };

  const handleCustomSubmit = () => {
    const custom = search.trim().toLowerCase();
    if (custom) {
      onChange(custom);
      setSearch("");
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-sm font-[family-name:var(--font-mono)] focus:border-[#00ff88] focus:outline-none transition-colors text-left"
      >
        <span className={selected ? "text-white" : "text-[#555]"}>
          {selected ? `${selected.label}, ${selected.state}` : value || "Select city..."}
        </span>
        <ChevronDown
          size={14}
          className={`text-[#555] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#222] rounded-lg shadow-xl z-50 max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-[#222]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (filtered.length > 0) {
                    handleSelect(filtered[0]);
                  } else if (isCustomFormat) {
                    handleCustomSubmit();
                  }
                }
              }}
              placeholder="Search cities or type city-st..."
              className="w-full px-2 py-1.5 bg-[#111] border border-[#222] rounded text-xs text-white font-[family-name:var(--font-mono)] focus:outline-none focus:border-[#00ff88]"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map((city) => (
              <button
                key={city.value}
                onClick={() => handleSelect(city)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-[rgba(0,255,136,0.05)] transition-colors flex items-center justify-between ${
                  value === city.value ? "text-[#00ff88]" : "text-[#e0e0e0]"
                }`}
              >
                <span>
                  {city.label}, {city.state}
                </span>
                <span className="text-[10px] text-[#555] font-[family-name:var(--font-mono)]">
                  {city.value}
                </span>
              </button>
            ))}
            {filtered.length === 0 && isCustomFormat && (
              <button
                onClick={handleCustomSubmit}
                className="w-full text-left px-3 py-2 text-xs text-[#00ff88] hover:bg-[rgba(0,255,136,0.05)]"
              >
                Use custom: <span className="font-[family-name:var(--font-mono)]">{search.trim().toLowerCase()}</span>
              </button>
            )}
            {filtered.length === 0 && !isCustomFormat && (
              <div className="px-3 py-4 text-xs text-[#555] text-center">
                No matches. Type in <span className="font-[family-name:var(--font-mono)]">city-st</span> format for custom cities.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
