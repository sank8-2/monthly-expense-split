import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { Resend } from "resend";
import { formatCurrency } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
    const { expenseId } = await request.json();

    if (!expenseId) {
      return NextResponse.json(
        { error: "expenseId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch expense details
    const { data: expense } = await supabase
      .from("expenses")
      .select(`
        *,
        group:groups(name),
        paid_by_profile:profiles!expenses_paid_by_fkey(name)
      `)
      .eq("id", expenseId)
      .single();

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Fetch members of the group to notify
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id, profiles(email, name)")
      .eq("group_id", expense.group_id);

    if (!members || members.length === 0) {
      return NextResponse.json({ success: true, sent_count: 0 });
    }

    // Get group name, etc.
    const groupName = expense.group?.name ?? "Your Group";
    const paidByName = expense.paid_by_profile?.name ?? "Someone";

    // Prepare email
    const emails = members
      .map((m) => (m.profiles as any)?.email)
      .filter(Boolean);

    if (emails.length > 0) {
      const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0F0F1A; color: #E8E8F0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6C5CE7, #A855F7); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: white;">SplitKaro</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">New Expense Added</p>
        </div>
        <div style="padding: 24px;">
          <h2 style="color: #E8E8F0; font-size: 18px; margin-bottom: 20px;">${groupName}</h2>
          
          <div style="background: #1E1E2E; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="color: #8888AA; font-size: 14px; margin: 0;">${paidByName} added an expense:</p>
            <p style="color: #E8E8F0; font-size: 20px; font-weight: bold; margin: 12px 0;">${expense.description}</p>
            <p style="color: #6C5CE7; font-size: 28px; font-weight: bold; margin: 0;">${formatCurrency(expense.amount)}</p>
          </div>

          <p style="color: #555577; font-size: 12px; text-align: center; margin-top: 24px;">
            Sent from SplitKaro
          </p>
        </div>
      </div>
      `;

      await resend.emails.send({
        from: "SplitKaro <onboarding@resend.dev>",
        to: emails,
        subject: `New Expense in ${groupName}: ${expense.description}`,
        html,
      });
    }

    return NextResponse.json({ success: true, sent_count: emails.length });
  } catch (error) {
    console.error("Error sending notify email:", error);
    return NextResponse.json(
      { error: "Failed to send notify email" },
      { status: 500 }
    );
  }
}
