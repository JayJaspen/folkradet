"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/admin/veckans-fraga", label: "Veckans fråga" },
  { href: "/admin/forslag", label: "Förslag" },
  { href: "/admin/statistik", label: "Statistik" },
  { href: "/admin/anvandare", label: "Användare" },
  { href: "/admin/cpm-banners", label: "CPM Banners" },
  { href: "/admin/installningar", label: "Inställningar" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      client.from("profiles").select("is_admin").eq("id", data.user.id).single()
        .then(({ data: p }) => {
          if (!p?.is_admin) { router.push("/dashboard/veckans-fraga"); return; }
          setChecking(false);
        });
    });
  }, [router]);

  async function handleLogout() {
    const client = createClient();
    await client.auth.signOut();
    router.push("/");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="Folkrådet" className="h-14 w-14 object-contain" />
            <span className="text-xs font-semibold text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <button onClick={handleLogout} className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Logga ut
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <nav className="flex gap-1">
            {TABS.map(tab => {
              const active = pathname === tab.href;
              return (
                <Link key={tab.href} href={tab.href}
                  className={`whitespace-nowrap text-sm px-4 py-2.5 font-medium border-b-2 transition-colors ${active ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-primary hover:border-primary/30"}`}>
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
