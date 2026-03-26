import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "E-post krävs." }, { status: 400 });

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Hitta användaren via listUsers
    const { data: { users } } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json({ error: "Användaren hittades inte." }, { status: 404 });
    }

    if (user.email_confirmed_at) {
      // Redan bekräftad
      return NextResponse.json({ success: true });
    }

    // Bekräfta e-postadressen
    const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("confirm-email error:", err);
    return NextResponse.json({ error: "Internt serverfel." }, { status: 500 });
  }
}
