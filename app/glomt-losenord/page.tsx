"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function GlomtLosenordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: insertError } = await supabase
        .from("password_reset_requests")
        .insert({ email: email.trim().toLowerCase() });
      if (insertError) throw new Error("Något gick fel. Försök igen.");
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex flex-col items-center gap-3 mb-8">
        <img src="/logo.png" alt="Folkrådet" className="h-36 w-36 object-contain" />
      </Link>

      <div className="card max-w-sm w-full">
        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-primary mb-2">Förfrågan skickad</h1>
            <p className="text-gray-500 text-sm mb-6">
              Vi har tagit emot din förfrågan. En administratör kommer att
              återställa ditt lösenord och kontakta dig via e-post.
            </p>
            <Link href="/login" className="btn-primary block text-center">
              Tillbaka till inloggning
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-primary mb-1">Glömt lösenord?</h1>
            <p className="text-gray-500 text-sm mb-6">
              Ange din e-postadress så kontaktar en administratör dig med ett nytt lösenord.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Skickar..." : "Skicka förfrågan"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              <Link href="/login" className="text-primary font-medium hover:underline">
                ← Tillbaka till inloggning
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
