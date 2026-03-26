import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function formatPhone(raw: string): string {
  const c = raw.replace(/\s/g, "");
  if (c.startsWith("0")) return "+46" + c.slice(1);
  if (c.startsWith("+")) return c;
  return "+" + c;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, phone, username, firstName, lastName, gender, birthYear, lan } = body;

    if (!email || !password || !phone || !username) {
      return NextResponse.json({ error: "Obligatoriska fält saknas." }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const formatted = formatPhone(phone);

    // 1. Kontrollera att telefonnumret är verifierat via SMS (inom 15 minuter)
    const verifiedCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: verifiedRecord } = await adminSupabase
      .from("sms_verifications")
      .select("id")
      .eq("phone", formatted)
      .eq("used", true)
      .gt("created_at", verifiedCutoff)
      .limit(1)
      .maybeSingle();

    if (!verifiedRecord) {
      return NextResponse.json(
        { error: "Telefonnumret är inte verifierat. Verifiera med SMS-kod först." },
        { status: 403 }
      );
    }

    // 2. Kontrollera om profil redan finns med denna e-post
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: "Det finns redan ett konto med den e-postadressen. Försök logga in istället." },
        { status: 409 }
      );
    }

    // 3. Skapa auth-användare via admin (eller hitta befintlig föräldralös auth-användare)
    let userId: string;

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
        // Auth-användare finns men saknar profil – hitta via listUsers
        const { data: { users } } = await adminSupabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const orphaned = users.find((u) => u.email === email);
        if (!orphaned) {
          return NextResponse.json(
            { error: "Registreringsfel. Kontakta support." },
            { status: 500 }
          );
        }
        userId = orphaned.id;
        // Uppdatera lösenord till det nyss angivna
        await adminSupabase.auth.admin.updateUserById(userId, { password });
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
    } else {
      userId = newUser.user.id;
    }

    // 4. Skapa profil
    const { error: profileError } = await adminSupabase.from("profiles").insert({
      id: userId,
      username,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      phone_verified: true,
      gender,
      birth_year: parseInt(birthYear),
      lan,
    });

    if (profileError) {
      console.error("Profilskapande misslyckades:", profileError);
      // Om det var en ny auth-användare, ta bort den igen (rollback)
      if (newUser) {
        await adminSupabase.auth.admin.deleteUser(userId);
      }
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internt serverfel." }, { status: 500 });
  }
}
