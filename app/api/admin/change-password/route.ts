import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, newPassword, resolveRequestId } = await req.json();

    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Ogiltiga parametrar. Lösenord måste vara minst 6 tecken." }, { status: 400 });
    }

    // Verifiera att den inloggade användaren är admin
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Ej autentiserad." }, { status: 401 });

    const { data: profile } = await serverClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Åtkomst nekad. Kräver admin-behörighet." }, { status: 403 });
    }

    // Byt lösenord med service role-klienten (kringgår RLS)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Markera lösenordsåterställningsförfrågan som löst (om angiven)
    if (resolveRequestId) {
      await serverClient
        .from("password_reset_requests")
        .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq("id", resolveRequestId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("change-password fel:", err);
    return NextResponse.json({ error: "Internt serverfel." }, { status: 500 });
  }
}
