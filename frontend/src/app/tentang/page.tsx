import {
  Cpu,
  Database,
  Globe,
  CloudRain,
  Sparkles,
  Target,
  ShieldCheck,
  Activity,
  Droplets,
  Wind,
} from "lucide-react";
import { Card } from "@/components/ui/card";

export default function TentangPage() {
  return (
    <div className="container space-y-16 py-12 md:py-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="eyebrow mx-auto">
          <Sparkles className="h-3 w-3" />
          Manifesto Eco-Health
        </div>
        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl text-foreground">
          Mengapa kami membangun <span className="text-primary">Prakira</span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
          Penanganan wabah DBD, lonjakan ISPA, dan diare di Indonesia selama ini bersifat <em>reaktif</em> — respons baru dimulai setelah bangsal rumah sakit penuh dan status KLB ditetapkan. 
          <strong> Prakira</strong> mengubah paradigma ini dengan memprediksi lonjakan risiko 2-4 minggu lebih awal memanfaatkan integrasi Machine Learning dan data iklim BMKG secara real-time.
        </p>
      </section>

      {/* Problem grid */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Tantangan Lapangan</div>
          <h2 className="mt-5 h-section">Tiga Keterbatasan Surveilans Tradisional</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Issue
            numeral="01"
            title="Respons Terlambat (Lagging)"
            body="Fogging dan klorinasi air sering kali baru dilakukan setelah klaster kasus meluas, padahal masa inkubasi virus dan perkembangan vektor sudah terjadi 2-3 minggu sebelumnya."
          />
          <Issue
            numeral="02"
            title="Data Terisolasi & Belum Terintegrasi"
            body="Data observasi cuaca BMKG dan pencatatan epidemiologi puskesmas berada di sistem terpisah, sehingga korelasi curah hujan atau suhu ekstrem tidak termanfaatkan secara prediktif."
          />
          <Issue
            numeral="03"
            title="Distribusi Logistik Kurang Presisi"
            body="Alokasi bubuk abate, stok oralit, masker, dan jadwal fogging puskesmas dilakukan merata tanpa prioritisasi berbasis level risiko per wilayah kecamatan."
          />
        </div>
      </section>

      {/* Method */}
      <section className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <header>
          <div className="eyebrow">
            <Target className="h-3 w-3" />
            Metodologi AI
          </div>
          <h2 className="mt-5 h-section">Pendekatan Walk-Forward Machine Learning</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Model dilatih menggunakan validasi time-series berurutan (train 2020-2024, test 2025-2026) untuk menghindari kebocoran data masa depan (*data leakage*).
          </p>
        </header>
        <ol className="space-y-3">
          {[
            {
              title: "1. Agregasi Data Iklim BMKG",
              body: "Ekstraksi curah hujan harian kumulatif, fluktuasi suhu minimum-maksimum, dan kelembaban udara per kecamatan.",
            },
            {
              title: "2. Rekayasa Fitur Lag Epidemiologi",
              body: "Perhitungan Lag-1 (7 hari) hingga Lag-4 (28 hari) untuk mencocokkan siklus hidup vektor Aedes aegypti dan masa inkubasi patogen.",
            },
            {
              title: "3. Ensemble Machine Learning",
              body: "Random Forest Regressor, XGBoost, dan LSTM untuk menangani hubungan non-linier antara fluktuasi cuaca dan dinamika transmisi penyakit.",
            },
            {
              title: "4. Klasifikasi Ambang Batas Risiko",
              body: "Transformasi nilai insiden per 100.000 penduduk menjadi 3 tingkatan aksi: Rendah (Aman), Sedang (Waspada), dan Tinggi (Bahaya).",
            },
            {
              title: "5. Otomasi Rekomendasi Intervensi",
              body: "Sistem pendukung keputusan menerbitkan rekomendasi taktis (Fogging Fokus radius 200m, PSN massal, inspeksi sanitasi, klorinasi air).",
            },
          ].map((s, i) => (
            <li
              key={s.title}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                {i + 1}
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Stack */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">
            <Cpu className="h-3 w-3" />
            Tech Stack & Arsitektur
          </div>
          <h2 className="mt-5 h-section">Fondasi Teknologi</h2>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="p-5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {s.label}
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">
                  {s.value}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Prakira Eco-Health — DSDC ANFORCOM 2026 Kota Semarang
      </div>
    </div>
  );
}

const STACK = [
  { icon: Globe, label: "Frontend", value: "Next.js 14 + Tailwind CSS + Leaflet + Recharts" },
  { icon: Cpu, label: "Machine Learning", value: "XGBoost + Random Forest (Scikit-Learn / FastAPI)" },
  { icon: CloudRain, label: "Data Cuaca", value: "BMKG Open API (4 AWS Kota Semarang)" },
  { icon: Activity, label: "Data Kasus", value: "Open Data Dinas Kesehatan Kota Semarang" },
  { icon: Database, label: "Basis Data", value: "PostgreSQL + PostGIS Spatial Engine" },
  { icon: ShieldCheck, label: "Audit Trail", value: "Immutable Log Logging & Role-Based Access" },
];

function Issue({
  numeral,
  title,
  body,
}: {
  numeral: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="text-3xl font-semibold tracking-tight text-primary">
        {numeral}
      </div>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}
