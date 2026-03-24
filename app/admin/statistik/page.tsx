"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ResultFilter, { FilterState } from "@/components/filters/ResultFilter";
import VoteChart from "@/components/charts/VoteChart";
import { formatDate } from "@/lib/utils";
import { GENDER_OPTIONS } from "@/lib/constants";

interface Question { id: string; title: string; published_at: string; week_number: number; year: number; }
interface VoteResult { option_id: string; option_text: string; vote_count: number; }

const EMPTY_FILTER: FilterState = { ageGroup: "", gender: "", lan: "" };

function filterLabel(f: FilterState): string {
  const parts = [];
  if (f.ageGroup) parts.push(`Ålder: ${f.ageGroup}`);
  if (f.gender) parts.push(`Kön: ${GENDER_OPTIONS.find(g => g.value === f.gender)?.label ?? f.gender}`);
  if (f.lan) parts.push(`Län: ${f.lan}`);
  return parts.length > 0 ? parts.join(" • ") : "Alla";
}

export default function AdminStatistikPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQ, setSelectedQ] = useState<Question | null>(null);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);

  // Tillgängliga filtervärden för vald fråga
  const [availableGenders, setAvailableGenders] = useState<string[]>([]);
  const [availableLan,     setAvailableLan]     = useState<string[]>([]);
  const [availableAges,    setAvailableAges]    = useState<string[]>([]);

  useEffect(() => {
    supabase.from("weekly_questions").select("id, title, published_at, week_number, year").order("published_at", { ascending: false })
      .then(({ data }) => {
        setQuestions(data ?? []);
        if (data && data.length > 0) setSelectedQ(data[0]);
      });
  }, []);

  // Hämta filtervärden via SECURITY DEFINER-funktion (kringgår RLS på profiles)
  const fetchFilterOptions = useCallback(async () => {
    if (!selectedQ) return;
    const { data, error } = await supabase.rpc("get_question_filter_options", { p_question_id: selectedQ.id });
    if (error || !data) return;
    const d = data as { genders: string[]; lans: string[]; age_groups: string[] };
    setAvailableGenders(d.genders ?? []);
    setAvailableLan(d.lans ?? []);
    setAvailableAges(d.age_groups ?? []);
  }, [selectedQ]);

  useEffect(() => { fetchFilterOptions(); }, [fetchFilterOptions]);

  const fetchResults = useCallback(async () => {
    if (!selectedQ) return;
    const { data, error } = await supabase.rpc("get_question_results", {
      p_question_id: selectedQ.id,
      p_age_group: filter.ageGroup || null,
      p_gender: filter.gender || null,
      p_lan: filter.lan || null,
    });
    if (!error) {
      const res = data ?? [];
      setResults(res);
      setTotalVotes(res.reduce((s: number, r: VoteResult) => s + Number(r.vote_count), 0));
      return;
    }
    // Fallback
    const { data: raw } = await supabase
      .from("question_votes")
      .select("option_id, question_options(option_text)")
      .eq("question_id", selectedQ.id);
    if (raw) {
      type RawVote = { option_id: string; question_options: { option_text: string }[] | { option_text: string } | null };
      const counts: Record<string, { text: string; count: number }> = {};
      (raw as unknown as RawVote[]).forEach(v => {
        const optText = Array.isArray(v.question_options)
          ? (v.question_options[0]?.option_text ?? v.option_id)
          : (v.question_options?.option_text ?? v.option_id);
        if (!counts[v.option_id]) counts[v.option_id] = { text: optText, count: 0 };
        counts[v.option_id].count++;
      });
      const res = Object.entries(counts).map(([option_id, { text, count }]) =>
        ({ option_id, option_text: text, vote_count: count }));
      setResults(res);
      setTotalVotes(res.reduce((s, r) => s + r.vote_count, 0));
    }
  }, [selectedQ, filter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  async function exportPDF() {
    if (!selectedQ || !chartRef.current) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: "#fff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const date = new Date().toLocaleDateString("sv-SE");
    pdf.setFontSize(16); pdf.setTextColor(8, 145, 178);
    pdf.text("Folkrådet – Admin Statistik", 14, 18);
    pdf.setFontSize(11); pdf.setTextColor(40, 40, 40);
    pdf.text(selectedQ.title, 14, 27);
    pdf.setFontSize(9); pdf.setTextColor(100, 100, 100);
    pdf.text(`Filtrering: ${filterLabel(filter)}`, 14, 34);
    pdf.text(`Totalt ${totalVotes} röster · Exporterat: ${date}`, 14, 40);
    const pdfW = pdf.internal.pageSize.getWidth() - 28;
    const imgProps = pdf.getImageProperties(imgData);
    pdf.addImage(imgData, "PNG", 14, 48, pdfW, (imgProps.height * pdfW) / imgProps.width);
    pdf.save(`folkradet-statistik-v${selectedQ.week_number}-${selectedQ.year}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-primary">Statistik</h1>
        {selectedQ && <button onClick={exportPDF} className="btn-secondary text-sm">📄 Exportera PDF</button>}
      </div>

      <div className="card">
        <div className="mb-4">
          <label className="label">Välj fråga</label>
          <select className="input max-w-xl" value={selectedQ?.id ?? ""}
            onChange={e => {
              const q = questions.find(q => q.id === e.target.value);
              if (q) { setSelectedQ(q); setFilter(EMPTY_FILTER); }
            }}>
            {questions.map(q => (
              <option key={q.id} value={q.id}>
                Vecka {q.week_number}, {q.year} – {q.title}
              </option>
            ))}
          </select>
        </div>

        {selectedQ && (
          <>
            <div className="flex items-center gap-4 flex-wrap mb-4">
              <div>
                <p className="text-xs text-gray-500">Fråga</p>
                <p className="font-semibold text-gray-800">{selectedQ.title}</p>
                <p className="text-xs text-gray-400">Publicerad {formatDate(selectedQ.published_at)}</p>
              </div>
              <div className="ml-auto">
                <div className="bg-primary/10 rounded-xl px-6 py-3 text-center">
                  <p className="text-2xl font-bold text-primary">{totalVotes}</p>
                  <p className="text-xs text-gray-500">Röster totalt</p>
                </div>
              </div>
            </div>

            <div className="mb-4 p-3 bg-surface rounded-xl">
              <p className="text-xs text-gray-500 mb-2 font-medium">Filtrera (visar bara alternativ med data):</p>
              <ResultFilter
                value={filter}
                onChange={setFilter}
                availableAgeGroups={availableAges.length > 0 ? availableAges : undefined}
                availableGenders={availableGenders.length > 0 ? availableGenders : undefined}
                availableLan={availableLan.length > 0 ? availableLan : undefined}
              />
            </div>

            <div ref={chartRef} className="bg-white rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-3">Filtrering: {filterLabel(filter)}</p>
              <VoteChart
                data={results.map(r => ({ name: r.option_text, value: Number(r.vote_count) }))}
                showToggle
              />
            </div>

            {results.length > 0 && (
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-medium text-xs">Svarsalternativ</th>
                    <th className="text-right py-2 text-gray-500 font-medium text-xs">Röster</th>
                    <th className="text-right py-2 text-gray-500 font-medium text-xs">Andel</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.option_id} className="border-b border-gray-50">
                      <td className="py-2">{r.option_text}</td>
                      <td className="py-2 text-right font-medium">{r.vote_count}</td>
                      <td className="py-2 text-right text-gray-500">
                        {totalVotes > 0 ? Math.round((Number(r.vote_count) / totalVotes) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
