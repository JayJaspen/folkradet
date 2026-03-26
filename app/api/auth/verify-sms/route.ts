import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.startsWith("0")) return "+46" + cleaned.slice(1);
  if (cleaned.startsWith("+")) return cleaned;
  return "+" + cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) return NextResponse.json({ error: "Telefonnummer och kod krävs." }, { status: 400 });

    const formatted = formatPhone(phone);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data } = await supabase
      .from("sms_verifications")
      .select("*")
      .eq("phone", formatted)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!data) {
      return NextResponse.json({ error: "Ogiltig eller utgången verifieringskod." }, { status: 400 });
    }

    // Mark as used
    await supabase.from("sms_verifications").update({ used: true }).eq("id", data.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internt serverfel." }, { status: 500 });
  }
}
