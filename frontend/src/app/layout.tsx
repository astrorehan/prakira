import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/layout-wrapper";

/* Two typefaces, no more. Inter carries the UI; IBM Plex Mono carries the data
   (labels, codes, units, timestamps). A third display face is what made the
   previous iteration read as a template — see docs/DESIGN-SYSTEM.md §0. */
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prakira — Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim",
  description:
    "Prakira memprediksi lonjakan kasus penyakit terkait iklim (DBD, ISPA, Diare, Leptospirosis) per kecamatan 2–4 minggu ke depan, dari data cuaca BMKG dan data kasus historis Kota Semarang. Decision support untuk Dinas Kesehatan, Puskesmas, dan warga.",
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Resolve the surface and the saved a11y prefs before first paint, so
            the canvas colour and text size never flash. LayoutWrapper keeps
            data-surface in sync on client-side navigation. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var p=location.pathname;var c=['/dashboard','/analitik','/admin','/verifikasi'].some(function(r){return p.indexOf(r)===0});d.setAttribute('data-surface',c?'console':'public');if(localStorage.getItem('prakira.a11y.contrast')==='1')d.classList.add('a11y-contrast');var f=localStorage.getItem('prakira.a11y.font');if(f==='lg')d.classList.add('a11y-large-text');else if(f==='sm')d.classList.add('a11y-small-text');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${sans.variable} ${mono.variable} min-h-screen font-sans text-foreground antialiased`}
      >
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
