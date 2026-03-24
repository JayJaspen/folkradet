import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Folkrådet – En Röst För Folket",
  description: "Få din röst hörd, transparent och konfidentiellt",
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Folkrådet",
    description: "Få din röst hörd, transparent och konfidentiellt",
    url: "https://www.folkradet.se",
    siteName: "Folkrådet",
    locale: "sv_SE",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
