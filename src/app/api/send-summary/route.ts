import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { Resend } from "resend";
import { formatCurrency, getMonthDisplayName, minimizeDebts } from "@/lib/utils";
import type { BalanceSummary } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
    const { groupId, month } = await request.json();

    if (!groupId || !month) {
      return NextResponse.json(
        { error: "groupId and month are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get group details
    const { data: group } = await supabase
      .from("groups")
      .select("name")
      .eq("id", groupId)
      .single();

    // Get members
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id, profiles(id, name, email)")
      .eq("group_id", groupId);

    if (!members || members.length === 0) {
      return NextResponse.json({ error: "No members found" }, { status: 404 });
    }

    const memberList = members.map((m) => ({
      id: m.user_id,
      name: (m.profiles as unknown as { name: string })?.name ?? "User",
      email: (m.profiles as unknown as { email: string })?.email ?? "",
    }));

    // Get month expenses
    const startOfMonth = `${month}-01`;
    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("group_id", groupId)
      .gte("expense_date", startOfMonth);

    const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

    // Calculate balances
    const balanceMap: Record<string, number> = {};
    memberList.forEach((m) => (balanceMap[m.id] = 0));

    (expenses ?? []).forEach((expense) => {
      const share = expense.amount / memberList.length;
      balanceMap[expense.paid_by] =
        (balanceMap[expense.paid_by] ?? 0) + expense.amount - share;
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
      .eq("group_id", groupId)
      .eq("month", month)
      .eq("is_completed", true);

    (monthSettlements ?? []).forEach((s) => {
      // from_user pays to_user
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

    const debts = minimizeDebts(balanceSummaries);

    // Build email HTML
    const monthDisplay = getMonthDisplayName(month);
    const settlementRows = debts
      .map(
        (d) =>
          `<tr>
            <td style="padding: 12px; border-bottom: 1px solid #2E2E44;">${d.from_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #2E2E44;">→</td>
            <td style="padding: 12px; border-bottom: 1px solid #2E2E44;">${d.to_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #2E2E44; font-weight: bold; color: #6C5CE7;">${formatCurrency(d.amount)}</td>
          </tr>`
      )
      .join("");

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0F0F1A; color: #E8E8F0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6C5CE7, #A855F7); padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; color: white;">SplitKaro</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Monthly Summary</p>
      </div>
      <div style="padding: 24px;">
        <h2 style="color: #E8E8F0; font-size: 18px; margin-bottom: 4px;">${group?.name ?? "Your Group"}</h2>
        <p style="color: #8888AA; font-size: 14px; margin-bottom: 20px;">${monthDisplay}</p>

        <div style="background: #1E1E2E; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <p style="color: #8888AA; font-size: 13px; margin: 0;">Total Expenses</p>
          <p style="color: #E8E8F0; font-size: 28px; font-weight: bold; margin: 4px 0;">${formatCurrency(total)}</p>
          <p style="color: #8888AA; font-size: 13px; margin: 0;">Per person: ${formatCurrency(total / memberList.length)}</p>
        </div>

        ${debts.length > 0 ? `
        <h3 style="color: #E8E8F0; font-size: 15px; margin-bottom: 12px;">Settlements Needed</h3>
        <table style="width: 100%; border-collapse: collapse; background: #1E1E2E; border-radius: 12px; overflow: hidden;">
          ${settlementRows}
        </table>
        ` : '<p style="color: #00B894; text-align: center; font-size: 14px;">✨ All settled up!</p>'}

        <p style="color: #555577; font-size: 12px; text-align: center; margin-top: 24px;">
          Sent from SplitKaro • ${monthDisplay}
        </p>
      </div>
    </div>
    `;

    // Send to all members
    const emails = memberList.map((m) => m.email).filter(Boolean);

    if (emails.length > 0) {
      await resend.emails.send({
        from: "SplitKaro <onboarding@resend.dev>",
        to: emails,
        subject: `SplitKaro: ${monthDisplay} Summary — ${group?.name ?? "Your Group"}`,
        html,
      });
    }

    return NextResponse.json({ success: true, sent_to: emails.length });
  } catch (error) {
    console.error("Error sending summary email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
