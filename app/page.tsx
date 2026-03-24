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
    <div className="min-h-screen flex flex-col">
      {/* Vit header – loggan syns tydligt mot vit bakgrund */}
      <header className="w-full flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        <img src="/logo.png" alt="Folkrådet" className="h-16 w-16 object-contain" />
        <nav className="flex gap-2">
          <Link href="/login" className="text-gray-700 hover:text-primary text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Logga in
          </Link>
          <Link href="/register" className="bg-primary text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-primary-light transition-colors">
            Registrera
          </Link>
          <Link href="/contact" className="text-gray-700 hover:text-primary text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Kontakta oss
          </Link>
        </nav>
      </header>

      {/* Hero – mörk gradient med loggan stor och tydlig */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center"
        style={{ background: "linear-gradient(135deg, #0e4a5c 0%, #0891b2 50%, #0e4a5c 100%)" }}>

        {/* Hero logo – full logga utan klippning */}
        <img src="/logo.png" alt="Folkrådet" className="h-52 w-52 object-contain mb-6 drop-shadow-2xl rounded-2xl" />

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
          <Link href="/register" className="bg-gold text-primary-dark font-bold px-8 py-3.5 rounded-xl text-base hover:bg-gold-dark transition-colors shadow-lg">
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
      <footer className="text-center text-gray-400 text-xs py-6 px-4 bg-white border-t border-gray-100">
        © {new Date().getFullYear()} Folkrådet. Kontakt:{" "}
        <a href="mailto:info@folkradet.se" className="hover:text-gray-600 underline">
          info@folkradet.se
        </a>
      </footer>
    </div>
  );
}
