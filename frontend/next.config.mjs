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
  async rewrites() {
    // Default to the Express gateway (:4200) to match NEXT_PUBLIC_API_URL and
    // src/lib/api.ts — not the FastAPI service (:8000) directly.
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
