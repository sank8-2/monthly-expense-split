// ============================================================
// SplitKaro — TypeScript Interfaces
// ============================================================

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  upi_id: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profile?: Profile;
}

export type ExpenseCategory =
  | "rent"
  | "groceries"
  | "utilities"
  | "internet"
  | "subscriptions"
  | "food"
  | "transport"
  | "other";

export interface Expense {
  id: string;
  group_id: string;
  paid_by: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  expense_date: string;
  created_at: string;
  paid_by_profile?: Profile;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  share_amount: number;
  is_settled: boolean;
  profile?: Profile;
}

export interface Settlement {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  month: string; // "2026-03"
  is_completed: boolean;
  settled_at: string | null;
  from_profile?: Profile;
  to_profile?: Profile;
}

export interface BalanceSummary {
  user_id: string;
  name: string;
  total_paid: number;
  total_owed: number;
  net_balance: number; // positive = they are owed, negative = they owe
}

export interface DebtEdge {
  from: string;
  from_name: string;
  to: string;
  to_name: string;
  amount: number;
}

export interface MonthlyStats {
  month: string;
  total_expenses: number;
  category_breakdown: Record<ExpenseCategory, number>;
  per_person: Record<string, number>;
}
