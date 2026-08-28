/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Tree-shake heavy barrel packages so only the icons/chart parts we use ship
  // to the client (lucide-react alone exports 1000+ icons).
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
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
        ],
      },
    ];
  },
};

export default nextConfig;
