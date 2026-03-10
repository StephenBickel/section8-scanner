"use client";

interface CrimeGradeBadgeProps {
  grade: string;
  size?: "sm" | "md";
}

function gradeColor(grade: string): string {
  switch (grade.toUpperCase()) {
    case "A":
      return "bg-[rgba(0,255,136,0.15)] text-[#00ff88] border-[rgba(0,255,136,0.3)]";
    case "B":
      return "bg-[rgba(170,255,68,0.12)] text-[#aaff44] border-[rgba(170,255,68,0.3)]";
    case "C":
      return "bg-[rgba(255,204,0,0.12)] text-[#ffcc00] border-[rgba(255,204,0,0.3)]";
    case "D":
      return "bg-[rgba(255,136,0,0.12)] text-[#ff8800] border-[rgba(255,136,0,0.3)]";
    case "F":
      return "bg-[rgba(255,68,68,0.12)] text-[#ff4444] border-[rgba(255,68,68,0.3)]";
    default:
      return "bg-[rgba(119,119,119,0.12)] text-[#777] border-[rgba(119,119,119,0.3)]";
  }
}

export default function CrimeGradeBadge({ grade, size = "sm" }: CrimeGradeBadgeProps) {
  const sizeClass = size === "md"
    ? "w-8 h-8 text-sm"
    : "w-6 h-6 text-[10px]";

  return (
    <span
      className={`inline-flex items-center justify-center rounded border font-bold font-[family-name:var(--font-mono)] ${sizeClass} ${gradeColor(grade)}`}
      title={`Crime Grade: ${grade.toUpperCase()}`}
    >
      {grade.toUpperCase()}
    </span>
  );
}
