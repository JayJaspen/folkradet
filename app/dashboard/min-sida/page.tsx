"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BannerAd from "@/components/BannerAd";

export default function MinSidaPage() {
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        supabase.from("profiles").select("username").eq("id", data.user.id).single()
          .then(({ data: p }) => setUsername(p?.username ?? ""));
      }
    });
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setError("Nytt lösenord måste vara minst 8 tecken."); return; }
    if (newPw !== confirmPw) { setError("Lösenorden matchar inte."); return; }
    setLoading(true);
    setError("");
    setSuccess("");

    // Re-authenticate by signing in again
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPw });
    if (signInErr) { setError("Nuvarande lösenord är felaktigt."); setLoading(false); return; }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    if (updateErr) { setError(updateErr.message); } else { setSuccess("Lösenordet har uppdaterats!"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    setLoading(false);
  }

  return (
    <div className="grid grid-cols-[160px_1fr_160px] gap-4 items-start">
      <div className="sticky top-4 flex flex-col gap-4">
        <BannerAd position="left" />
        <BannerAd position="left-2" />
      </div>

      <div className="max-w-lg mx-auto w-full space-y-4">
        {/* Profil-info */}
        <div className="card">
          <h1 className="text-xl font-bold text-primary mb-4">Min sida</h1>
          <div className="flex items-center gap-4 mb-4 p-4 bg-surface rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
              {username[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="font-semibold text-gray-800">@{username}</p>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
          </div>
        </div>

        {/* Byt lösenord */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4">Byt lösenord</h2>
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">✅ {success}</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">Nuvarande lösenord</label>
              <input className="input" type="password" value={currentPw} onChange={e => { setCurrentPw(e.target.value); setError(""); }}
                placeholder="••••••••" required />
            </div>
            <div>
              <label className="label">Nytt lösenord</label>
              <input className="input" type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setError(""); }}
                placeholder="Minst 8 tecken" required />
            </div>
            <div>
              <label className="label">Bekräfta nytt lösenord</label>
              <input className="input" type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(""); }}
                placeholder="Upprepa" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Uppdaterar..." : "Byt lösenord"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="font-bold text-gray-800 mb-2">Om Folkrådet</h2>
          <p className="text-sm text-gray-500">
            Folkrådet är en plattform för demokratisk dialog där din röst räknas.
            Har du frågor eller synpunkter? Kontakta oss på{" "}
            <a href="mailto:info@folkradet.se" className="text-primary hover:underline">info@folkradet.se</a>
          </p>
        </div>
      </div>

      <div className="sticky top-4 flex flex-col gap-4">
        <BannerAd position="right" />
        <BannerAd position="right-2" />
      </div>
    </div>
  );
}
