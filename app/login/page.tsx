"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error(authError.message);

      // Check if suspended
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_suspended, is_admin")
        .eq("id", data.user.id)
        .single();

      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        setError("Ditt konto är tillfälligt avstängt. Kontakta oss på info@folkradet.se för mer information.");
        return;
      }

      if (profile?.is_admin) {
        router.push("/admin/veckans-fraga");
      } else {
        router.push("/dashboard/veckans-fraga");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Inloggning misslyckades. Kontrollera dina uppgifter.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <img src="/logo.png" alt="Folkrådet" className="h-12 w-12 rounded-full object-cover" />
        <span className="text-primary font-bold text-lg">Folkrådet</span>
      </Link>

      <div className="card max-w-sm w-full">
        <h1 className="text-2xl font-bold text-primary mb-1">Logga in</h1>
        <p className="text-gray-500 text-sm mb-6">Välkommen tillbaka</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">E-postadress</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="din@email.se"
              required
            />
          </div>
          <div>
            <label className="label">Lösenord</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Inget konto?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">Registrera dig</Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          <Link href="/contact" className="text-primary font-medium hover:underline">Kontakta oss</Link>
        </p>
      </div>
    </div>
  );
}
