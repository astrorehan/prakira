/**
 * Bus event real-time laporan warga.
 *
 * Menggunakan EventEmitter bawaan Node.js untuk menyebarkan kejadian laporan
 * (masuk, diverifikasi, diteruskan) ke klien SSE (Server-Sent Events)
 * di konsol Dinkes dan Puskesmas secara real-time.
 */
import { EventEmitter } from "node:events";
import type { ReportRow } from "./reports.js";

export type ReportEvent =
  | { type: "report:created"; report: ReportRow }
  | { type: "report:reviewed"; report: ReportRow }
  | { type: "report:forwarded"; report: ReportRow };

class ReportEventBus extends EventEmitter {
  constructor() {
    super();
    // Mendukung banyak koneksi SSE simultan tanpa peringatan MaxListenersExceeded
    this.setMaxListeners(250);
  }

  emitReportCreated(report: ReportRow): void {
    this.emit("report:created", report);
  }

  emitReportReviewed(report: ReportRow): void {
    this.emit("report:reviewed", report);
  }

  emitReportForwarded(report: ReportRow): void {
    this.emit("report:forwarded", report);
  }
}

export const reportEvents = new ReportEventBus();
