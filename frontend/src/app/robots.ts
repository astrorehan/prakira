import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://prakira.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/tentang", "/sistem", "/warga", "/hubungi-kami"],
        disallow: ["/admin", "/verifikasi", "/masuk", "/dev", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

