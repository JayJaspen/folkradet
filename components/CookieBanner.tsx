"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookies_accepted");
    if (!accepted) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookies_accepted", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-4 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="text-sm text-gray-200 flex-1">
          <span className="font-semibold text-white">🍪 Vi använder cookies</span>
          {" "}— Folkrådet använder nödvändiga cookies för inloggning och sessionshantering.
          Vi samlar inte in data för marknadsföring.{" "}
          <Link href="/integritetspolicy" className="text-primary-light underline hover:text-white transition-colors">
            Läs vår integritetspolicy
          </Link>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={accept}
            className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Jag förstår
          </button>
        </div>
      </div>
    </div>
  );
}
