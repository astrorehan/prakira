import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { CONSOLE_ROUTES } from "@/lib/routes";

/* One typeface. Inter carries everything — UI, headings, and data alike; its
   tabular figures cover what a separate mono used to do. */
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://prakira.vercel.app"),
  ),
  title: {
    default: "Prakira — Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim",
    template: "%s — Prakira",
  },
  description:
    "Prakira memperkirakan lonjakan kasus penyakit terkait iklim per kecamatan untuk bulan berikutnya, dari deret iklim dan rekapitulasi kasus historis Kota Semarang. Sistem pendukung keputusan untuk Dinas Kesehatan, puskesmas, dan warga.",
  keywords: [
    "Prakira",
    "Eco-Health",
    "Early Warning",
    "Prediksi Penyakit",
    "DBD",
    "ISPA",
    "Diare",
    "Leptospirosis",
    "BMKG",
    "Semarang",
    "ANFORCOM 2026",
  ],
  authors: [{ name: "Prakira Team — ANFORCOM 2026" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://prakira.vercel.app",
    title: "Prakira — Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim",
    description:
      "Platform prakiraan risiko penyakit berbasis iklim per kecamatan untuk bulan berikutnya, Kota Semarang.",
    siteName: "Prakira",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prakira — Early Warning Penyakit Berbasis Iklim",
    description:
      "Platform prakiraan risiko penyakit berbasis iklim per kecamatan untuk bulan berikutnya, Kota Semarang.",
  },
  /* Icons resolve from the App Router file conventions next to this file:
     favicon.ico, icon.svg, apple-icon.png. Only the manifest needs naming. */
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Resolve the surface and the saved a11y prefs before first paint, so
            the canvas colour and text size never flash. The route list is the
            same CONSOLE_ROUTES the wrapper uses — inlining a second copy here
            is how /tindakan ended up painting warm and then flipping cold.
            LayoutWrapper keeps data-surface in sync on client-side navigation. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var p=location.pathname;var c=${JSON.stringify(
              CONSOLE_ROUTES,
            )}.some(function(r){return p.indexOf(r)===0});d.setAttribute('data-surface',c?'console':'public');if(localStorage.getItem('prakira.a11y.contrast')==='1')d.classList.add('a11y-contrast');var f=localStorage.getItem('prakira.a11y.font');if(f==='lg')d.classList.add('a11y-large-text');else if(f==='sm')d.classList.add('a11y-small-text');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${sans.variable} min-h-screen font-sans text-foreground antialiased`}
      >
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
