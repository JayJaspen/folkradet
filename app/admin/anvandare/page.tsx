"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AGE_GROUPS, GENDER_OPTIONS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Profile {
  id: string; username: string; first_name: string; last_name: string;
  email: string; phone: string; gender: string; birth_year: number; lan: string;
  is_suspended: boolean; is_admin: boolean; created_at: string; last_answer_at?: string;
  answer_count?: number;
}

interface PasswordResetRequest {
  id: string; email: string; created_at: string; status: string;
}

export default function AdminAnvandare() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lösenordsåterställning
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [filterLan, setFilterLan] = useState("");

  // Bara visa filtervärden som faktiskt finns
  const [availableGenders, setAvailableGenders] = useState<string[]>([]);
  const [availableLan,     setAvailableLan]     = useState<string[]>([]);
  const [availableAges,    setAvailableAges]    = useState<string[]>([]);

  useEffect(() => {
    async function fetchFilterOptions() {
      const { data } = await supabase
        .from("profiles")
        .select("gender, lan, birth_year");
      if (!data) return;
      setAvailableGenders([...new Set(data.map(p => p.gender).filter(Boolean))]);
      setAvailableLan([...new Set(data.map(p => p.lan).filter(Boolean))].sort() as string[]);
      const curYear = new Date().getFullYear();
      const ageSet = new Set<string>();
      data.forEach(p => {
        if (!p.birth_year) return;
        const age = curYear - p.birth_year;
        const group = AGE_GROUPS.find(g => age >= g.min && age <= g.max);
        if (group) ageSet.add(group.label);
      });
      // Sortera åldersgrupperna i rätt ordning
      const sorted = AGE_GROUPS.map(g => g.label).filter(l => ageSet.has(l));
      setAvailableAges(sorted);
    }
    fetchFilterOptions();
  }, []);

  async function doSearch() {
    setLoading(true);
    let query = supabase.from("profiles").select(`*, answer_count:question_votes(count)`, { count: "exact" });

    if (searchText.trim()) {
      query = query.or(`username.ilike.%${searchText}%,email.ilike.%${searchText}%,first_name.ilike.%${searchText}%,last_name.ilike.%${searchText}%`);
    }
    if (filterGender) query = query.eq("gender", filterGender);
    if (filterLan) query = query.eq("lan", filterLan);
    if (filterAge) {
      const g = AGE_GROUPS.find(g => g.label === filterAge);
      if (g) {
        const currentYear = new Date().getFullYear();
        query = query.gte("birth_year", currentYear - g.max).lte("birth_year", currentYear - g.min);
      }
    }

    const { data, count } = await query.order("created_at", { ascending: false }).limit(100);
    setProfiles((data as Profile[]) ?? []);
    setTotal(count ?? 0);
    setSearched(true);
    setLoading(false);
  }

  async function toggleSuspend(p: Profile) {
    const action = p.is_suspended ? "återaktivera" : "stänga av";
    if (!confirm(`Är du säker på att du vill ${action} användaren @${p.username}?`)) return;
    await supabase.from("profiles").update({ is_suspended: !p.is_suspended }).eq("id", p.id);
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, is_suspended: !x.is_suspended } : x));
  }

  function getAge(birthYear: number) { return new Date().getFullYear() - birthYear; }

  // Hämta lösenordsåterställningsförfrågningar
  useEffect(() => {
    async function fetchResetRequests() {
      const { data } = await supabase
        .from("password_reset_requests")
        .select("id, email, created_at, status")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      setResetRequests((data as PasswordResetRequest[]) ?? []);
    }
    fetchResetRequests();
  }, []);

  async function resolveResetRequest(req: PasswordResetRequest) {
    const adminId = (await supabase.auth.getUser()).data.user?.id;
    if (!adminId) return;
    setResolvingId(req.id);
    await supabase
      .from("password_reset_requests")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: adminId })
      .eq("id", req.id);
    setResetRequests(prev => prev.filter(r => r.id !== req.id));
    setResolvingId(null);
    alert(`Markerad som hanterad. Kom ihåg att manuellt byta lösenord i Supabase för ${req.email} och skicka det nya lösenordet via e-post.`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Användare</h1>

      {/* Lösenordsåterställningsförfrågningar */}
      {resetRequests.length > 0 && (
        <div className="card border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔑</span>
            <h2 className="font-semibold text-gray-700">
              Lösenordsåterställning
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {resetRequests.length} väntande
              </span>
            </h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Dessa användare har begärt lösenordsåterställning. Gå till Supabase → Authentication → Users,
            hitta användaren, sätt ett nytt tillfälligt lösenord och skicka det via e-post. Markera sedan som hanterad.
          </p>
          <div className="space-y-2">
            {resetRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <div>
                  <div className="font-medium text-sm">{req.email}</div>
                  <div className="text-xs text-gray-500">Begärt: {formatDateTime(req.created_at)}</div>
                </div>
                <button
                  onClick={() => resolveResetRequest(req)}
                  disabled={resolvingId === req.id}
                  className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  {resolvingId === req.id ? "..." : "Markera hanterad"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sök & filter */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="lg:col-span-2">
            <label className="label">Sök (namn, användarnamn, e-post)</label>
            <input className="input" value={searchText} onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="Sök..." />
          </div>
          <div>
            <label className="label">Kön</label>
            <select className="input" value={filterGender} onChange={e => setFilterGender(e.target.value)}>
              <option value="">Alla kön</option>
              {availableGenders.map(g => (
                <option key={g} value={g}>
                  {GENDER_OPTIONS.find(o => o.value === g)?.label ?? g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Åldersgrupp</label>
            <select className="input" value={filterAge} onChange={e => setFilterAge(e.target.value)}>
              <option value="">Alla åldrar</option>
              {availableAges.map(g => <option key={g} value={g}>{g} år</option>)}
            </select>
          </div>
          <div>
            <label className="label">Län</label>
            <select className="input" value={filterLan} onChange={e => setFilterLan(e.target.value)}>
              <option value="">Alla län</option>
              {availableLan.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <button onClick={doSearch} disabled={loading} className="btn-primary">
          {loading ? "Söker..." : "Sök"}
        </button>
      </div>

      {/* Resultat */}
      {searched && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">
              Resultat: <span className="text-primary font-bold">{total} användare</span>
            </h2>
          </div>

          {profiles.length === 0 ? (
            <p className="text-gray-400 text-sm">Inga användare hittades med dessa filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="text-left py-2 pr-4">Användare</th>
                    <th className="text-left py-2 pr-4">Kontakt</th>
                    <th className="text-left py-2 pr-4">Profil</th>
                    <th className="text-left py-2 pr-4">Aktivitet</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2">Åtgärd</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} className={`border-b border-gray-50 ${p.is_suspended ? "bg-red-50/30" : ""}`}>
                      <td className="py-3 pr-4">
                        <div className="font-medium">@{p.username}</div>
                        <div className="text-xs text-gray-400">{p.first_name} {p.last_name}</div>
                        {p.is_admin && <span className="text-xs bg-primary/10 text-primary px-1 rounded">admin</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-xs">{p.email}</div>
                        <div className="text-xs text-gray-400">{p.phone}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-xs">{GENDER_OPTIONS.find(g => g.value === p.gender)?.label}</div>
                        <div className="text-xs text-gray-400">{getAge(p.birth_year)} år · {p.lan}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-xs">Reg: {formatDate(p.created_at)}</div>
                        <div className="text-xs text-gray-400">
                          {p.last_answer_at ? `Svarade: ${formatDateTime(p.last_answer_at)}` : "Aldrig svarat"}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_suspended ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {p.is_suspended ? "Avstängd" : "Aktiv"}
                        </span>
                      </td>
                      <td className="py-3">
                        {!p.is_admin && (
                          <button
                            onClick={() => toggleSuspend(p)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${p.is_suspended ? "border-green-200 text-green-700 hover:bg-green-50" : "border-red-200 text-red-600 hover:bg-red-50"}`}>
                            {p.is_suspended ? "Återaktivera" : "Stäng av"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {profiles.length === 100 && (
                <p className="text-xs text-gray-400 mt-2 text-center">Visar max 100 resultat. Förfina din sökning.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
