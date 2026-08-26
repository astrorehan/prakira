"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNT } from "@/lib/auth";

type DemoAccountProps = {
  busy: boolean;
  disabled: boolean;
  onFill: () => void;
  onSignIn: () => void;
};

/**
 * Demo account — deliberately outside the sign-in card.
 *
 * It is a reviewer's shortcut, not part of the credential flow, so it sits on
 * its own paper with its own rule instead of sharing the card's surface.
 */
export function DemoAccount({ busy, disabled, onFill, onSignIn }: DemoAccountProps) {
  return (
    <section className="rounded-xl border border-dashed border-sand-300 bg-sand-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="overline">Akun demo</div>
          <p className="mt-1.5 font-mono text-2xs tabular text-paper-700">
            {DEMO_ACCOUNT.email}
            <span className="px-1.5 text-paper-600">·</span>
            {DEMO_ACCOUNT.password}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            loading={busy}
            disabled={disabled && !busy}
            onClick={onSignIn}
            className="group"
          >
            Masuk
            <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={onFill}
          >
            Isi ke formulir
          </Button>
        </div>
      </div>
    </section>
  );
}
