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
      {/* Top bar – vit bakgrund så den mörka loggan syns tydligt */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-0 flex items-center justify-between">
          <Link href="/dashboard/veckans-fraga">
            <img src="/logo.png" alt="Folkrådet" className="h-16 w-16 object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            {username && <span className="text-gray-500 text-sm hidden sm:block">@{username}</span>}
            <button onClick={handleLogout} className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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
                  className={`whitespace-nowrap text-sm px-4 py-2.5 font-medium border-b-2 transition-colors ${active ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-primary hover:border-primary/30"}`}
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
