import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://prakira.vercel.app";
  const now = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/sistem`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/warga`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/warga/lapor`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/warga/status`,
      lastModified: now,
      changeFrequency: "always",
      priority: 0.8,
    },
    {
      /* Rute publik: transparansi model dapat dirujuk dari luar dinas. */
      url: `${baseUrl}/model`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      /* Rute publik: hasil uji per kecamatan bisa dirujuk dari luar dinas. */
      url: `${baseUrl}/mesin-waktu`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      /* Rute publik: simulator memakai model yang sama dengan dashboard. */
      url: `${baseUrl}/simulasi`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      /* Rute publik: peringkat prioritas hanya memuat agregat wilayah. */
      url: `${baseUrl}/prioritas`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tentang`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/hubungi-kami`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/analitik`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tindakan`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];
}

