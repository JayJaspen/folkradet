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
    supabase.from("weekly_questions").select("*")
      .eq("is_active", true).order("published_at", { ascending: false }).limit(1).single()
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

  // Hämta tillgängliga filtervärden för partiröster
  const fetchPartyFilterOptions = useCallback(async () => {
    const { data } = await supabase
      .from("party_votes")
      .select("profiles(gender, lan, birth_year)");
    if (!data) return;
    type ProfileRow = { gender: string; lan: string; birth_year: number };
    const profiles = (data as unknown as { profiles: ProfileRow[] | ProfileRow | null }[])
      .flatMap(r => (Array.isArray(r.profiles) ? r.profiles : r.profiles ? [r.profiles] : []));
    const curYear = new Date().getFullYear();
    const ageSet  = new Set<string>();
    profiles.forEach(p => {
      const age = curYear - p.birth_year;
      if (age <= 25) ageSet.add("18–25");
      else if (age <= 35) ageSet.add("26–35");
      else if (age <= 45) ageSet.add("36–45");
      else if (age <= 55) ageSet.add("46–55");
      else if (age <= 65) ageSet.add("56–65");
      else ageSet.add("65+");
    });
    setAvailableGendersParty([...new Set(profiles.map(p => p.gender).filter(Boolean))]);
    setAvailableLanParty([...new Set(profiles.map(p => p.lan).filter(Boolean))].sort());
    setAvailableAgesParty([...ageSet]);
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
    // Uppdatera tillgängliga filtervärden för frågeröster
    const { data: qVoters } = await supabase
      .from("question_votes")
      .select("profiles(gender, lan, birth_year)")
      .eq("question_id", question.id);
    if (qVoters) {
      type P = { gender: string; lan: string; birth_year: number };
      const profiles = (qVoters as unknown as { profiles: P[] | P | null }[])
        .flatMap(r => (Array.isArray(r.profiles) ? r.profiles : r.profiles ? [r.profiles] : []));
      setAvailableGendersQ([...new Set(profiles.map(p => p.gender).filter(Boolean))]);
      setAvailableLanQ([...new Set(profiles.map(p => p.lan).filter(Boolean))].sort());
      const curYear = new Date().getFullYear();
      const ageSet  = new Set<string>();
      profiles.forEach(p => {
        const age = curYear - p.birth_year;
        if (age <= 25) ageSet.add("18–25");
        else if (age <= 35) ageSet.add("26–35");
        else if (age <= 45) ageSet.add("36–45");
        else if (age <= 55) ageSet.add("46–55");
        else if (age <= 65) ageSet.add("56–65");
        else ageSet.add("65+");
      });
      setAvailableAgesQ([...ageSet]);
    }
  }, [question, qFilter]);

  useEffect(() => { fetchQResults(); }, [fetchQResults]);

  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    supabase.from("party_votes").select("id").eq("user_id", userId).eq("vote_date", today)
      .limit(1).then(({ data }) => setHasVotedPartyToday(!!(data && data.length > 0)));
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

  return (
    <div className="grid grid-cols-[160px_1fr_1fr_160px] gap-4 items-start">
      <div className="sticky top-4"><BannerAd position="left" /></div>

      {/* Veckans fråga */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Veckans fråga</span>
          {question && <span className="text-xs text-gray-400">Vecka {question.week_number}, {question.year}</span>}
        </div>
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
        <p className="text-xs text-gray-500 mb-4">Vilket parti skulle du rösta på om det var val idag?</p>
        {!hasVotedPartyToday ? (
          <div className="space-y-1.5">
            {PARTY_LIST.map(party => (
              <button key={party} onClick={() => setSelectedParty(party)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 ${selectedParty === party ? "border-2 border-primary bg-primary/5" : "border-gray-200 hover:border-primary/30"}`}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PARTIES[party] }} />
                {party}
              </button>
            ))}
            <button onClick={submitPartyVote} disabled={!selectedParty || submittingParty} className="btn-primary w-full mt-2 text-sm">
              {submittingParty ? "Röstar..." : "Rösta"}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-lg mb-3">
            ✅ Du har röstat idag. Kom tillbaka imorgon!
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

      <div className="sticky top-4"><BannerAd position="right" /></div>
    </div>
  );
}
