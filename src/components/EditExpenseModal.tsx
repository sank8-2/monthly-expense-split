"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CATEGORY_CONFIG } from "@/lib/constants";
import type { ExpenseCategory, Expense } from "@/types";
import { IndianRupee, FileText, CalendarDays } from "lucide-react";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  groupId: string | null;
  members: { id: string; name: string }[];
  onEdited: () => void;
}

export function EditExpenseModal({
  isOpen,
  onClose,
  expense,
  groupId,
  members,
  onEdited,
}: EditExpenseModalProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [date, setDate] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expense && isOpen) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setDate(expense.expense_date);
      setPaidBy(expense.paid_by);
      setError(null);
    }
  }, [expense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !user || !expense) {
      setError("Cannot edit expense.");
      return;
    }
    if (!description.trim() || !amount) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const amountNum = parseFloat(amount);

    // Update expense
    const { error: expError } = await supabase
      .from("expenses")
      .update({
        paid_by: paidBy,
        description: description.trim(),
        amount: amountNum,
        category,
        expense_date: date,
      })
      .eq("id", expense.id);

    if (expError) {
      setError(expError.message ?? "Failed to edit expense.");
      setLoading(false);
      return;
    }

    // Update equal splits for all members
    // For simplicity, we delete existing splits and re-insert them
    await supabase.from("expense_splits").delete().eq("expense_id", expense.id);

    const share = amountNum / members.length;
    const splits = members.map((m) => ({
      expense_id: expense.id,
      user_id: m.id,
      share_amount: Math.round(share * 100) / 100,
      is_settled: false,
    }));

    await supabase.from("expense_splits").insert(splits);

    setLoading(false);
    onClose();
    onEdited();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Expense">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Description"
          placeholder="What was this for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          icon={<FileText size={16} />}
          required
        />

        <Input
          label="Amount (₹)"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          icon={<IndianRupee size={16} />}
          min="0"
          step="0.01"
          required
        />

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          icon={<CalendarDays size={16} />}
        />

        {/* Category Picker */}
        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Category
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, typeof CATEGORY_CONFIG[ExpenseCategory]][]).map(
              ([key, config]) => {
                const Icon = config.icon;
                const isSelected = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/15 scale-[1.02]"
                        : "border-border bg-surface-elevated hover:border-text-dim"
                    }`}
                  >
                    <Icon
                      size={18}
                      style={{ color: isSelected ? config.color : undefined }}
                      className={isSelected ? "" : "text-text-muted"}
                    />
                    <span
                      className={`text-[10px] font-medium ${
                        isSelected ? "text-text" : "text-text-dim"
                      }`}
                    >
                      {config.label}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Paid By */}
        {members.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Paid by
            </label>
            <div className="flex gap-2 flex-wrap">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaidBy(m.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    paidBy === m.id
                      ? "border-primary bg-primary/15 text-primary-light"
                      : "border-border text-text-muted hover:border-text-dim"
                  }`}
                >
                  {m.id === user?.id ? "You" : m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" isLoading={loading}>
          Save Changes
        </Button>
      </form>
    </Modal>
  );
}
