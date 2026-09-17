/**
 * Katalog intervensi — bagian deterministik dari mesin aturan (PRD §5.2).
 *
 * Isi berkas ini adalah pengetahuan domain, bukan data: langkah SOP fogging
 * fokus atau klorinasi sumur tidak berubah mengikuti dataset dan memang harus
 * ditulis sekali. Yang **tidak** ada di sini, dan sengaja: nama pejabat, nomor
 * telepon, nomor surat, dan angka "AI confidence". Empat hal itu dulu tertulis
 * sebagai konstanta di frontend dan tidak punya sumber mana pun — sebuah
 * nomor surat dinas palsu di layar juri adalah kerugian, bukan kelengkapan.
 */

export type ActionType =
  "fogging" | "psn" | "masker" | "klorinasi" | "logistik_obat" | "penyuluhan";

export type RiskClass = "rendah" | "sedang" | "tinggi";

export type ActionTemplate = {
  actionType: ActionType;
  title: string;
  description: string;
  picUnit: string;
  /** Hari kerja yang dibutuhkan unit pelaksana sebelum bulan prediksi tiba. */
  leadTimeDays: number;
  sopChecklist: string[];
};

/** Aturan: penyakit x kelas risiko -> daftar intervensi, terurut prioritas. */
const RULES: Record<string, Partial<Record<RiskClass, ActionTemplate[]>>> = {
  DBD: {
    tinggi: [
      {
        actionType: "fogging",
        title: "Fogging fokus & PSN 3M Plus serentak",
        description:
          "Model memproyeksikan kelas risiko tinggi pada bulan prediksi. Fogging fokus menekan nyamuk dewasa yang sudah terinfeksi, PSN memutus perindukannya — keduanya harus berjalan bersamaan agar populasi vektor tidak pulih dalam satu siklus.",
        picUnit: "Seksi Pencegahan & Pengendalian Penyakit Menular (P2PM)",
        leadTimeDays: 14,
        sopChecklist: [
          "Instruksikan puskesmas wilayah pada kecamatan target",
          "Mobilisasi kader Jumantik dan petugas surveilans tingkat RW",
          "Distribusi larvasida ke kelurahan dengan kasus indeks",
          "Fogging fokus siklus 1 pada radius 200 m dari kasus indeks",
          "Verifikasi Angka Bebas Jentik (ABJ) target >95% pasca intervensi",
        ],
      },
      {
        actionType: "logistik_obat",
        title: "Buffer stock reagen NS1 & cairan kristaloid",
        description:
          "Menyiapkan diagnostik dini dan cairan resusitasi sebelum rujukan meningkat. Aksi logistik dipisah dari aksi lapangan karena rantai pasoknya berbeda unit dan berbeda tenggat.",
        picUnit: "Instalasi Farmasi & Logistik Kesehatan",
        leadTimeDays: 21,
        sopChecklist: [
          "Audit sisa stok reagen RDT NS1 di gudang farmasi",
          "Alokasi reagen dan cairan kristaloid ke puskesmas kecamatan target",
          "Verifikasi suhu rantai dingin penyimpanan reagen",
          "Perbarui status ketersediaan pada sistem pelaporan logistik",
        ],
      },
    ],
    sedang: [
      {
        actionType: "psn",
        title: "PSN 3M Plus & pemantauan jentik berkala",
        description:
          "Kelas risiko sedang belum menuntut fogging — pengasapan pada populasi vektor rendah mempercepat resistensi insektisida tanpa menurunkan kasus. Yang dikerjakan adalah pemutusan perindukan.",
        picUnit: "Puskesmas wilayah & kader Jumantik",
        leadTimeDays: 21,
        sopChecklist: [
          "Penyuluhan PSN 3M Plus pada pertemuan RT/RW",
          "Pemeriksaan tempat penampungan air rumah tangga",
          "Pencatatan ABJ per kelurahan sebagai data dasar bulan berikutnya",
        ],
      },
    ],
  },

  ISPA: {
    tinggi: [
      {
        actionType: "masker",
        title: "Perlindungan kelompok rentan & sanitasi udara",
        description:
          "Proyeksi kelas risiko tinggi pada kelompok balita dan lansia. Intervensi diarahkan ke pengurangan paparan, bukan pengobatan, karena beban terbesar ISPA adalah kunjungan berulang yang bisa dicegah.",
        picUnit: "Seksi Pencegahan & Pengendalian Penyakit Menular (P2PM)",
        leadTimeDays: 10,
        sopChecklist: [
          "Distribusi masker medis ke puskesmas kecamatan target",
          "Skrining ISPA balita di posyandu dan PAUD",
          "Edukasi etika batuk dan ventilasi rumah pada pertemuan warga",
          "Pantau kualitas udara harian pada wilayah dekat sumber emisi",
        ],
      },
      {
        actionType: "logistik_obat",
        title: "Kesiapan layanan & obat ISPA puskesmas",
        description:
          "Menjaga layanan rawat jalan tetap sanggup menyerap lonjakan kunjungan tanpa memotong waktu periksa per pasien.",
        picUnit: "Instalasi Farmasi & Logistik Kesehatan",
        leadTimeDays: 14,
        sopChecklist: [
          "Audit stok obat simptomatik dan nebulizer di puskesmas target",
          "Tambah jadwal layanan rawat jalan pada jam puncak kunjungan",
          "Siapkan rujukan terencana untuk kasus dengan komorbid",
        ],
      },
    ],
    sedang: [
      {
        actionType: "penyuluhan",
        title: "Edukasi pencegahan ISPA di wilayah waspada",
        description:
          "Menahan kenaikan sebelum masuk kelas tinggi lewat perubahan perilaku yang murah: ventilasi, etika batuk, dan pengurangan pembakaran terbuka.",
        picUnit: "Bidang Promosi Kesehatan",
        leadTimeDays: 21,
        sopChecklist: [
          "Materi edukasi ventilasi rumah dan etika batuk untuk posyandu",
          "Imbauan pengurangan pembakaran sampah terbuka bersama kelurahan",
          "Pemantauan tren kunjungan ISPA mingguan di puskesmas",
        ],
      },
    ],
  },

  /* Leptospirosis menular lewat air dan lumpur yang tercemar urin tikus, jadi
     tenggatnya terikat banjir dan rob, bukan siklus vektor. Tujuh hari pada
     kelas tinggi dipilih karena masa inkubasinya 2–14 hari: intervensi yang
     datang tiga minggu setelah genangan surut sudah kehilangan gunanya. */
  LEPTOSPIROSIS: {
    tinggi: [
      {
        actionType: "klorinasi",
        title: "Sanitasi pascagenangan & pengendalian tikus",
        description:
          "Bakteri Leptospira bertahan berminggu-minggu di air dan lumpur yang tercemar urin tikus, dan pintu masuknya adalah luka lecet pada kaki yang menerjang genangan. Yang ditekan adalah dua-duanya: reservoirnya di populasi tikus, dan paparannya pada warga serta petugas kebersihan.",
        picUnit: "Tim Kesehatan Lingkungan (Kesling)",
        leadTimeDays: 7,
        sopChecklist: [
          "Pemetaan titik genangan dan tumpukan sampah sebagai sarang tikus",
          "Pengendalian tikus terpadu bersama kelurahan pada titik terpetakan",
          "Desinfeksi sumur gali dan tandon yang terendam banjir",
          "Distribusi sepatu bot dan sarung tangan bagi petugas kebersihan saluran",
          "Imbauan tidak menerjang genangan tanpa alas kaki tertutup",
        ],
      },
      {
        actionType: "logistik_obat",
        title: "Buffer stock doksisiklin & penemuan kasus dini",
        description:
          "Gejala awalnya menyerupai demam biasa dan pasien baru datang setelah ikterik atau gagal ginjal muncul. Kesiapan obat dipasangkan dengan kewaspadaan diagnosis di puskesmas supaya jeda itu memendek.",
        picUnit: "Instalasi Farmasi & Logistik Kesehatan",
        leadTimeDays: 14,
        sopChecklist: [
          "Audit sisa stok doksisiklin dan rapid test leptospirosis",
          "Alokasi ke puskesmas pada kecamatan target",
          "Pengingat kewaspadaan diagnosis: demam disertai nyeri betis dan mata merah setelah paparan banjir",
          "Aktifkan alur rujukan kasus berat ke rumah sakit rujukan",
        ],
      },
    ],
    sedang: [
      {
        actionType: "penyuluhan",
        title: "Edukasi paparan banjir & kebersihan lingkungan",
        description:
          "Kelas risiko sedang belum menuntut pengendalian tikus serentak. Yang dikerjakan adalah memutus paparan: warga tahu kapan harus memakai alas kaki tertutup, dan sampah tidak dibiarkan jadi sarang.",
        picUnit: "Puskesmas wilayah & kader kesehatan lingkungan",
        leadTimeDays: 21,
        sopChecklist: [
          "Penyuluhan risiko leptospirosis pada pertemuan RT/RW di kelurahan rawan rob",
          "Kerja bakti pembersihan saluran dan pengangkutan tumpukan sampah",
          "Imbauan menutup rapat tempat penyimpanan makanan dari tikus",
        ],
      },
    ],
  },
};

export function templatesFor(
  disease: string,
  riskClass: RiskClass,
): ActionTemplate[] {
  return (
    RULES[
      disease.toUpperCase() === "DBD" ? "DBD" : normalizeDisease(disease)
    ]?.[riskClass] ?? []
  );
}

function normalizeDisease(disease: string): string {
  const upper = disease.toUpperCase();
  if (upper === "ISPA") return "ISPA";
  return upper;
}

export const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  fogging: "Fogging & PSN",
  psn: "PSN 3M Plus",
  masker: "Sanitasi udara",
  klorinasi: "Klorinasi air",
  logistik_obat: "Buffer stock obat",
  penyuluhan: "Penyuluhan & edukasi",
};

/** Label fitur model dalam bahasa manusia — mengisi kalimat "Dasar:". */
export const DRIVER_LABEL: Record<string, string> = {
  rainfall_lag1: "curah hujan 1 bulan sebelumnya",
  rainfall_lag2: "curah hujan 2 bulan sebelumnya",
  rainfall_lag3: "curah hujan 3 bulan sebelumnya",
  rainfall_cumul_2m: "curah hujan kumulatif 2 bulan",
  temp_lag1: "suhu rata-rata 1 bulan sebelumnya",
  temp_lag2: "suhu rata-rata 2 bulan sebelumnya",
  temp_lag3: "suhu rata-rata 3 bulan sebelumnya",
  humidity_lag1: "kelembaban 1 bulan sebelumnya",
  humidity_lag2: "kelembaban 2 bulan sebelumnya",
  humidity_lag3: "kelembaban 3 bulan sebelumnya",
};

export function driverUnit(feature: string): string {
  if (feature.startsWith("rainfall")) return " mm";
  if (feature.startsWith("temp")) return " °C";
  if (feature.startsWith("humidity")) return "%";
  return "";
}
