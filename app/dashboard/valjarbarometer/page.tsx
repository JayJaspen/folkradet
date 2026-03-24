"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BannerAd from "@/components/BannerAd";
import ResultFilter, { FilterState } from "@/components/filters/ResultFilter";
import VoteChart from "@/components/charts/VoteChart";
import { PARTIES, GENDER_OPTIONS } from "@/lib/constants";

interface PartyResult { party: string; vote_count: number; }

const EMPTY_FILTER: FilterState = { ageGroup: "", gender: "", lan: "" };

function filterLabel(f: FilterState): string {
  const parts = [];
  if (f.ageGroup) parts.push(`Ålder: ${f.ageGroup}`);
  if (f.gender)   parts.push(`Kön: ${GENDER_OPTIONS.find(g => g.value === f.gender)?.label ?? f.gender}`);
  if (f.lan)      parts.push(`Län: ${f.lan}`);
  return parts.length > 0 ? parts.join(" • ") : "Alla";
}

export default function ValjarbarometerPage() {
  const supabase = createClient();
  const [filter,  setFilter]  = useState<FilterState>(EMPTY_FILTER);
  const [results, setResults] = useState<PartyResult[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  // Tillgängliga filtervärden (endast de som finns i datan)
  const [availableGenders, setAvailableGenders] = useState<string[]>([]);
  const [availableLan,     setAvailableLan]     = useState<string[]>([]);
  const [availableAges,    setAvailableAges]    = useState<string[]>([]);

  // Hämta tillgängliga filtervärden
  const fetchFilterOptions = useCallback(async () => {
    const { data } = await supabase
      .from("party_votes")
      .select("profiles(gender, lan, birth_year)");
    if (!data) return;
    type P = { gender: string; lan: string; birth_year: number };
    const profiles = (data as unknown as { profiles: P[] | P | null }[])
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
    setAvailableGenders([...new Set(profiles.map(p => p.gender).filter(Boolean))]);
    setAvailableLan([...new Set(profiles.map(p => p.lan).filter(Boolean))].sort());
    setAvailableAges([...ageSet]);
  }, []);

  useEffect(() => { fetchFilterOptions(); }, [fetchFilterOptions]);

  // Hämta resultat – försöker RPC, faller tillbaka på direkt query
  const fetchResults = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_party_results", {
      p_age_group: filter.ageGroup || null,
      p_gender:    filter.gender   || null,
      p_lan:       filter.lan      || null,
    });
    if (!error) { setResults(data ?? []); return; }

    console.warn("get_party_results RPC saknas, använder fallback:", error.message);
    const { data: raw } = await supabase.from("party_votes").select("party, user_id, voted_at");
    if (raw) {
      const latest: Record<string, string> = {};
      [...raw].sort((a, b) => a.voted_at < b.voted_at ? -1 : 1)
        .forEach(v => { latest[v.user_id] = v.party; });
      const counts: Record<string, number> = {};
      Object.values(latest).forEach(p => { counts[p] = (counts[p] ?? 0) + 1; });
      setResults(
        Object.entries(counts)
          .map(([party, vote_count]) => ({ party, vote_count }))
          .sort((a, b) => b.vote_count - a.vote_count)
      );
    }
  }, [filter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  async function exportPDF() {
    if (typeof window === "undefined") return;
    const { default: jsPDF }       = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    if (!chartRef.current) return;
    const canvas  = await html2canvas(chartRef.current, { scale: 2, backgroundColor: "#fff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf     = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const date    = new Date().toLocaleDateString("sv-SE");
    pdf.setFontSize(18); pdf.setTextColor(0, 48, 135);
    pdf.text("Folkrådet – Väljarbarometer", 14, 18);
    pdf.setFontSize(10); pdf.setTextColor(100, 100, 100);
    pdf.text(`Filtrering: ${filterLabel(filter)}`, 14, 26);
    pdf.text(`Exporterat: ${date}`, 14, 32);
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth() - 28;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 14, 40, pdfWidth, pdfHeight);
    pdf.save(`folkradet-valjarbarometer-${date}.pdf`);
  }

  const total = results.reduce((s, r) => s + Number(r.vote_count), 0);

  return (
    <div className="grid grid-cols-[160px_1fr_160px] gap-4 items-start">
      <div className="sticky top-4 flex flex-col gap-4">
        <BannerAd position="left" />
        <BannerAd position="left-2" />
      </div>

      <div className="card">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-primary">Väljarbarometer</h1>
            <p className="text-sm text-gray-500">Hur skulle Sverige rösta idag?</p>
          </div>
          <button onClick={exportPDF} className="btn-secondary text-sm flex items-center gap-1">
            📄 Exportera PDF
          </button>
        </div>

        <div className="mb-4 p-3 bg-surface rounded-xl">
          <p className="text-xs text-gray-500 mb-2 font-medium">Filtrera resultat:</p>
          <ResultFilter value={filter} onChange={setFilter}
            availableAgeGroups={availableAges.length   > 0 ? availableAges   : undefined}
            availableGenders={availableGenders.length  > 0 ? availableGenders : undefined}
            availableLan={availableLan.length          > 0 ? availableLan    : undefined}
          />
          <p className="text-xs text-gray-400 mt-2">Visar: <span className="font-medium text-gray-600">{filterLabel(filter)}</span></p>
        </div>

        <div ref={chartRef} className="bg-white p-4 rounded-xl">
          <h2 className="font-semibold text-gray-700 mb-1 text-sm">Partifördelning</h2>
          <p className="text-xs text-gray-400 mb-3">Filtrering: {filterLabel(filter)} · {total} röster totalt</p>
          <VoteChart
            data={results.map(r => ({ name: r.party, value: Number(r.vote_count), color: PARTIES[r.party] ?? "#ccc" }))}
            showToggle defaultType="bar"
          />
        </div>

        {results.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium text-xs">Parti</th>
                  <th className="text-right py-2 text-gray-500 font-medium text-xs">Röster</th>
                  <th className="text-right py-2 text-gray-500 font-medium text-xs">Andel</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.party} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ background: PARTIES[r.party] ?? "#ccc" }} />
                      {r.party}
                    </td>
                    <td className="py-2 text-right font-medium">{r.vote_count}</td>
                    <td className="py-2 text-right text-gray-500">
                      {total > 0 ? Math.round((Number(r.vote_count) / total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="sticky top-4 flex flex-col gap-4">
        <BannerAd position="right" />
        <BannerAd position="right-2" />
      </div>
    </div>
  );
}
