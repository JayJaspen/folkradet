"use client";
import { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from "recharts";

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface Props {
  data: DataPoint[];
  title?: string;
  showToggle?: boolean;
  defaultType?: "pie" | "bar";
}

const COLORS = [
  "#003087", "#FECC00", "#27AE60", "#E74C3C",
  "#9B59B6", "#1ABC9C", "#F39C12", "#2980B9",
  "#E67E22", "#16A085",
];

export default function VoteChart({ data, title, showToggle = true, defaultType = "pie" }: Props) {
  const [chartType, setChartType] = useState<"pie" | "bar">(defaultType);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const enriched = data.map((d, i) => ({
    ...d,
    color: d.color ?? COLORS[i % COLORS.length],
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }));

  return (
    <div className="w-full">
      {(title || showToggle) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>}
          {showToggle && (
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => setChartType("pie")}
                className={`text-xs px-3 py-1 rounded-lg border transition-colors ${chartType === "pie" ? "bg-primary text-white border-primary" : "border-gray-200 text-gray-500 hover:border-primary hover:text-primary"}`}
              >
                Cirkel
              </button>
              <button
                onClick={() => setChartType("bar")}
                className={`text-xs px-3 py-1 rounded-lg border transition-colors ${chartType === "bar" ? "bg-primary text-white border-primary" : "border-gray-200 text-gray-500 hover:border-primary hover:text-primary"}`}
              >
                Stapel
              </button>
            </div>
          )}
        </div>
      )}

      {total === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          Inga röster ännu
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            {chartType === "pie" ? (
              <PieChart margin={{ top: 20, right: 20, bottom: 0, left: 20 }}>
                <Pie
                  data={enriched}
                  cx="50%"
                  cy="55%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, pct }) => `${name}: ${pct}%`}
                  labelLine={true}
                >
                  {enriched.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} röster`, "Antal"]} />
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={enriched} margin={{ top: 24, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, _name: string, props: { payload?: { pct?: number } }) => [`${v} röster (${props.payload?.pct ?? 0}%)`, "Röster"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {enriched.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                  <LabelList dataKey="pct" position="top" fontSize={11} formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
          <p className="text-center text-xs text-gray-400 mt-1">Totalt: {total} röster</p>
        </>
      )}
    </div>
  );
}
