import nodemailer from "nodemailer";
import { transaction } from "../db/index.js";
import { env } from "../env.js";
import {
  REPORT_COLUMNS,
  REPORT_FAMILY,
  ForwardStateError,
  agencyFor,
  findReport,
  riskContextFor,
  riskKey,
  type ReportKind,
  type ReportRow,
  type RiskContext,
} from "./reports.js";
import { isSimulated } from "./demo.js";

const KIND_LABEL: Record<ReportKind, string> = {
  gejala: "gejala",
  jentik: "jentik nyamuk",
  genangan: "genangan",
  sampah: "timbunan sampah",
  saluran: "saluran tersumbat",
};

export class ReportEmailConfigError extends Error {
  constructor(message = "Pengiriman email belum dikonfigurasi. Isi SMTP_HOST, SMTP_USER, SMTP_PASS, dan SMTP_FROM di server.") {
    super(message);
  }
}

export class ReportEmailDeliveryError extends Error {
  constructor() {
    super("Pengiriman email belum terkonfirmasi. Periksa log server sebelum mencoba lagi.");
  }
}

export function recipientForReport(_kind: ReportKind): string {
  return env.reportEmailTo;
}

function transporter() {
  const { host, port, secure, user, pass, from } = env.smtp;
  if (!host || !user || !pass || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ReportEmailConfigError();
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

function messageText(row: ReportRow, target: string, risk: RiskContext | null, hasAttachment: boolean): string {
  const location = [
    `Kec. ${row.kecamatan}`,
    row.kelurahan && `Kel. ${row.kelurahan}`,
    row.rt_rw && `RT/RW ${row.rt_rw}`,
    row.landmark && `Patokan: ${row.landmark}`,
  ].filter(Boolean).join(", ");

  return [
    "Yth. Pengelola PRAKIRA,",
    "",
    `Ada laporan lingkungan yang sudah diverifikasi di PRAKIRA dan perlu ditindaklanjuti ke ${target}. Email ini hanya dikirim ke inbox pengelola; laporan belum otomatis disampaikan ke instansi tujuan.`,
    "",
    `Kode laporan: ${row.id}`,
    `Jenis: ${KIND_LABEL[row.kind]}`,
    `Lokasi: ${location}`,
    `Tanggal kejadian: ${row.occurred_at}`,
    `Keterangan warga: ${row.description}`,
    risk ? `Konteks kesehatan: risiko ${risk.disease} ${risk.riskClass} di Kec. ${row.kecamatan} untuk ${risk.month}.` : "",
    row.forward_pattern ? `Laporan serupa dalam 14 hari: ${row.forward_pattern}` : "",
    hasAttachment ? "Foto laporan terlampir." : "",
    "",
    "Mohon pengelola meneruskan laporan ini melalui kanal resmi instansi tujuan bila tindak lanjut lapangan diperlukan.",
    "",
    "Pengelola PRAKIRA",
  ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n").trim();
}

/**
 * Kirim ringkasan ke inbox pengelola. Laporan tetap `perlu_diteruskan` sampai
 * pengelola mencatat penerusannya ke instansi lewat `recordForwarding`.
 */
export async function sendReportEmail(
  id: string,
  actor: string,
  role: string,
): Promise<{ row: ReportRow; recipient: string; messageId: string } | null> {
  const preview = await findReport(id);
  if (!preview) return null;
  const risk = (await riskContextFor([preview])).get(riskKey(preview)) ?? null;
  const mailer = transporter();
  const result = await transaction(async (tx) => {
    const row = await tx.one<ReportRow>(
      `SELECT ${REPORT_COLUMNS} FROM laporan_warga WHERE id = ? FOR UPDATE`,
      id,
    );
    if (!row) return null;
    if (REPORT_FAMILY[row.kind] !== "lingkungan" ||
        (row.handling_mode !== "dlh" && row.forward_state === null) ||
        row.status !== "terverifikasi") {
      throw new ForwardStateError("Hanya laporan lingkungan terverifikasi yang siap diteruskan dapat dikirim.");
    }
    if (row.forward_state === "diteruskan") {
      throw new ForwardStateError("Laporan ini sudah diteruskan.");
    }
    if (isSimulated(row)) {
      throw new ForwardStateError("Laporan simulasi tidak dikirim lewat email.");
    }

    const target = agencyFor(row.kind).name;
    const recipient = recipientForReport(row.kind);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      throw new ReportEmailConfigError("Alamat email penerima belum valid.");
    }
    const photo = row.has_photo
      ? await tx.one<{ photo: string | null }>("SELECT photo FROM laporan_warga WHERE id = ?", id)
      : null;
    const photoMatch = photo?.photo?.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/s);
    const attachments = photoMatch
      ? [{
          filename: `bukti-${row.id}.${photoMatch[1] === "jpeg" ? "jpg" : photoMatch[1]}`,
          content: Buffer.from(photoMatch[2], "base64"),
          contentType: `image/${photoMatch[1]}`,
        }]
      : [];

    let messageId: string;
    try {
      const info = await mailer.sendMail({
        from: env.smtp.from,
        to: recipient,
        subject: `[PRAKIRA] Laporan ${KIND_LABEL[row.kind]} untuk tindak lanjut - ${row.id}`,
        text: messageText(row, target, risk, attachments.length > 0),
        attachments,
      });
      if (!info.accepted.some((address) => address.toLowerCase() === recipient.toLowerCase())) {
        throw new Error("Penerima tidak diterima server SMTP.");
      }
      messageId = info.messageId;
    } catch (error) {
      console.error(`[report-email] Pengiriman ${row.id} gagal:`, error instanceof Error ? error.message : String(error));
      const note = "Email ke inbox pengelola belum terkonfirmasi. Petugas dapat mencoba lagi.";
      await tx.run(
        `UPDATE laporan_warga SET forward_state = 'gagal', forward_channel = 'Email internal',
          forward_note = ?, forward_reference = NULL, forwarded_at = NULL, forwarded_by = NULL
          WHERE id = ?`,
        note,
        id,
      );
      await tx.run(
        "INSERT INTO audit_log (ts, actor, role, action, details, status) VALUES (?, ?, ?, ?, ?, ?)",
        new Date().toISOString(), actor, role, `Email laporan ${id}`,
        `Email internal untuk laporan tujuan ${target} (${recipient}) belum terkonfirmasi.`, "warning",
      );
      return { failed: true as const };
    }

    const now = new Date().toISOString();
    await tx.run(
      `UPDATE laporan_warga SET forward_state = 'perlu_diteruskan',
        forward_channel = 'Email internal', forward_reference = ?, forward_note = NULL
        WHERE id = ?`,
      messageId, id,
    );
    await tx.run(
      "INSERT INTO audit_log (ts, actor, role, action, details, status) VALUES (?, ?, ?, ?, ?, ?)",
      now, actor, role, `Email laporan ${id}`,
      `Server SMTP menerima email internal (${recipient}); instansi tindak lanjut yang disarankan: ${target}; Message-ID ${messageId}.`, "success",
    );
    const updated = await tx.one<ReportRow>(
      `SELECT ${REPORT_COLUMNS} FROM laporan_warga WHERE id = ?`, id,
    );
    return { row: updated!, recipient, messageId };
  });
  if (result && "failed" in result) throw new ReportEmailDeliveryError();
  return result;
}
