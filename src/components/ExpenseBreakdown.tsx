"use client";

import type { ExpenseBreakdownResult } from "@/lib/expenses";

interface ExpenseBreakdownProps {
  expenses: ExpenseBreakdownResult;
  monthlyRent: number;
}

function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

export default function ExpenseBreakdown({ expenses, monthlyRent }: ExpenseBreakdownProps) {
  const cashFlow = monthlyRent - expenses.total;

  const items = [
    { label: "Mortgage (DSCR 25% down, 7.5%)", value: expenses.mortgage },
    { label: `Property Tax (${expenses.sources.tax})`, value: expenses.property_tax },
    { label: `Insurance (${expenses.sources.insurance})`, value: expenses.insurance },
    { label: "Management (10%)", value: expenses.management },
    { label: "Maintenance (5%)", value: expenses.maintenance },
    { label: "Vacancy Reserve (5%)", value: expenses.vacancy },
  ];

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-[#777] uppercase tracking-wider mb-2">
        Expense Breakdown
      </div>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between text-xs">
          <span className="text-[#777] truncate mr-2">{item.label}</span>
          <span className="text-[#e0e0e0] font-[family-name:var(--font-mono)] shrink-0">
            {formatCurrency(item.value)}/mo
          </span>
        </div>
      ))}
      <div className="border-t border-[#222] pt-2 mt-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[#777]">Total Expenses</span>
          <span className="text-white font-[family-name:var(--font-mono)]">
            {formatCurrency(expenses.total)}/mo
          </span>
        </div>
        <div className="flex items-center justify-between text-xs font-bold mt-1">
          <span className="text-[#777]">Net Cash Flow</span>
          <span
            className={`font-[family-name:var(--font-mono)] ${
              cashFlow >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"
            }`}
          >
            {formatCurrency(cashFlow)}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
