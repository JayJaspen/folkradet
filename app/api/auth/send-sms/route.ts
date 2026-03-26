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
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "Mobilnummer krävs." }, { status: 400 });

    const formatted = formatPhone(phone);

    // Rate limiting: max 1 SMS per telefonnummer var 60:e sekund
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const cooldownCutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentCode } = await supabase
      .from("sms_verifications")
      .select("created_at")
      .eq("phone", formatted)
      .gt("created_at", cooldownCutoff)
      .limit(1)
      .maybeSingle();

    if (recentCode) {
      return NextResponse.json(
        { error: "Vänta 60 sekunder innan du begär en ny kod." },
        { status: 429 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const username = process.env.ELKS_API_USERNAME;
    const password = process.env.ELKS_API_PASSWORD;
    // SMS-avsändarnamn får INTE innehålla å/ä/ö – strippa bort dem
    const rawFrom = process.env.ELKS_FROM_NAME ?? "Folkradet";
    const from = rawFrom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").slice(0, 11);

    const formData = new URLSearchParams({
      from,
      to: formatted,
      message: `Din verifieringskod till Folkrådet: ${code}. Koden gäller i 10 minuter.`,
    });

    const elksRes = await fetch("https://api.46elks.com/a1/sms", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const elksText = await elksRes.text();
    console.log("46elks svar:", elksRes.status, elksText);

    if (!elksRes.ok) {
      return NextResponse.json({ error: "Kunde inte skicka SMS. Försök igen." }, { status: 500 });
    }

    // Spara koden i databasen så att verify-sms kan validera den
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minuter

    // Radera gamla koder för numret, sedan insert ny
    await supabase.from("sms_verifications").delete().eq("phone", formatted);

    const { error: dbError } = await supabase
      .from("sms_verifications")
      .insert({ phone: formatted, code, expires_at: expiresAt, used: false });

    if (dbError) {
      console.error("Kunde inte spara verifieringskod:", dbError);
      return NextResponse.json({ error: "Internt serverfel vid sparande av kod." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SMS fel:", err);
    return NextResponse.json({ error: "Internt serverfel." }, { status: 500 });
  }
}