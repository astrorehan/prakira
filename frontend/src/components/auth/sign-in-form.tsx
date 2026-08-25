"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignInFormProps = {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  notice: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

/**
 * Sign-in form — the credential half of /masuk.
 *
 * State lives in the parent so the demo card below can write into these
 * fields. Errors are announced, not just coloured: `role="alert"` plus an icon.
 */
export function SignInForm({
  email,
  password,
  loading,
  error,
  notice,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: SignInFormProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Surel dinas</Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-400"
            aria-hidden
          />
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            spellCheck={false}
            placeholder="nama@dinkes.semarangkota.go.id"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            aria-invalid={Boolean(error) || undefined}
            className="h-12 pl-10"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password">Kata sandi</Label>
          <Link
            href="/hubungi-kami"
            className="text-caption font-medium text-brand-600 underline-offset-4 hover:underline"
          >
            Lupa kata sandi?
          </Link>
        </div>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-400"
            aria-hidden
          />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            aria-invalid={Boolean(error) || undefined}
            className="h-12 pl-10 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-paper-500 transition-colors duration-fast hover:bg-paper-100 hover:text-paper-800"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-body-sm text-paper-600">
        <input
          type="checkbox"
          name="remember"
          defaultChecked
          className="h-4 w-4 rounded border-border-strong accent-brand-700"
        />
        <span>Ingat perangkat ini selama 30 hari</span>
      </label>

      <div aria-live="polite" className="empty:hidden">
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-risk-high-br bg-risk-high-bg px-3.5 py-2.5 text-body-sm text-risk-high"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        ) : notice ? (
          <p className="rounded-lg border border-brand-300/45 bg-brand-50 px-3.5 py-2.5 text-body-sm text-brand-700">
            {notice}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" loading={loading} className="w-full">
        Masuk ke konsol
      </Button>
    </form>
  );
}
