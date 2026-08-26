"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { SignInForm } from "./sign-in-form";
import { DemoAccount } from "./demo-account";
import {
  DEMO_ACCOUNT,
  findDemoAccount,
  saveSession,
  sessionFromAccount,
  type DemoAccount as DemoAccountFixture,
} from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Long enough to read as work being done, short enough not to annoy a judge. */
const FAKE_LATENCY_MS = 650;

export function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [demoBusy, setDemoBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const enter = (account: DemoAccountFixture) => {
    saveSession(sessionFromAccount(account));
    router.push(account.home);
  };

  const submit = () => {
    if (loading) return;
    setNotice(null);

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Format surel belum benar.");
      return;
    }
    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    setError(null);
    setLoading(true);
    timer.current = setTimeout(() => {
      const account = findDemoAccount(email, password);
      if (!account) {
        setLoading(false);
        setError("Kredensial tidak dikenali. Gunakan akun demo di bawah.");
        return;
      }
      enter(account);
    }, FAKE_LATENCY_MS);
  };

  const signInAsDemo = () => {
    if (loading) return;
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setError(null);
    setNotice(null);
    setLoading(true);
    setDemoBusy(true);
    timer.current = setTimeout(() => enter(DEMO_ACCOUNT), FAKE_LATENCY_MS);
  };

  const fillFromDemo = () => {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setError(null);
    setNotice("Kredensial demo terisi.");
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
                loading={loading && !demoBusy}
                error={error}
                notice={notice}
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

          {/* Reviewer shortcut — its own paper, clear of the card above. */}
          <div className="mt-8">
            <DemoAccount
              busy={demoBusy}
              disabled={loading}
              onFill={fillFromDemo}
              onSignIn={signInAsDemo}
            />
          </div>

          <p className="mt-6 text-center text-caption text-paper-600">
            Prototipe DSDC ANFORCOM 2026 — rute konsol belum dijaga.
          </p>
        </div>
      </div>
    </div>
  );
}
