"use client";

import { ExternalLink, Users, Building2, DollarSign, Shield, Landmark } from "lucide-react";
import { RESOURCE_CATEGORIES } from "@/lib/resources";

const ICON_MAP: Record<string, React.ElementType> = {
  users: Users,
  building: Building2,
  dollar: DollarSign,
  shield: Shield,
  government: Landmark,
};

export default function ResourceLinks() {
  return (
    <div>
      <h2 className="text-sm text-[#777] uppercase tracking-widest mb-4">
        Investor Resources
      </h2>
      <div className="grid md:grid-cols-2 gap-4">
        {RESOURCE_CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.icon] ?? ExternalLink;
          return (
            <div
              key={cat.category}
              className="bg-[#111] border border-[#222] rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon size={14} className="text-[#00ff88]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {cat.category}
                </span>
              </div>
              <div className="space-y-2">
                {cat.resources.map((resource) => (
                  <a
                    key={resource.name}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 group"
                  >
                    <ExternalLink
                      size={10}
                      className="text-[#555] mt-1 shrink-0 group-hover:text-[#00ff88]"
                    />
                    <div>
                      <span className="text-xs text-[#e0e0e0] group-hover:text-[#00ff88] transition-colors">
                        {resource.name}
                      </span>
                      <p className="text-[10px] text-[#555]">
                        {resource.description}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
