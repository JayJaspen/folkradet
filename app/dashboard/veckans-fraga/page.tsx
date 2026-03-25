"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BannerAd from "@/components/BannerAd";
import ResultFilter, { FilterState } from "@/components/filters/ResultFilter";
import VoteChart from "@/components/charts/VoteChart";
import { PARTIES, PARTY_LIST } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface Question {
  id: string; title: string; description?: string;
  published_at: string; week_number: number; year: number;
}
interface QuestionOption { id: string; option_text: string; sort_order: number; }
interface VoteResult  { option_id: string; option_text: string; vote_count: number; }
interface PartyResult { party: string; vote_count: number; }

const EMPTY_FILTER: FilterState = { ageGroup: "", gender: "", lan: "" };

export default function VeckansFragaPage() {
  const supabase = createClient();
  const [userId,   setUserId]   = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [options,  setOptions]  = useState<QuestionOption[]>([]);
  const [hasVotedQuestion,    setHasVotedQuestion]    = useState(false);
  const [selectedOption,      setSelectedOption]      = useState<string | null>(null);
  const [submittingQuestion,  setSubmittingQuestion]  = useState(false);

  const [qFilter,      setQFilter]      = useState<FilterState>(EMPTY_FILTER);
  const [qResults,     setQResults]     = useState<VoteResult[]>([]);
  const [partyFilter,  setPartyFilter]  = useState<FilterState>(EMPTY_FILTER);
  const [partyResults, setPartyResults] = useState<PartyResult[]>([]);
  const [selectedParty,      setSelectedParty]      = useState<string | null>(null);
  const [hasVotedPartyToday, setHasVotedPartyToday] = useState(false);
  const [submittingParty,    setSubmittingParty]     = useState(false);
  const [myPartyVote,        setMyPartyVote]         = useState<{ party: string; voted_at: string } | null>(null);

  // Tillgängliga filtervärden (endast de som finns i datan)
  const [availableGendersParty, setAvailableGendersParty] = useState<string[]>([]);
  const [availableLanParty,     setAvailableLanParty]     = useState<string[]>([]);
  const [availableAgesParty,    setAvailableAgesParty]    = useState<string[]>([]);
  const [availableGendersQ,     setAvailableGendersQ]     = useState<string[]>([]);
  const [availableLanQ,         setAvailableLanQ]         = useState<string[]>([]);
  const [availableAgesQ,        setAvailableAgesQ]        = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    const now = new Date().toISOString();
    supabase.from("weekly_questions").select("*")
      .eq("is_active", true)
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)
      .order("publish_at", { ascending: false })
      .limit(1).single()
      .then(({ data }) => {
        if (data) {
          setQuestion(data);
          supabase.from("question_options").select("*").eq("question_id", data.id).order("sort_order")
            .then(({ data: opts }) => setOptions(opts ?? []));
        }
      });
  }, []);

  useEffect(() => {
    if (!userId || !question) return;
    supabase.from("question_votes").select("id").eq("question_id", question.id).eq("user_id", userId)
      .single().then(({ data }) => setHasVotedQuestion(!!data));
  }, [userId, question]);

  // Hämta tillgängliga filtervärden för partiröster via SECURITY DEFINER-funktion
  const fetchPartyFilterOptions = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_party_filter_options");
    if (error || !data) return;
    const d = data as { genders: string[]; lans: string[]; age_groups: string[] };
    setAvailableGendersParty(d.genders ?? []);
    setAvailableLanParty(d.lans ?? []);
    setAvailableAgesParty(d.age_groups ?? []);
  }, []);

  useEffect(() => { fetchPartyFilterOptions(); }, [fetchPartyFilterOptions]);

  // Partiresultat – försöker RPC, faller tillbaka på direkt query
  const fetchPartyResults = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_party_results", {
      p_age_group: partyFilter.ageGroup || null,
      p_gender:    partyFilter.gender   || null,
      p_lan:       partyFilter.lan      || null,
    });
    if (!error) { setPartyResults(data ?? []); return; }

    console.warn("get_party_results RPC saknas, använder fallback:", error.message);
    const { data: raw } = await supabase.from("party_votes").select("party, user_id, voted_at");
    if (raw) {
      const latest: Record<string, string> = {};
      [...raw].sort((a, b) => a.voted_at < b.voted_at ? -1 : 1)
        .forEach(v => { latest[v.user_id] = v.party; });
      const counts: Record<string, number> = {};
      Object.values(latest).forEach(p => { counts[p] = (counts[p] ?? 0) + 1; });
      setPartyResults(
        Object.entries(counts)
          .map(([party, vote_count]) => ({ party, vote_count }))
          .sort((a, b) => b.vote_count - a.vote_count)
      );
    }
  }, [partyFilter]);

  useEffect(() => { fetchPartyResults(); }, [fetchPartyResults]);

  // Hämta filtervärden för frågeröster via SECURITY DEFINER-funktion
  const fetchQFilterOptions = useCallback(async () => {
    if (!question) return;
    const { data, error } = await supabase.rpc("get_question_filter_options", { p_question_id: question.id });
    if (error || !data) return;
    const d = data as { genders: string[]; lans: string[]; age_groups: string[] };
    setAvailableGendersQ(d.genders ?? []);
    setAvailableLanQ(d.lans ?? []);
    setAvailableAgesQ(d.age_groups ?? []);
  }, [question]);

  useEffect(() => { fetchQFilterOptions(); }, [fetchQFilterOptions]);

  // Frågresultat – försöker RPC, faller tillbaka på direkt query
  const fetchQResults = useCallback(async () => {
    if (!question) return;
    const { data, error } = await supabase.rpc("get_question_results", {
      p_question_id: question.id,
      p_age_group:   qFilter.ageGroup || null,
      p_gender:      qFilter.gender   || null,
      p_lan:         qFilter.lan      || null,
    });
    if (!error) { setQResults(data ?? []); return; }

    console.warn("get_question_results RPC saknas, använder fallback:", error.message);
    const { data: raw } = await supabase
      .from("question_votes")
      .select("option_id, question_options(option_text)")
      .eq("question_id", question.id);
    if (raw) {
      type RawVote = { option_id: string; question_options: { option_text: string }[] | { option_text: string } | null };
      const counts: Record<string, { text: string; count: number }> = {};
      (raw as unknown as RawVote[]).forEach(v => {
        const optText = Array.isArray(v.question_options)
          ? (v.question_options[0]?.option_text ?? v.option_id)
          : (v.question_options?.option_text ?? v.option_id);
        if (!counts[v.option_id])
          counts[v.option_id] = { text: optText, count: 0 };
        counts[v.option_id].count++;
      });
      setQResults(Object.entries(counts).map(([option_id, { text, count }]) =>
        ({ option_id, option_text: text, vote_count: count })
      ));
    }
  }, [question, qFilter]);

  useEffect(() => { fetchQResults(); }, [fetchQResults]);

  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    // Kolla om röstat idag
    supabase.from("party_votes").select("id").eq("user_id", userId).eq("vote_date", today)
      .limit(1).then(({ data }) => setHasVotedPartyToday(!!(data && data.length > 0)));
    // Hämta senaste röst (för att visa vilket parti + utgångsdatum)
    supabase.from("party_votes").select("party, voted_at")
      .eq("user_id", userId)
      .order("voted_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setMyPartyVote(data); });
  }, [userId]);

  async function submitQuestionVote() {
    if (!selectedOption || !userId || !question) return;
    setSubmittingQuestion(true);
    const { error } = await supabase.from("question_votes")
      .insert({ question_id: question.id, option_id: selectedOption, user_id: userId });
    if (!error) { setHasVotedQuestion(true); fetchQResults(); }
    else console.error("Fel vid frågeröstning:", error);
    setSubmittingQuestion(false);
  }

  async function submitPartyVote() {
    if (!selectedParty || !userId) return;
    setSubmittingParty(true);
    const { error } = await supabase.from("party_votes")
      .insert({ user_id: userId, party: selectedParty });
    if (!error) {
      setHasVotedPartyToday(true);
      fetchPartyResults();
      fetchPartyFilterOptions();
    } else {
      console.error("Fel vid partiröstning:", error);
    }
    setSubmittingParty(false);
  }

  // Schemainfo för veckans fråga
  function getScheduleInfo(): { type: "thursday"; message: string } | { type: "active"; message: string; detail: string } {
    const day = new Date().getDay(); // 0=Sön, 1=Mån, 2=Tis, 3=Ons, 4=Tor, 5=Fre, 6=Lör
    if (day === 4) {
      return { type: "thursday", message: "Imorgon publiceras en ny fråga!" };
    }
    const daysUntilWed = (3 - day + 7) % 7 || 7;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysUntilWed);
    const deadlineStr = deadline.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
    const detail = daysUntilWed === 0 ? "Sista chansen – frågan stänger idag!" : `Sista svarsdagen: ${deadlineStr}`;
    return { type: "active", message: "Aktiv i 5 dagar · Ny fråga publiceras varje fredag", detail };
  }
  const scheduleInfo = getScheduleInfo();

  return (
    <div className="grid grid-cols-[160px_1fr_1fr_160px] gap-4 items-start">
      <div className="sticky top-4 flex flex-col gap-4">
        <BannerAd position="left" />
        <BannerAd position="left-2" />
      </div>

      {/* Veckans fråga */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Veckans fråga</span>
          {question && <span className="text-xs text-gray-400">Vecka {question.week_number}, {question.year}</span>}
        </div>

        {/* Schemainfo */}
        {scheduleInfo.type === "thursday" ? (
          <div className="mt-2 mb-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
            🔔 <span className="font-medium">{scheduleInfo.message}</span>
          </div>
        ) : (
          <div className="mt-2 mb-3 bg-primary/5 border border-primary/20 text-primary text-xs px-3 py-2 rounded-lg flex items-center gap-2">
            🗓️ <span>{scheduleInfo.message} · <strong>{scheduleInfo.detail}</strong></span>
          </div>
        )}

        {!question ? (
          <p className="text-gray-400 mt-4">Ingen aktiv fråga just nu. Kom tillbaka snart!</p>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-800 mt-2 mb-1">{question.title}</h2>
            {question.description && <p className="text-gray-500 text-sm mb-4">{question.description}</p>}
            <p className="text-xs text-gray-400 mb-4">Publicerad {formatDate(question.published_at)}</p>
            {!hasVotedQuestion ? (
              <div className="space-y-2">
                {options.map(opt => (
                  <button key={opt.id} onClick={() => setSelectedOption(opt.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${selectedOption === opt.id ? "border-primary bg-primary/5 text-primary" : "border-gray-200 hover:border-primary/40 text-gray-700"}`}>
                    {opt.option_text}
                  </button>
                ))}
                <button onClick={submitQuestionVote} disabled={!selectedOption || submittingQuestion} className="btn-primary w-full mt-2">
                  {submittingQuestion ? "Röstar..." : "Rösta"}
                </button>
              </div>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg mb-4">
                  ✅ Du har svarat på veckans fråga.
                </div>
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Filtrera resultat:</p>
                  <ResultFilter value={qFilter} onChange={setQFilter} compact
                    availableAgeGroups={availableAgesQ.length > 0 ? availableAgesQ : undefined}
                    availableGenders={availableGendersQ.length > 0 ? availableGendersQ : undefined}
                    availableLan={availableLanQ.length > 0 ? availableLanQ : undefined}
                  />
                </div>
                <VoteChart data={qResults.map(r => ({ name: r.option_text, value: Number(r.vote_count) }))} showToggle />
              </>
            )}
          </>
        )}
      </div>

      {/* Partiomröstning */}
      <div className="card">
        <h2 className="font-bold text-gray-800 mb-1">Partiomröstning</h2>
        <p className="text-xs text-gray-500 mb-1">Vilket parti skulle du rösta på om det var val idag?</p>
        {/* Statusruta – visar rätt meddelande beroende på röstläge */}
        {(() => {
          if (!myPartyVote) {
            return (
              <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg mb-3">
                ℹ️ Din röst räknas i <strong>30 dagar</strong> — uppdatera den dagligen för att hålla den aktiv.
              </div>
            );
          }
          const expiresAt = new Date(myPartyVote.voted_at);
          expiresAt.setDate(expiresAt.getDate() + 30);
          const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);
          const expireStr = expiresAt.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
          const isExpired = daysLeft <= 0;
          const isWarning = !isExpired && daysLeft <= 3;

          let boxClass = "bg-gray-50 border-gray-200 text-gray-600";
          if (hasVotedPartyToday) boxClass = "bg-green-50 border-green-200 text-green-700";
          else if (isExpired)     boxClass = "bg-red-50 border-red-200 text-red-700";
          else if (isWarning)     boxClass = "bg-amber-50 border-amber-200 text-amber-700";

          return (
            <div className={`text-xs px-3 py-2 rounded-lg mb-3 border flex items-center gap-2 ${boxClass}`}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PARTIES[myPartyVote.party] ?? "#ccc" }} />
              <span>
                {hasVotedPartyToday ? (
                  <>✅ <strong>{myPartyVote.party}</strong> · Uppdaterad idag · Gäller t.o.m. {expireStr}</>
                ) : isExpired ? (
                  <>Din röst på <strong>{myPartyVote.party}</strong> har gått ut — rösta igen för att räknas med!</>
                ) : (
                  <>{isWarning && "⚠️ "}Din röst: <strong>{myPartyVote.party}</strong> · Gäller t.o.m. {expireStr} · Uppdatera dagligen</>
                )}
              </span>
            </div>
          );
        })()}

        {!hasVotedPartyToday && (
          <div className="space-y-1.5">
            {PARTY_LIST.map(party => (
              <button key={party} onClick={() => setSelectedParty(party)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 ${selectedParty === party ? "border-2 border-primary bg-primary/5" : "border-gray-200 hover:border-primary/30"}`}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PARTIES[party] }} />
                {party}
              </button>
            ))}
            <button onClick={submitPartyVote} disabled={!selectedParty || submittingParty} className="btn-primary w-full mt-2 text-sm">
              {submittingParty ? "Röstar..." : myPartyVote ? "Uppdatera röst" : "Rösta"}
            </button>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2 font-medium">Filtrera:</p>
          <ResultFilter value={partyFilter} onChange={setPartyFilter} compact
            availableAgeGroups={availableAgesParty.length > 0 ? availableAgesParty : undefined}
            availableGenders={availableGendersParty.length > 0 ? availableGendersParty : undefined}
            availableLan={availableLanParty.length > 0 ? availableLanParty : undefined}
          />
          <div className="mt-3">
            <VoteChart
              data={partyResults.map(r => ({ name: r.party, value: Number(r.vote_count), color: PARTIES[r.party] ?? "#ccc" }))}
              showToggle={false} defaultType="bar"
            />
          </div>
        </div>
      </div>

      <div className="sticky top-4 flex flex-col gap-4">
        <BannerAd position="right" />
        <BannerAd position="right-2" />
      </div>
    </div>
  );
}
