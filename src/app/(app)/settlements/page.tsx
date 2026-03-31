"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  Check,
  Sparkles,
  ArrowLeftRight,
  Send,
} from "lucide-react";
import {
  formatCurrency,
  getCurrentMonth,
  getMonthDisplayName,
  minimizeDebts,
} from "@/lib/utils";
import type { BalanceSummary, DebtEdge } from "@/types";

export default function SettlementsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [debts, setDebts] = useState<DebtEdge[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);
  const [settled, setSettled] = useState<string[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const currentMonth = getCurrentMonth();

  const loadData = useCallback(async () => {
    if (!user) return;

    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) return;
    setGroupId(membership.group_id);

    const { data: groupMembers } = await supabase
      .from("group_members")
      .select("user_id, profiles(id, name, email)")
      .eq("group_id", membership.group_id);

    const memberList = (groupMembers ?? []).map((m) => ({
      id: m.user_id,
      name: (m.profiles as unknown as { name: string })?.name ?? "User",
    }));
    setMembers(memberList);

    // Get this month's expenses
    const startOfMonth = `${currentMonth}-01`;
    const { data: monthExpenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("group_id", membership.group_id)
      .gte("expense_date", startOfMonth);

    // Calculate balances
    const balanceMap: Record<string, number> = {};
    memberList.forEach((m) => (balanceMap[m.id] = 0));

    (monthExpenses ?? []).forEach((expense) => {
      const share = expense.amount / memberList.length;
      balanceMap[expense.paid_by] =
        (balanceMap[expense.paid_by] ?? 0) + expense.amount - share;
      memberList.forEach((m) => {
        if (m.id !== expense.paid_by) {
          balanceMap[m.id] = (balanceMap[m.id] ?? 0) - share;
        }
      });
    });

    // Load existing settlements
    const { data: existingSettlements } = await supabase
      .from("settlements")
      .select("id, from_user, to_user, amount")
      .eq("group_id", membership.group_id)
      .eq("month", currentMonth)
      .eq("is_completed", true);

    (existingSettlements ?? []).forEach((s) => {
      // from_user paid to_user
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
    setSettled([]);
  }, [user, supabase, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markSettled = async (debt: DebtEdge) => {
    if (!groupId) return;
    const key = `${debt.from}-${debt.to}`;
    setSettling(key);

    await supabase.from("settlements").insert({
      group_id: groupId,
      from_user: debt.from,
      to_user: debt.to,
      amount: debt.amount,
      month: currentMonth,
      is_completed: true,
      settled_at: new Date().toISOString(),
    });

    setSettled((prev) => [...prev, key]);
    setSettling(null);
    await loadData();
  };

  const sendSummaryEmail = async () => {
    if (!groupId) return;
    setSendingEmail(true);
    try {
      await fetch("/api/send-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, month: currentMonth }),
      });
    } catch {
      // silent fail
    }
    setSendingEmail(false);
  };

  const allSettled = debts.length > 0 && debts.every(
    (d) => settled.includes(`${d.from}-${d.to}`)
  );

  return (
    <div className="px-4 pt-6 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Settle Up</h1>
          <p className="text-text-muted text-sm">
            {getMonthDisplayName(currentMonth)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={sendSummaryEmail}
          isLoading={sendingEmail}
          className="gap-1.5"
        >
          <Send size={14} />
          Email
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          Member Balances
        </h2>
        <div className="space-y-2 stagger-children">
          {members.map((member) => {
            const debt = debts.find(
              (d) => d.from === member.id || d.to === member.id
            );
            const owes = debts
              .filter((d) => d.from === member.id)
              .reduce((sum, d) => sum + d.amount, 0);
            const owed = debts
              .filter((d) => d.to === member.id)
              .reduce((sum, d) => sum + d.amount, 0);
            const net = owed - owes;

            return (
              <Card key={member.id} className="flex items-center gap-3">
                <Avatar name={member.name} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text">
                    {member.id === user?.id ? "You" : member.name}
                  </p>
                </div>
                <Badge
                  variant={
                    net > 0.01
                      ? "success"
                      : net < -0.01
                        ? "danger"
                        : "default"
                  }
                >
                  {net > 0.01
                    ? `Gets ${formatCurrency(net)}`
                    : net < -0.01
                      ? `Owes ${formatCurrency(Math.abs(net))}`
                      : "Settled ✓"}
                </Badge>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Settlement Transactions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <ArrowLeftRight size={14} />
          Transactions Needed
        </h2>

        {debts.length === 0 ? (
          <Card className="text-center py-8">
            <Sparkles size={32} className="text-success mx-auto mb-2" />
            <p className="text-text font-semibold">All settled!</p>
            <p className="text-text-muted text-sm">
              No outstanding balances this month.
            </p>
          </Card>
        ) : (
          <div className="space-y-3 stagger-children">
            {debts.map((debt) => {
              const key = `${debt.from}-${debt.to}`;
              const isSettled = settled.includes(key);
              const isSettling = settling === key;

              return (
                <Card
                  key={key}
                  className={`relative overflow-hidden ${isSettled ? "opacity-60" : ""}`}
                >
                  {isSettled && (
                    <div className="absolute inset-0 bg-success/5 pointer-events-none" />
                  )}
                  <div className="flex items-center gap-3">
                    <Avatar name={debt.from_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text truncate">
                          {debt.from === user?.id ? "You" : debt.from_name}
                        </p>
                        <ArrowRight size={14} className="text-text-dim shrink-0" />
                        <p className="text-sm font-semibold text-text truncate">
                          {debt.to === user?.id ? "You" : debt.to_name}
                        </p>
                      </div>
                      <p className="text-lg font-extrabold text-primary-light">
                        {formatCurrency(debt.amount)}
                      </p>
                    </div>
                    <Button
                      variant={isSettled ? "ghost" : "primary"}
                      size="sm"
                      onClick={() => !isSettled && markSettled(debt)}
                      isLoading={isSettling}
                      disabled={isSettled}
                      className="shrink-0"
                    >
                      {isSettled ? (
                        <Check size={16} />
                      ) : (
                        "Settle"
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {allSettled && (
          <Card variant="gradient" className="text-center py-6 animate-fade-in">
            <Check size={40} className="text-success mx-auto mb-2" />
            <p className="text-text font-bold text-lg">All Settled! 🎉</p>
            <p className="text-text-muted text-sm mt-1">
              Everyone is square for {getMonthDisplayName(currentMonth)}.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
