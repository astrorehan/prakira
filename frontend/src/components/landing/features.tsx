import {
  CloudRain,
  Activity,
  Users,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "primary" | "amber" | "clay";
}

const FEATURES: Feature[] = [
  {
    icon: Activity,
    title: "Prediksi Dini Multi-Penyakit",
    description:
      "Estimasi risiko lonjakan DBD, ISPA, dan Diare per kecamatan 2-4 minggu ke depan berbasis Random Forest & XGBoost.",
    accent: "primary",
  },
  {
    icon: CloudRain,
    title: "Korelasi Cuaca & Iklim BMKG",
    description:
      "Sinkronisasi otomatis observasi curah hujan, suhu, dan kelembaban udara dari stasiun BMKG Kota Semarang.",
  },
  {
    icon: Users,
    title: "Portal Publik & Edukasi Warga",
    description:
      "Akses terbuka bagi masyarakat untuk mengecek status risiko tempat tinggal serta panduan 3M Plus dan PHBS.",
    accent: "amber",
  },
  {
    icon: ShieldCheck,
    title: "Manajemen Data & Audit Trail",
    description:
      "Pencatatan log perubahan data kasus dan inferensi model Machine Learning yang transparan dan akuntabel.",
    accent: "clay",
  },
];

const ACCENT_CLASSES: Record<NonNullable<Feature["accent"]> | "default", string> = {
  default: "bg-brand-100 text-brand-700",
  primary: "bg-primary text-white shadow-sm",
  amber: "bg-risk-medium-bg text-risk-medium",
  clay: "bg-brand-100 text-brand-800",
};

export function Features() {
  return (
    <section id="features" className="container scroll-mt-24 py-20 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow">Fitur Utama Platform</div>
        <h2 className="mt-5 h-section text-balance">
          Satu platform untuk seluruh siklus surveilans kesehatan
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Dari deteksi anomali cuaca hingga intervensi taktis — mengubah pola penanganan reaktif menjadi tindakan preventif terarah.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, description, accent }, i) => (
          <div
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-paper-200/90 bg-white p-7 shadow-card transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
            style={{ animationDelay: (i * 60) + "ms" }}
          >
            <div
              className={"flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 " + ACCENT_CLASSES[accent ?? "default"]}
            >
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary-soft opacity-0 blur-2xl transition-opacity group-hover:opacity-60" />
          </div>
        ))}
      </div>
    </section>
  );
}