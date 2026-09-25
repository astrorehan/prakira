"use client";

import { useEffect, useRef, useState } from "react";
import { getReportStreamUrl } from "@/lib/api";
import type { CitizenReport } from "@/types";

export type ReportStreamEvent = {
  type: "report:created" | "report:reviewed" | "report:forwarded";
  report: CitizenReport;
};

export type UseReportStreamOptions = {
  onReportCreated?: (report: CitizenReport) => void;
  onReportReviewed?: (report: CitizenReport) => void;
  onReportForwarded?: (report: CitizenReport) => void;
  enabled?: boolean;
};

export type UseReportStreamReturn = {
  connected: boolean;
  lastEventAt: Date | null;
  error: string | null;
};

/**
 * Hook untuk mengonsumsi aliran real-time laporan warga via SSE (Server-Sent Events).
 *
 * Mengizinkan antarmuka di Dinkes dan Puskesmas bereaksi seketika terhadap laporan
 * yang baru masuk maupun yang telah diverifikasi atau diteruskan.
 */
export function useReportStream({
  onReportCreated,
  onReportReviewed,
  onReportForwarded,
  enabled = true,
}: UseReportStreamOptions = {}): UseReportStreamReturn {
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simpan callback ke ref agar pergantian fungsi tidak memutus koneksi SSE
  const onCreatedRef = useRef(onReportCreated);
  const onReviewedRef = useRef(onReportReviewed);
  const onForwardedRef = useRef(onReportForwarded);

  useEffect(() => {
    onCreatedRef.current = onReportCreated;
    onReviewedRef.current = onReportReviewed;
    onForwardedRef.current = onReportForwarded;
  }, [onReportCreated, onReportReviewed, onReportForwarded]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("EventSource" in window)) {
      setConnected(false);
      return;
    }

    const streamUrl = getReportStreamUrl();
    let es: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isDisposed = false;

    function connect() {
      if (isDisposed) return;

      if (es) {
        es.close();
        es = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      try {
        es = new EventSource(streamUrl, { withCredentials: true });

        es.addEventListener("open", () => {
          if (isDisposed) return;
          setConnected(true);
          setError(null);
        });

        es.addEventListener("connected", () => {
          if (isDisposed) return;
          setConnected(true);
          setError(null);
        });

        es.addEventListener("report:created", (event) => {
          if (isDisposed) return;
          try {
            const data = JSON.parse(event.data) as CitizenReport;
            setLastEventAt(new Date());
            onCreatedRef.current?.(data);
          } catch (e) {
            console.warn("[real-time] Gagal mengurai data report:created:", e);
          }
        });

        es.addEventListener("report:reviewed", (event) => {
          if (isDisposed) return;
          try {
            const data = JSON.parse(event.data) as CitizenReport;
            setLastEventAt(new Date());
            onReviewedRef.current?.(data);
          } catch (e) {
            console.warn("[real-time] Gagal mengurai data report:reviewed:", e);
          }
        });

        es.addEventListener("report:forwarded", (event) => {
          if (isDisposed) return;
          try {
            const data = JSON.parse(event.data) as CitizenReport;
            setLastEventAt(new Date());
            onForwardedRef.current?.(data);
          } catch (e) {
            console.warn("[real-time] Gagal mengurai data report:forwarded:", e);
          }
        });

        es.onerror = () => {
          if (isDisposed) return;
          setConnected(false);
          setError("Koneksi real-time terputus. Mencoba menghubungkan kembali…");
          if (es) {
            es.close();
            es = null;
          }
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, 3000);
        };
      } catch (err) {
        if (!isDisposed) {
          setConnected(false);
          setError("Gagal menginisialisasi EventSource.");
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) {
        es.close();
        es = null;
      }
      setConnected(false);
    };
  }, [enabled]);

  return { connected, lastEventAt, error };
}
