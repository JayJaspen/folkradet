import { NextResponse } from "next/server";

// TEMPORÄR DIAGNOSTIKRUTT – ta bort efter felsökning!
// Besök: /api/debug-sms för att se status
export async function GET() {
  const username = process.env.ELKS_API_USERNAME;
  const password = process.env.ELKS_API_PASSWORD;
  const from = process.env.ELKS_FROM_NAME ?? "Folkradet";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Testa ett riktigt anrop mot 46elks (bara account info, inget SMS skickas)
  let elksStatus = "ej testad";
  let elksBody = "";
  try {
    const res = await fetch("https://api.46elks.com/a1/me", {
      headers: {
        Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
      },
    });
    elksBody = await res.text();
    elksStatus = `HTTP ${res.status}`;
  } catch (e: unknown) {
    elksStatus = "fetch-fel: " + (e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json({
    env: {
      ELKS_API_USERNAME: username ? `✅ satt (${username.slice(0,6)}...)` : "❌ SAKNAS",
      ELKS_API_PASSWORD: password ? `✅ satt (${password.length} tecken)` : "❌ SAKNAS",
      ELKS_FROM_NAME: from,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `✅ satt` : "❌ SAKNAS",
      SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `✅ satt` : "❌ SAKNAS",
    },
    elks46_api_test: {
      status: elksStatus,
      svar: elksBody,
    },
  });
}
