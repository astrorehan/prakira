"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global Layout Error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen flex items-center justify-center bg-[#F5F7F7] font-sans p-6 text-[#0E2225]">
        <div className="max-w-md w-full text-center space-y-5 bg-white p-8 rounded-3xl border border-[#DFE6E6] shadow-lg">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBECE8] text-[#A8442C] font-bold text-xl">
            !
          </div>
          <h1 className="text-2xl font-bold text-[#0E2225]">
            Terjadi Kesalahan Kritis
          </h1>
          <p className="text-sm text-[#5A6C6E] leading-relaxed">
            Sistem mengalami kegagalan saat memuat antarmuka global. Silakan klik tombol di bawah untuk memulihkan sesi.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full rounded-full bg-[#0B4A57] text-white py-3 px-6 text-sm font-semibold hover:bg-[#093843] transition-colors"
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      </body>
    </html>
  );
}

