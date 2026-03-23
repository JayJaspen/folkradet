import { NextRequest, NextResponse } from "next/server";

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
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const username = process.env.ELKS_API_USERNAME;
    const password = process.env.ELKS_API_PASSWORD;
    const from = process.env.ELKS_FROM_NAME ?? "Folkradet";

    console.log("Username finns:", !!username);
    console.log("Password finns:", !!password);
    console.log("Skickar till:", formatted);

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SMS fel:", err);
    return NextResponse.json({ error: "Internt serverfel." }, { status: 500 });
  }
}