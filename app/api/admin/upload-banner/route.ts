import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // Verifiera att användaren är inloggad som admin
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Ej autentiserad." }, { status: 401 });

    const { data: profile } = await serverClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Åtkomst nekad." }, { status: 403 });
    }

    // Hämta filen från form-data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Ingen fil skickades." }, { status: 400 });

    // Validera filtyp och storlek (max 5 MB)
    const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Otillåten filtyp. Använd PNG, JPG, GIF eller WebP." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Filen är för stor. Max 5 MB." }, { status: 400 });
    }

    // Ladda upp med service role-klienten (kringgår Storage RLS)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const ext      = file.name.split(".").pop() ?? "png";
    const filename = `banner-${Date.now()}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    const { data, error: uploadErr } = await adminClient.storage
      .from("banners")
      .upload(filename, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      console.error("Storage upload fel:", uploadErr);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = adminClient.storage.from("banners").getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("upload-banner fel:", err);
    return NextResponse.json({ error: "Internt serverfel." }, { status: 500 });
  }
}
