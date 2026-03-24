"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatUserCount } from "@/lib/utils";

export default function HomePage() {
  const [userCount, setUserCount] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCount() {
      const supabase = createClient();
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (count !== null) {
        setUserCount(formatUserCount(count));
      }
    }
    fetchCount();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #061e28 0%, #0e4a5c 50%, #061e28 100%)" }}>
      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full ring-2 ring-white/60 overflow-hidden flex-shrink-0 bg-white/10">
            <img src="/logo.png" alt="Folkrådet" className="h-full w-full object-cover" />
          </div>
          <span className="text-white font-bold text-xl tracking-wide">Folkrådet</span>
        </div>
        <nav className="flex gap-2">
          <Link href="/login" className="text-white/90 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
            Logga in
          </Link>
          <Link href="/register" className="bg-gold text-primary font-semibold text-sm px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors">
            Registrera
          </Link>
          <Link href="/contact" className="text-white/90 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
            Kontakta oss
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        {/* Hero logo */}
        <div className="h-28 w-28 rounded-full ring-4 ring-white/40 overflow-hidden mb-6 shadow-2xl">
          <img src="/logo.png" alt="Folkrådet" className="h-full w-full object-cover" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          Demokrati för alla
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4 max-w-3xl">
          En Röst För <span className="text-gold">Folket</span>
        </h1>
        <p className="text-xl text-white/70 mb-10 max-w-xl">
          Få din röst hörd, transparent och konfidentiellt
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/register" className="bg-gold text-primary font-bold px-8 py-3.5 rounded-xl text-base hover:bg-yellow-300 transition-colors shadow-lg shadow-gold/20">
            Registrera dig gratis
          </Link>
          <Link href="/login" className="bg-white/10 border border-white/20 text-white font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-white/20 transition-colors">
            Logga in
          </Link>
        </div>

        {/* User counter */}
        {userCount && (
          <div className="bg-white/10 border border-white/20 rounded-2xl px-8 py-5 backdrop-blur-sm">
            <div className="text-4xl font-extrabold text-gold mb-1">{userCount}</div>
            <div className="text-white/70 text-sm">registrerade användare</div>
          </div>
        )}

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-3xl w-full">
          {[
            { icon: "🗳️", title: "Veckans fråga", desc: "Svara på aktuella samhällsfrågor varje vecka" },
            { icon: "📊", title: "Väljarbarometer", desc: "Se hur Sverige röstar i realtid" },
            { icon: "🔒", title: "Konfidentiellt", desc: "Dina uppgifter är skyddade och aldrig synliga för andra" },
          ].map((f) => (
            <div key={f.title} className="bg-white/10 border border-white/15 rounded-xl p-5 text-left backdrop-blur-sm">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-white font-semibold text-sm mb-1">{f.title}</div>
              <div className="text-white/60 text-xs">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-white/40 text-xs py-6 px-4">
        © {new Date().getFullYear()} Folkrådet. Kontakt:{" "}
        <a href="mailto:info@folkradet.se" className="hover:text-white/70 underline">
          info@folkradet.se
        </a>
      </footer>
    </div>
  );
}
