import type { BalanceSummary, DebtEdge } from "@/types";

/**
 * Format currency in INR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string to readable format
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date string to "Today", "Yesterday", or the date
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatDate(dateStr);
}

/**
 * Get current month string in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get month display name from YYYY-MM format
 */
export function getMonthDisplayName(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/**
 * Minimize debt transactions using the simplification algorithm.
 * Given balances, returns the minimum number of transactions needed.
 */
export function minimizeDebts(balances: BalanceSummary[]): DebtEdge[] {
  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors = balances
    .filter((b) => b.net_balance > 0)
    .map((b) => ({ ...b }));
  const debtors = balances
    .filter((b) => b.net_balance < 0)
    .map((b) => ({ ...b, net_balance: Math.abs(b.net_balance) }));

  const edges: DebtEdge[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].net_balance, creditors[j].net_balance);

    if (amount > 0.01) {
      edges.push({
        from: debtors[i].user_id,
        from_name: debtors[i].name,
        to: creditors[j].user_id,
        to_name: creditors[j].name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtors[i].net_balance -= amount;
    creditors[j].net_balance -= amount;

    if (debtors[i].net_balance < 0.01) i++;
    if (creditors[j].net_balance < 0.01) j++;
  }

  return edges;
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Merge classNames conditionally
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
