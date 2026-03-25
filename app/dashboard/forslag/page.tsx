"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BannerAd from "@/components/BannerAd";

export default function ForslagPage() {
  const supabase = createClient();
  const [form, setForm] = useState({ suggestion: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        supabase.from("profiles").select("username").eq("id", data.user.id).single()
          .then(({ data: p }) => setUsername(p?.username ?? ""));
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.suggestion.trim()) { setError("Ange ett förslag."); return; }
    if (!userId) { setError("Du måste vara inloggad."); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.from("question_suggestions").insert({
      user_id: userId,
      username,
      suggestion: form.suggestion,
      description: form.description,
    });
    if (err) { setError(err.message); } else { setSent(true); }
    setLoading(false);
  }

  return (
    <div className="grid grid-cols-[160px_1fr_160px] gap-4 items-start">
      <div className="sticky top-4 flex flex-col gap-4">
        <BannerAd position="left" />
        <BannerAd position="left-2" />
      </div>

      <div className="card max-w-2xl mx-auto w-full">
        <h1 className="text-xl font-bold text-primary mb-1">Förslag på frågor</h1>
        <p className="text-sm text-gray-500 mb-6">
          Har du en fråga du vill att vi ska ta upp? Skicka ditt förslag nedan och admin granskar det.
        </p>

        {sent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-semibold text-primary text-lg">Tack för ditt förslag!</p>
            <p className="text-gray-500 text-sm mt-2">Vi har tagit emot ditt förslag och granskar det inom kort.</p>
            <button onClick={() => { setSent(false); setForm({ suggestion: "", description: "" }); }}
              className="btn-secondary mt-4 text-sm">
              Skicka ett till förslag
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}
            <div>
              <label className="label">Din fråga / ditt förslag *</label>
              <input
                className="input"
                value={form.suggestion}
                onChange={e => setForm({ ...form, suggestion: e.target.value })}
                placeholder="t.ex. Bör Sverige sänka pensionsåldern?"
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1">{form.suggestion.length}/200 tecken</p>
            </div>
            <div>
              <label className="label">Bakgrund / motivering (valfritt)</label>
              <textarea
                className="input min-h-[100px] resize-none"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Berätta gärna varför du tycker detta är en viktig fråga..."
                maxLength={1000}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Skickar..." : "Skicka förslag"}
            </button>
          </form>
        )}
      </div>

      <div className="sticky top-4 flex flex-col gap-4">
        <BannerAd position="right" />
        <BannerAd position="right-2" />
      </div>
    </div>
  );
}
