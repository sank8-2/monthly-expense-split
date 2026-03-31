"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { EditExpenseModal } from "@/components/EditExpenseModal";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Filter,
  Edit2,
  User,
} from "lucide-react";
import {
  formatCurrency,
  formatRelativeDate,
  getCurrentMonth,
  getMonthDisplayName,
} from "@/lib/utils";
import { CATEGORY_CONFIG, MONTHS } from "@/lib/constants";
import type { Expense, ExpenseCategory } from "@/types";

export default function ExpensesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "all">("all");
  const [filterPerson, setFilterPerson] = useState<string>("all");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPersonFilter, setShowPersonFilter] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

    setMembers(
      (groupMembers ?? []).map((m) => ({
        id: m.user_id,
        name: (m.profiles as unknown as { name: string })?.name ?? "User",
      }))
    );

    let query = supabase
      .from("expenses")
      .select(
        "*, paid_by_profile:profiles!expenses_paid_by_fkey(name, email)"
      )
      .eq("group_id", membership.group_id)
      .gte("expense_date", `${selectedMonth}-01`)
      .lt(
        "expense_date",
        `${selectedMonth === "2026-12" ? "2027-01" : `${selectedMonth.split("-")[0]}-${String(parseInt(selectedMonth.split("-")[1]) + 1).padStart(2, "0")}`}-01`
      )
      .order("expense_date", { ascending: false });

    if (filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    if (filterPerson !== "all") {
      query = query.eq("paid_by", filterPerson);
    }

    const { data } = await query;
    setExpenses(data ?? []);
  }, [user, supabase, selectedMonth, filterCategory, filterPerson]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deleteExpense = async (id: string) => {
    setDeleting(id);
    await supabase.from("expense_splits").delete().eq("expense_id", id);
    await supabase.from("expenses").delete().eq("id", id);
    setDeleting(null);
    loadData();
  };

  // Group expenses by date
  const grouped = expenses.reduce(
    (acc, expense) => {
      const dateKey = expense.expense_date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(expense);
      return acc;
    },
    {} as Record<string, Expense[]>
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="px-4 pt-6 space-y-5 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Expenses</h1>
        <Button size="sm" onClick={() => setShowAddExpense(true)} className="gap-1.5">
          <Plus size={16} />
          Add
        </Button>
      </div>

      {/* Month selector + Total */}
      <Card variant="glass" className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">Total</p>
          <p className="text-xl font-extrabold text-text">
            {formatCurrency(total)}
          </p>
        </div>
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none bg-surface-elevated border border-border rounded-xl pl-3 pr-8 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const year = new Date().getFullYear();
              const month = `${year}-${String(i + 1).padStart(2, "0")}`;
              return (
                <option key={month} value={month}>
                  {MONTHS[i]}
                </option>
              );
            })}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setShowFilters(!showFilters);
            setShowPersonFilter(false);
          }}
          className={`flex items-center gap-1.5 text-sm transition-colors ${showFilters ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          <Filter size={14} />
          {filterCategory === "all"
            ? "Categories"
            : CATEGORY_CONFIG[filterCategory].label}
        </button>

        <button
          onClick={() => {
            setShowPersonFilter(!showPersonFilter);
            setShowFilters(false);
          }}
          className={`flex items-center gap-1.5 text-sm transition-colors ${showPersonFilter ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          <User size={14} />
          {filterPerson === "all"
            ? "Everyone"
            : members.find(m => m.id === filterPerson)?.name || "Person"}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          <button
            onClick={() => {
              setFilterCategory("all");
              setShowFilters(false);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filterCategory === "all"
                ? "border-primary bg-primary/15 text-primary-light"
                : "border-border text-text-muted"
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setFilterCategory(cat);
                setShowFilters(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filterCategory === cat
                  ? "border-primary bg-primary/15 text-primary-light"
                  : "border-border text-text-muted"
              }`}
            >
              {CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>
      )}

      {showPersonFilter && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          <button
            onClick={() => {
              setFilterPerson("all");
              setShowPersonFilter(false);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filterPerson === "all"
                ? "border-primary bg-primary/15 text-primary-light"
                : "border-border text-text-muted"
            }`}
          >
            Everyone
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setFilterPerson(m.id);
                setShowPersonFilter(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filterPerson === m.id
                  ? "border-primary bg-primary/15 text-primary-light"
                  : "border-border text-text-muted"
              }`}
            >
              {m.id === user?.id ? "You" : m.name}
            </button>
          ))}
        </div>
      )}

      {/* Expense List */}
      {Object.entries(grouped).length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-text-muted text-sm">
            No expenses for {getMonthDisplayName(selectedMonth)}
          </p>
        </Card>
      ) : (
        Object.entries(grouped).map(([dateKey, dateExpenses]) => (
          <div key={dateKey} className="space-y-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
              {formatRelativeDate(dateKey)}
            </p>
            <div className="space-y-2 stagger-children">
              {dateExpenses.map((expense) => {
                const config = CATEGORY_CONFIG[expense.category];
                const Icon = config?.icon;
                const isPaidByMe = expense.paid_by === user?.id;

                return (
                  <Card
                    key={expense.id}
                    className="flex items-center gap-3 group"
                  >
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
                          : `Paid by ${(expense.paid_by_profile as unknown as { name: string })?.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-text">
                          {formatCurrency(expense.amount)}
                        </p>
                        <div className="flex items-center gap-0.5 justify-end">
                          {isPaidByMe ? (
                            <TrendingUp size={10} className="text-success" />
                          ) : (
                            <TrendingDown size={10} className="text-danger" />
                          )}
                          <span
                            className={`text-[10px] ${isPaidByMe ? "text-success" : "text-danger"}`}
                          >
                            {formatCurrency(expense.amount / Math.max(members.length, 1))}
                          </span>
                        </div>
                      </div>
                      {isPaidByMe && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditExpense(expense)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 transition-all text-text-dim hover:text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            disabled={deleting === expense.id}
                            className="p-1.5 rounded-lg hover:bg-danger/10 transition-all text-text-dim hover:text-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groupId={groupId}
        members={members}
        onAdded={loadData}
      />
      <EditExpenseModal
        isOpen={!!editExpense}
        onClose={() => setEditExpense(null)}
        expense={editExpense}
        groupId={groupId}
        members={members}
        onEdited={() => {
          setEditExpense(null);
          loadData();
        }}
      />
    </div>
  );
}
