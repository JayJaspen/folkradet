import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, username, firstName, lastName, email, phone, gender, birthYear, lan } = body;

    if (!userId || !username || !email || !phone) {
      return NextResponse.json({ error: "Obligatoriska fält saknas." }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { error } = await supabase.from("profiles").insert({
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

    if (error) {
      console.error("Fel vid profilskapande:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create-profile fel:", err);
    return NextResponse.json({ error: "Internt serverfel." }, { status: 500 });
  }
}
