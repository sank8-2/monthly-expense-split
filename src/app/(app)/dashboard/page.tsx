"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Receipt,
} from "lucide-react";
import { formatCurrency, getCurrentMonth, getMonthDisplayName, minimizeDebts } from "@/lib/utils";
import { CATEGORY_CONFIG } from "@/lib/constants";
import type { Expense, BalanceSummary, DebtEdge, ExpenseCategory } from "@/types";
import Link from "next/link";
import { AddExpenseModal } from "@/components/AddExpenseModal";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [supabase] = useState(() => createClient());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [debts, setDebts] = useState<DebtEdge[]>([]);
  const [totalThisMonth, setTotalThisMonth] = useState(0);
  const [myShare, setMyShare] = useState(0);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  const currentMonth = getCurrentMonth();

  const loadData = useCallback(async () => {
    if (!user) return;

    // Get user's group
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) return;
    setGroupId(membership.group_id);

    // Get group members with profiles
    const { data: groupMembers } = await supabase
      .from("group_members")
      .select("user_id, profiles(id, name, email)")
      .eq("group_id", membership.group_id);

    const memberList = (groupMembers ?? []).map((m) => {
      // Supabase joins can return profiles as an object or an array of one object
      const profileData = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        id: m.user_id,
        name: (profileData as any)?.name ?? "User",
        email: (profileData as any)?.email ?? "",
      };
    });
    setMembers(memberList);

    // Get this month's expenses
    const startOfMonth = `${currentMonth}-01`;
    const { data: monthExpenses } = await supabase
      .from("expenses")
      .select("*, paid_by_profile:profiles!expenses_paid_by_fkey(name, email), splits:expense_splits(*)")
      .eq("group_id", membership.group_id)
      .gte("expense_date", startOfMonth)
      .order("expense_date", { ascending: false })
      .limit(10);

    setExpenses(monthExpenses ?? []);

    // Calculate totals
    const total = (monthExpenses ?? []).reduce((sum, e) => sum + e.amount, 0);
    setTotalThisMonth(total);

    // Calculate balances for this month
    const balanceMap: Record<string, number> = {};
    memberList.forEach((m) => (balanceMap[m.id] = 0));

    (monthExpenses ?? []).forEach((expense) => {
      const share = expense.amount / memberList.length;
      balanceMap[expense.paid_by] = (balanceMap[expense.paid_by] ?? 0) + expense.amount - share;
      memberList.forEach((m) => {
        if (m.id !== expense.paid_by) {
          balanceMap[m.id] = (balanceMap[m.id] ?? 0) - share;
        }
      });
    });

    // Get month settlements
    const { data: monthSettlements } = await supabase
      .from("settlements")
      .select("amount, from_user, to_user")
      .eq("group_id", membership.group_id)
      .eq("month", currentMonth)
      .eq("is_completed", true);

    (monthSettlements ?? []).forEach((s) => {
      balanceMap[s.from_user] += s.amount;
      balanceMap[s.to_user] -= s.amount;
    });

    const balanceSummaries: BalanceSummary[] = memberList.map((m) => ({
      user_id: m.id,
      name: m.name,
      total_paid: 0,
      total_owed: 0,
      net_balance: balanceMap[m.id] ?? 0,
    }));

    setDebts(minimizeDebts(balanceSummaries));
    setMyShare(total / Math.max(memberList.length, 1));
  }, [user, supabase, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topCategories = expenses.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  const sortedCategories = Object.entries(topCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="px-4 pt-6 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-muted text-sm">Good evening,</p>
          <h1 className="text-2xl font-bold text-text">
            {profile?.name ?? "Friend"} 👋
          </h1>
        </div>
        <Avatar name={profile?.name ?? "U"} size="lg" />
      </div>

      {/* Month Summary Card */}
      <Card variant="gradient" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10" />
        <div className="relative z-10">
          <p className="text-text-muted text-sm mb-1">
            {getMonthDisplayName(currentMonth)}
          </p>
          <p className="text-3xl font-extrabold text-text mb-1">
            {formatCurrency(totalThisMonth)}
          </p>
          <p className="text-text-muted text-sm">
            Your share: <span className="text-primary-light font-semibold">{formatCurrency(myShare)}</span>
          </p>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          fullWidth
          onClick={() => setShowAddExpense(true)}
          className="gap-2"
        >
          <Plus size={18} />
          Add Expense
        </Button>
        <Link href="/settlements" className="w-full">
          <Button variant="outline" size="lg" fullWidth className="gap-2">
            <ArrowRight size={18} />
            Settle Up
          </Button>
        </Link>
      </div>

      {/* Who Owes Whom */}
      {debts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Sparkles size={18} className="text-primary-light" />
            Settlements
          </h2>
          {debts.map((debt, i) => (
            <Card key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={debt.from_name} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-text">
                    {debt.from === user?.id ? "You" : debt.from_name}
                  </p>
                  <p className="text-xs text-text-muted">
                    owes {debt.to === user?.id ? "you" : debt.to_name}
                  </p>
                </div>
              </div>
              <Badge variant={debt.from === user?.id ? "danger" : "success"}>
                {formatCurrency(debt.amount)}
              </Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Top Categories */}
      {sortedCategories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-text">Top Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {sortedCategories.map(([cat, amount]) => {
              const config = CATEGORY_CONFIG[cat as ExpenseCategory];
              const Icon = config?.icon;
              return (
                <Card key={cat} className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config?.gradient} flex items-center justify-center`}
                  >
                    {Icon && <Icon size={18} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">{config?.label}</p>
                    <p className="text-sm font-bold text-text">
                      {formatCurrency(amount)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Recent Expenses</h2>
          <Link
            href="/expenses"
            className="text-primary-light text-sm font-medium"
          >
            See all
          </Link>
        </div>
        {expenses.length === 0 ? (
          <Card className="flex flex-col items-center py-8 text-center">
            <Receipt size={40} className="text-text-dim mb-3" />
            <p className="text-text-muted text-sm">No expenses yet this month</p>
            <p className="text-text-dim text-xs mt-1">
              Tap &quot;Add Expense&quot; to get started
            </p>
          </Card>
        ) : (
          <div className="space-y-2 stagger-children">
            {expenses.slice(0, 5).map((expense) => {
              const config = CATEGORY_CONFIG[expense.category];
              const Icon = config?.icon;
              const isPaidByMe = expense.paid_by === user?.id;
              return (
                <Card key={expense.id} className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config?.gradient} flex items-center justify-center shrink-0`}
                  >
                    {Icon && <Icon size={18} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {expense.description}
                    </p>
                    <p className="text-xs text-text-muted">
                      {isPaidByMe
                        ? "Paid by you"
                        : `Paid by ${(() => {
                            const p = Array.isArray(expense.paid_by_profile) ? expense.paid_by_profile[0] : expense.paid_by_profile;
                            return (p as any)?.name ?? "someone";
                          })()}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-text">
                      {formatCurrency(expense.amount)}
                    </p>
                    <div className="flex items-center gap-0.5 justify-end">
                      {isPaidByMe ? (
                        <TrendingUp size={12} className="text-success" />
                      ) : (
                        <TrendingDown size={12} className="text-danger" />
                      )}
                      <span
                        className={`text-xs ${isPaidByMe ? "text-success" : "text-danger"}`}
                      >
                        {formatCurrency(expense.amount / Math.max(members.length, 1))}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* No Group State */}
      {!groupId && !expenses.length && (
        <Card variant="gradient" className="text-center py-8">
          <Sparkles size={40} className="text-primary-light mx-auto mb-3" />
          <h2 className="text-lg font-bold text-text mb-2">
            Create Your Group
          </h2>
          <p className="text-text-muted text-sm mb-4">
            Set up a group with your roommates to start splitting expenses.
          </p>
          <Link href="/profile">
            <Button>Set Up Group</Button>
          </Link>
        </Card>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed right-5 bottom-24 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus size={26} />
      </button>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groupId={groupId}
        members={members}
        onAdded={loadData}
      />
    </div>
  );
}
