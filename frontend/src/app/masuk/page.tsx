import type { Metadata } from "next";
import { SignInScreen } from "@/components/auth/sign-in-screen";

export const metadata: Metadata = {
  title: "Masuk — Prakira",
  description:
    "Masuk ke konsol petugas Prakira, atau gunakan akun demo untuk meninjau modul dashboard prediksi, analitik, dan manajemen data BMKG.",
  robots: { index: false, follow: false },
};

export default function MasukPage() {
  return <SignInScreen />;
}
