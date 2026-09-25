"use client";

import * as React from "react";
import { Building2, ChevronRight, Loader2, ShieldCheck, Stethoscope } from "lucide-react";
import { fetchDemoAccounts } from "@/lib/api";
import type { DemoAccount, Role } from "@/types";

const ROLE_COPY: Record<Role, { title: string; icon: typeof Building2 }> = {
  dinas: { title: "Dinas Kesehatan", icon: Building2 },
  puskesmas: { title: "Petugas Puskesmas", icon: Stethoscope },
  admin: { title: "Administrator", icon: ShieldCheck },
};

type DemoAccountsProps = {
  disabled: boolean;
  /** Menolak (throw) bila gagal supaya tombolnya kembali bisa ditekan. */
  onPick: (role: Role) => Promise<void>;
};

/**
 * Tombol "Masuk sebagai ..." untuk penilai.
 *
 * Muncul hanya bila gateway menyalakan `DEMO_LOGIN`; daftar perannya datang
 * dari gateway, dan tidak ada kata sandi yang ikut ke peramban.
 */
export function DemoAccounts({ disabled, onPick }: DemoAccountsProps) {
  const [accounts, setAccounts] = React.useState<DemoAccount[]>([]);
  const [pending, setPending] = React.useState<Role | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetchDemoAccounts()
      .then((result) => {
        if (alive && result.data.enabled) setAccounts(result.data.accounts);
      })
      .catch(() => {
        /* Gateway mati sudah dilaporkan formulir di bawah; tombol demo cukup
           tidak muncul. */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (accounts.length === 0) return null;

  return (
    <section aria-labelledby="demo-heading" className="mt-6">
      <h2 id="demo-heading" className="text-body-sm font-semibold text-foreground">
        Akun demo penilaian
      </h2>
      <p className="mt-1 text-caption text-paper-600">
        Pilih peran untuk langsung masuk tanpa kata sandi.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {accounts.map((account) => {
          const copy = ROLE_COPY[account.role];
          const Icon = copy?.icon ?? Building2;
          const busy = pending === account.role;
          return (
            <li key={account.role}>
              <button
                type="button"
                disabled={disabled || pending !== null}
                onClick={async () => {
                  setPending(account.role);
                  try {
                    await onPick(account.role);
                  } catch {
                    setPending(null);
                  }
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-paper-300 bg-surface px-4 py-3 text-left transition-colors duration-fast hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-semibold text-foreground">
                    Masuk sebagai {copy?.title ?? account.role}
                  </span>
                  <span className="block truncate text-caption text-paper-600">
                    {account.label}
                    {account.kecamatan ? ` · Kec. ${account.kecamatan}` : ""}
                  </span>
                </span>
                {busy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-paper-600" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-paper-600" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center gap-3 text-caption text-paper-600" aria-hidden>
        <span className="h-px flex-1 bg-sand-200" />
        atau masuk dengan surel
        <span className="h-px flex-1 bg-sand-200" />
      </div>
    </section>
  );
}
