/**
 * Pembaca CSV minimal.
 *
 * Cukup untuk berkas dataset di repo ini dan untuk unggahan CSV admin:
 * pemisah koma, tanda kutip ganda dengan escape `""`, CRLF maupun LF. Tidak
 * memakai pustaka luar karena satu-satunya alternatif yang dibutuhkan —
 * pemisah selain koma — tidak dipakai di mana pun, dan menambah dependensi
 * untuk 40 baris kode adalah biaya tanpa imbalan.
 */

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const rows = parseRows(text.replace(/^﻿/, ""));
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim());
  const out: CsvRow[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    /* Baris kosong di akhir berkas bukan data. */
    if (cells.length === 1 && cells[0].trim() === "") continue;
    const row: CsvRow = {};
    header.forEach((key, index) => {
      row[key] = (cells[index] ?? "").trim();
    });
    out.push(row);
  }

  return out;
}

/** Nama kolom saja — dipakai validasi unggahan sebelum baris diproses. */
export function parseCsvHeader(text: string): string[] {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  return parseRows(firstLine)[0]?.map((h) => h.trim()) ?? [];
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
