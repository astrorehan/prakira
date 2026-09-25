/** @type {import('next').NextConfig} */
const nextConfig = {
  /* The dev server and `scripts/dev.mjs --production-frontend` may run side by
     side. Give the production demo its own output so `next build` cannot replace
     the dev server's live CSS and JS chunks in `.next`. */
  distDir: process.env.PRAKIRA_NEXT_DIST_DIR ?? ".next",
  reactStrictMode: false,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  /**
   * Proksi ke gateway.
   *
   * `API_PROXY_TARGET` sengaja bukan variabel `NEXT_PUBLIC_`: nilainya hanya
   * dipakai proses Next di server. Dengan begitu peramban memanggil `/api/*`
   * secara same-origin, cookie sesi ikut tanpa konfigurasi CORS, dan alamat
   * internal gateway tidak ikut terkirim ke klien.
   *
   * `NEXT_PUBLIC_API_URL` tetap dihormati untuk pemasangan yang memang menaruh
   * gateway di host lain tanpa proksi — di sana `lib/api.ts` memanggilnya
   * langsung dan CORS gateway harus mengizinkan asal frontend-nya.
   */
  async rewrites() {
    const target =
      process.env.API_PROXY_TARGET ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://127.0.0.1:4200";
    return [
      {
        source: "/api/:path*",
        destination: `${target.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
  async headers() {
    const productionHeaders = process.env.NODE_ENV === "production" ? [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://unpkg.com",
          "font-src 'self' data:",
          "connect-src 'self' https:",
        ].join("; "),
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000",
      },
    ] : [];
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          ...productionHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
