import Link from "next/link";

export const metadata = {
  title: "Integritetspolicy – Folkrådet",
  description: "Hur Folkrådet hanterar dina personuppgifter.",
};

export default function IntegritetspolicyPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full flex justify-between items-center px-6 py-2 bg-white shadow-sm">
        <Link href="/">
          <img src="/logo-header.png" alt="Folkrådet" className="h-16 w-auto object-contain" />
        </Link>
        <nav className="flex gap-2">
          <Link href="/login" className="text-gray-700 hover:text-primary text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Logga in
          </Link>
          <Link href="/register" className="bg-primary text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-primary-light transition-colors">
            Registrera
          </Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold text-primary mb-2">Integritetspolicy</h1>
        <p className="text-gray-400 text-sm mb-8">Senast uppdaterad: mars 2026</p>

        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">1. Personuppgiftsansvarig</h2>
            <p>
              Folkrådet är personuppgiftsansvarig för behandlingen av dina personuppgifter.
              Vid frågor om hur vi hanterar dina uppgifter, kontakta oss på{" "}
              <a href="mailto:info@folkradet.se" className="text-primary hover:underline">
                info@folkradet.se
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">2. Vilka uppgifter samlar vi in?</h2>
            <p className="mb-2">Vi samlar in följande uppgifter när du registrerar dig:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Förnamn och efternamn</li>
              <li>E-postadress</li>
              <li>Mobilnummer (för SMS-verifiering)</li>
              <li>Användarnamn</li>
              <li>Kön</li>
              <li>Födelseår</li>
              <li>Län</li>
            </ul>
            <p className="mt-2">
              Vi samlar även in dina svar på veckans frågor och din partiröst. Dessa uppgifter
              lagras anonymiserat i statistiken — ditt namn syns aldrig för andra användare.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">3. Varför behandlar vi dina uppgifter?</h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Kontoadministration</p>
                <p className="text-gray-500">För att skapa och hantera ditt konto, verifiera din identitet via SMS och möjliggöra inloggning. Rättslig grund: avtal.</p>
              </div>
              <div>
                <p className="font-medium">Statistik och demokratisk insamling</p>
                <p className="text-gray-500">För att visa aggregerad statistik uppdelad på demografiska grupper (kön, ålder, region). Enskilda svar är aldrig synliga för andra. Rättslig grund: berättigat intresse.</p>
              </div>
              <div>
                <p className="font-medium">Kommunikation</p>
                <p className="text-gray-500">Vi kan använda din e-postadress för att kontakta dig vid viktiga ändringar av tjänsten. Vi skickar inga nyhetsbrev utan ditt samtycke. Rättslig grund: berättigat intresse.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">4. Hur länge sparar vi dina uppgifter?</h2>
            <p>
              Vi sparar dina uppgifter så länge ditt konto är aktivt. Om du begär att ditt konto
              raderas tar vi bort dina personuppgifter inom 30 dagar. Anonymiserad statistik
              (utan koppling till dig som person) kan behållas längre för historiska syften.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">5. Delas dina uppgifter med tredje part?</h2>
            <p className="mb-2">Vi delar inte dina personuppgifter med obehöriga tredje parter. Vi använder följande underleverantörer:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium">Supabase</span> — databas och autentisering (servrar inom EU)</li>
              <li><span className="font-medium">Vercel</span> — webbhosting (servrar inom EU/USA, Privacy Shield-certifierat)</li>
              <li><span className="font-medium">46elks</span> — SMS-verifiering (svenskt företag)</li>
            </ul>
            <p className="mt-2">Alla underleverantörer behandlar uppgifter enligt GDPR.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">6. Cookies</h2>
            <p>
              Vi använder nödvändiga cookies för att hålla dig inloggad (sessions-cookies via
              Supabase Auth). Vi använder inga spårningscookies eller marknadsföringscookies.
              Om vi lägger till analys- eller annonstjänster i framtiden kommer vi att uppdatera
              denna policy och inhämta ditt samtycke.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">7. Dina rättigheter</h2>
            <p className="mb-2">Enligt GDPR har du rätt att:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium">Få tillgång</span> till de uppgifter vi har om dig</li>
              <li><span className="font-medium">Rätta</span> felaktiga uppgifter</li>
              <li><span className="font-medium">Radera</span> ditt konto och dina uppgifter ("rätten att bli glömd")</li>
              <li><span className="font-medium">Begränsa</span> behandlingen av dina uppgifter</li>
              <li><span className="font-medium">Invända</span> mot behandling baserad på berättigat intresse</li>
              <li><span className="font-medium">Dataportabilitet</span> — få ut dina uppgifter i ett maskinläsbart format</li>
            </ul>
            <p className="mt-2">
              Kontakta oss på{" "}
              <a href="mailto:info@folkradet.se" className="text-primary hover:underline">
                info@folkradet.se
              </a>{" "}
              för att utöva dina rättigheter. Vi svarar inom 30 dagar.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">8. Klagomål</h2>
            <p>
              Om du anser att vi behandlar dina uppgifter felaktigt har du rätt att lämna
              klagomål till{" "}
              <a
                href="https://www.imy.se"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Integritetsskyddsmyndigheten (IMY)
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">9. Ändringar i policyn</h2>
            <p>
              Vi kan komma att uppdatera denna policy. Vid väsentliga ändringar meddelar vi
              dig via e-post eller ett meddelande på webbplatsen. Datum för senaste uppdatering
              visas längst upp på sidan.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <Link href="/" className="text-primary text-sm hover:underline">
            ← Tillbaka till startsidan
          </Link>
        </div>
      </main>

      <footer className="text-center text-gray-400 text-xs py-6 px-4 bg-white border-t border-gray-100">
        © {new Date().getFullYear()} Folkrådet. Kontakt:{" "}
        <a href="mailto:info@folkradet.se" className="hover:text-gray-600 underline">
          info@folkradet.se
        </a>
      </footer>
    </div>
  );
}
