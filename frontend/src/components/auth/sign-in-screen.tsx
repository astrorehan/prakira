"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { SignInForm } from "./sign-in-form";
import { useSessionContext } from "@/components/session-provider";
import { ApiError } from "@/lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Layar masuk.
 *
 * Dua hal hilang dari versi sebelumnya, keduanya disengaja:
 *
 * 1. Kartu "Akun demo" yang mencetak surel dan kata sandi di layar. Kredensial
 *    itu dulu juga hidup sebagai konstanta di dalam bundel JavaScript, jadi
 *    siapa pun bisa membacanya tanpa membuka halaman ini. Akun awal sekarang
 *    dibuat gateway saat seeding dan kredensialnya ada di `backend/.env.example`
 *    — tempat yang benar untuk rahasia pemasangan.
 * 2. `FAKE_LATENCY_MS` — jeda 650 ms yang ditambahkan supaya masuk "terasa
 *    seperti bekerja". Sekarang ada permintaan jaringan sungguhan, dan
 *    lamanya adalah lamanya.
 */
export function SignInScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, signIn } = useSessionContext();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /** Rute yang tadi ditolak penjaga konsol, supaya masuk mengembalikannya. */
  const next = params?.get("lanjut") ?? null;

  React.useEffect(() => {
    if (session) router.replace(next ?? session.home);
  }, [session, next, router]);

  const submit = async () => {
    if (loading) return;

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Format surel belum benar.");
      return;
    }
    if (password.length === 0) {
      setError("Kata sandi wajib diisi.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const user = await signIn(email.trim(), password);
      router.replace(next ?? user.home);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Tidak dapat menghubungi gateway. Pastikan layanan backend berjalan.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grad-page">
      <div className="container flex min-h-screen flex-col justify-center py-10 md:py-14">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between gap-4">
            <BrandLockup />

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-body-sm font-medium text-paper-600 transition-colors duration-fast hover:bg-paper-100 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Beranda
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-sand-200 bg-surface p-6 shadow-lift sm:p-8">
            <h1 className="text-h2 text-foreground">Masuk ke konsol</h1>
            <p className="mt-2 text-body-sm text-paper-600">
              Akun diterbitkan Dinas Kesehatan Kota Semarang.
            </p>

            <div className="mt-6">
              <SignInForm
                email={email}
                password={password}
                loading={loading}
                error={error}
                notice={null}
                onEmailChange={(value) => {
                  setEmail(value);
                  if (error) setError(null);
                }}
                onPasswordChange={(value) => {
                  setPassword(value);
                  if (error) setError(null);
                }}
                onSubmit={submit}
              />
            </div>
          </div>

          <p className="mt-6 text-center text-caption text-paper-600">
            Kredensial awal pemasangan ada di <code>backend/.env.example</code>.
            Ganti sebelum sistem dipakai di luar pengembangan.
          </p>
        </div>
      </div>
    </div>
  );
}
