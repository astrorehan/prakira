import type { Metadata } from "next";
import { SignInScreen } from "@/components/auth/sign-in-screen";

export const metadata: Metadata = {
  title: "Masuk — Prakira",
  description:
    "Masuk ke konsol petugas Prakira untuk membuka dashboard prediksi, analitik model, antrean verifikasi laporan warga, dan manajemen data.",
  robots: { index: false, follow: false },
};

export default function MasukPage() {
  return <SignInScreen />;
}
