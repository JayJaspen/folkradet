"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/dashboard/veckans-fraga", label: "Veckans fråga" },
  { href: "/dashboard/valjarbarometer", label: "Väljarbarometer" },
  { href: "/dashboard/forslag", label: "Förslag på frågor" },
  { href: "/dashboard/arkiv", label: "Arkiv" },
  { href: "/dashboard/min-sida", label: "Min sida" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      client.from("profiles").select("username, is_suspended").eq("id", data.user.id).single()
        .then(({ data: profile }) => {
          if (profile?.is_suspended) {
            client.auth.signOut().then(() => router.push("/login"));
          } else {
            setUsername(profile?.username ?? "");
          }
        });
    });
  }, [router]);

  async function handleLogout() {
    const client = createClient();
    await client.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <header className="bg-primary shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard/veckans-fraga" className="flex items-center gap-2">
            <div className="h-12 w-12 rounded-full ring-2 ring-white/60 overflow-hidden flex-shrink-0 bg-white/10">
              <img src="/logo.png" alt="Folkrådet" className="h-full w-full object-cover" />
            </div>
            <span className="text-white font-bold text-base">Folkrådet</span>
          </Link>
          <div className="flex items-center gap-3">
            {username && <span className="text-white/70 text-sm hidden sm:block">@{username}</span>}
            <button onClick={handleLogout} className="text-white/80 hover:text-white text-sm px-3 py-1.5 border border-white/20 rounded-lg hover:bg-white/10 transition-colors">
              Logga ut
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <nav className="flex gap-1 pb-0">
            {TABS.map(tab => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`whitespace-nowrap text-sm px-4 py-2.5 font-medium border-b-2 transition-colors ${active ? "border-gold text-gold" : "border-transparent text-white/60 hover:text-white hover:border-white/30"}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
