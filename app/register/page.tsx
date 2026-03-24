"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LAN, GENDER_OPTIONS } from "@/lib/constants";
import { getCurrentYear } from "@/lib/utils";

type Step = "details" | "sms" | "done";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    gender: "",
    birthYear: "",
    lan: "",
  });

  const currentYear = getCurrentYear();
  const maxBirthYear = currentYear - 18;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  function validateDetails() {
    if (!form.firstName || !form.lastName) return "Ange för- och efternamn.";
    if (!form.username || form.username.length < 3) return "Användarnamn måste vara minst 3 tecken.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Ange en giltig e-postadress.";
    if (!/^\+?[0-9]{8,15}$/.test(form.phone.replace(/\s/g, ""))) return "Ange ett giltigt mobilnummer.";
    if (form.password.length < 8) return "Lösenordet måste vara minst 8 tecken.";
    if (form.password !== form.confirmPassword) return "Lösenorden matchar inte.";
    if (!form.gender) return "Välj ett kön.";
    if (!form.birthYear) return "Ange födelseår.";
    const year = parseInt(form.birthYear);
    if (year > maxBirthYear || year < 1900) return `Du måste vara minst 18 år. Ange födelseår ${maxBirthYear} eller tidigare.`;
    if (!form.lan) return "Välj ett län.";
    return null;
  }

  async function sendSmsCode() {
    const err = validateDetails();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte skicka SMS.");
      setSmsSent(true);
      setStep("sms");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fel vid SMS-skick.");
    } finally {
      setLoading(false);
    }
  }

  async function verifySmsAndRegister() {
    if (!smsCode || smsCode.length < 4) { setError("Ange verifieringskoden."); return; }
    setLoading(true);
    setError("");
    try {
      // Verify SMS code
      const verifyRes = await fetch("/api/auth/verify-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, code: smsCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Felaktig kod.");

      // Create Supabase auth user
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Registrering misslyckades.");

      // Create profile via server-route (kringgår RLS-begränsning före e-postbekräftelse)
      const profileRes = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          username: form.username,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          gender: form.gender,
          birthYear: form.birthYear,
          lan: form.lan,
        }),
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error || "Kunde inte skapa profil.");

      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registrering misslyckades.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-primary mb-2">Välkommen!</h2>
          <p className="text-gray-600 mb-6">Ditt konto har skapats. Kontrollera din e-post för att bekräfta din adress, sedan kan du logga in.</p>
          <Link href="/login" className="btn-primary inline-block">Gå till inloggning</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex flex-col items-center gap-3 mb-8">
        <img src="/logo.png" alt="Folkrådet" className="h-36 w-36 object-contain" />
      </Link>

      <div className="card max-w-lg w-full">
        <h1 className="text-2xl font-bold text-primary mb-1">Skapa konto</h1>
        <p className="text-gray-500 text-sm mb-6">
          {step === "details" ? "Fyll i dina uppgifter" : "Verifiera ditt mobilnummer"}
        </p>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {(["details", "sms"] as Step[]).map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${step === s || (i === 0 && step !== "details") ? "bg-primary" : "bg-gray-200"}`} />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Förnamn</label>
                <input className="input" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Anna" />
              </div>
              <div>
                <label className="label">Efternamn</label>
                <input className="input" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Svensson" />
              </div>
            </div>
            <div>
              <label className="label">Användarnamn <span className="text-gray-400 text-xs">(synligt för andra)</span></label>
              <input className="input" name="username" value={form.username} onChange={handleChange} placeholder="anna_s" />
            </div>
            <div>
              <label className="label">E-postadress</label>
              <input className="input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="anna@example.se" />
            </div>
            <div>
              <label className="label">Mobilnummer <span className="text-gray-400 text-xs">(för SMS-verifiering)</span></label>
              <input className="input" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+46701234567" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Lösenord</label>
                <input className="input" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Minst 8 tecken" />
              </div>
              <div>
                <label className="label">Bekräfta lösenord</label>
                <input className="input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Upprepa" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Kön</label>
                <select className="input" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Välj...</option>
                  {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Födelseår</label>
                <input className="input" type="number" name="birthYear" value={form.birthYear} onChange={handleChange}
                  placeholder={String(maxBirthYear)} min="1900" max={String(maxBirthYear)} />
              </div>
              <div>
                <label className="label">Län</label>
                <select className="input" name="lan" value={form.lan} onChange={handleChange}>
                  <option value="">Välj...</option>
                  {LAN.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <button onClick={sendSmsCode} disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Skickar SMS..." : "Fortsätt →"}
            </button>
          </div>
        )}

        {step === "sms" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-lg">
              Vi har skickat en 6-siffrig kod till <strong>{form.phone}</strong>. Koden gäller i 10 minuter.
            </div>
            <div>
              <label className="label">Verifieringskod</label>
              <input className="input text-center text-xl tracking-widest" maxLength={6} value={smsCode}
                onChange={e => { setSmsCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="000000" />
            </div>
            <button onClick={verifySmsAndRegister} disabled={loading} className="btn-primary w-full">
              {loading ? "Registrerar..." : "Slutför registrering"}
            </button>
            <button onClick={() => setStep("details")} className="text-sm text-gray-500 hover:text-primary w-full text-center mt-1">
              ← Ändra uppgifter
            </button>
            {!loading && (
              <button onClick={sendSmsCode} className="text-sm text-primary hover:underline w-full text-center">
                Skicka ny kod
              </button>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Har du redan ett konto?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">Logga in</Link>
        </p>
      </div>
    </div>
  );
}
