"use client";

import * as React from "react";
import {
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Flame,
  ShieldAlert,
  Droplets,
  Package,
  Radio,
  Wind,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionRecommendation } from "@/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface EarlyActionDeckProps {
  recommendations: ActionRecommendation[];
  onOpenDispatch: (recommendation: ActionRecommendation) => void;
  className?: string;
}

export function EarlyActionDeck({
  recommendations,
  onOpenDispatch,
  className,
}: EarlyActionDeckProps) {
  const [activeId, setActiveId] = React.useState<string>(
    recommendations[0]?.id || ""
  );

  // Update activeId if recommendations change and current activeId is not in list
  React.useEffect(() => {
    if (recommendations.length > 0 && !recommendations.find((r) => r.id === activeId)) {
      setActiveId(recommendations[0].id);
    }
  }, [recommendations, activeId]);

  if (recommendations.length === 0) return null;

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "fogging":
        return <Flame className="h-4 w-4 text-risk-high" />;
      case "masker":
        return <Wind className="h-4 w-4 text-cat-3" />;
      case "klorinasi":
        return <Droplets className="h-4 w-4 text-brand-600" />;
      case "logistik_obat":
        return <Package className="h-4 w-4 text-risk-medium" />;
      case "penyuluhan":
        return <Radio className="h-4 w-4 text-risk-low" />;
      default:
        return <Sparkles className="h-4 w-4 text-brand-700" />;
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case "fogging":
        return "Fogging & PSN";
      case "masker":
        return "Sanitasi Udara";
      case "klorinasi":
        return "Klorinasi Air";
      case "logistik_obat":
        return "Buffer Stock";
      case "penyuluhan":
        return "Broadcast Edukasi";
      default:
        return "Intervensi";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Horizontal accordion: one card expanded, the rest as clickable peeks. */}
      <div className="flex flex-col lg:flex-row gap-2.5 min-h-[360px] lg:h-[370px] overflow-hidden">
          {recommendations.map((rec) => {
            const isActive = rec.id === activeId;
            const isHigh = rec.priority === "high";
            const isDone = rec.status === "completed";
            const isRunning = rec.status === "in_progress";

            return (
              <div
                key={rec.id}
                onClick={() => setActiveId(rec.id)}
                className={cn(
                  "relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between select-none",
                  isActive
                    ? "lg:flex-[3.8] p-5 sm:p-6 bg-paper-0 shadow-card ring-1 ring-brand-700/20"
                    : "lg:flex-[0.9] p-4 bg-paper-50/80 hover:bg-paper-100/70 border-paper-200 shadow-xs opacity-85 hover:opacity-100",
                  isHigh && isActive
                    ? "border-risk-high-br/90 bg-gradient-to-br from-risk-high-bg/30 via-paper-0 to-paper-0"
                    : isRunning && isActive
                    ? "border-brand-300/80 bg-gradient-to-br from-brand-50/40 via-paper-0 to-paper-0"
                    : "border-paper-200"
                )}
              >
                {/* ── EXPANDED CARD VIEW (When Active) ── */}
                {isActive ? (
                  <div className="h-full flex flex-col justify-between gap-3.5 animate-fade-in">
                    {/* Header: Action Category, Disease, Priority, Due Date */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-paper-200/80">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 rounded-lg bg-paper-100 px-2.5 py-1 border border-paper-200 text-xs font-semibold text-paper-900 shadow-xs">
                            {getActionIcon(rec.action_type)}
                            <span>{getActionTypeLabel(rec.action_type)}</span>
                          </div>

                          <Badge
                            variant={
                              rec.disease === "DBD"
                                ? "disease-dbd"
                                : rec.disease === "ISPA"
                                ? "disease-ispa"
                                : "disease-diare"
                            }
                            size="sm"
                          >
                            {rec.disease}
                          </Badge>

                          <Badge
                            variant={isHigh ? "risk-high" : "risk-medium"}
                            size="sm"
                          >
                            {isHigh ? "Prioritas Tinggi" : "Prioritas Sedang"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-mono text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5 border",
                              isDone
                                ? "bg-risk-low-bg text-risk-low border-risk-low-br"
                                : isRunning
                                ? "bg-brand-50 text-brand-800 border-brand-300"
                                : "bg-risk-high-bg text-risk-high border-risk-high-br"
                            )}
                          >
                            {isDone
                              ? "Terkirim"
                              : isRunning
                              ? "Sedang Berjalan"
                              : "Menunggu Tindakan"}
                          </span>

                          <span className="text-[11px] font-mono text-paper-500 hidden sm:inline-block">
                            #{rec.id}
                          </span>
                        </div>
                      </div>

                      {/* Main Title (Punchy, Clean, No Wall of Text) */}
                      <h4 className="font-display font-semibold text-lg sm:text-xl text-foreground mt-3 leading-snug">
                        {rec.title}
                      </h4>
                    </div>

                    {/* Interactive Metrics Grid (Zero Fluff, High Impact) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-1">
                      <div className="bg-paper-50 rounded-xl p-2.5 border border-paper-200 shadow-xs flex flex-col justify-between">
                        <span className="font-mono text-[10px] text-paper-500 uppercase flex items-center gap-1">
                          <Clock className="h-3 w-3 text-brand-700" />
                          <span>Lead Time</span>
                        </span>
                        <div className="font-display font-semibold text-sm text-foreground mt-1">
                          {rec.lead_time_days || 14} Hari
                        </div>
                      </div>

                      <div className="bg-paper-50 rounded-xl p-2.5 border border-paper-200 shadow-xs flex flex-col justify-between">
                        <span className="font-mono text-[10px] text-paper-500 uppercase flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-brand-700" />
                          <span>Akurasi AI</span>
                        </span>
                        <div className="font-display font-semibold text-sm text-brand-700 mt-1">
                          {rec.ai_confidence || 94.2}%
                        </div>
                      </div>

                      <div className="bg-paper-50 rounded-xl p-2.5 border border-paper-200 shadow-xs flex flex-col justify-between">
                        <span className="font-mono text-[10px] text-paper-500 uppercase flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3 text-risk-low" />
                          <span>Pencegahan</span>
                        </span>
                        <div className="font-display font-semibold text-xs text-risk-low mt-1 truncate">
                          {rec.estimated_impact?.split("&")[0] || "~45 Kasus"}
                        </div>
                      </div>

                      <div className="bg-paper-50 rounded-xl p-2.5 border border-paper-200 shadow-xs flex flex-col justify-between">
                        <span className="font-mono text-[10px] text-paper-500 uppercase flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-brand-700" />
                          <span>Populasi</span>
                        </span>
                        <div className="font-display font-semibold text-sm text-foreground mt-1 truncate">
                          {rec.target_population?.split(" ")[0] || "120k"} Jiwa
                        </div>
                      </div>
                    </div>

                    {/* Interactive Target Kecamatan Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-paper-600 font-mono uppercase tracking-wider">
                        Wilayah:
                      </span>
                      {rec.target_kecamatan.map((kec, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-lg bg-paper-100 hover:bg-brand-50 hover:text-brand-800 border border-paper-200 px-2.5 py-1 text-xs font-semibold text-paper-800 shadow-xs transition-colors"
                        >
                          <MapPin className="h-3 w-3 text-brand-700" />
                          <span>{kec}</span>
                        </span>
                      ))}

                      {rec.climate_trigger && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 border border-brand-200/80 px-2 py-0.5 text-[11px] font-medium text-brand-800 ml-auto hidden md:inline-flex">
                          <Droplets className="h-3 w-3 text-brand-700" />
                          <span className="truncate max-w-[240px]">
                            {rec.climate_trigger.split("+")[0]}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Footer: Due date + Primary Action Button */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-paper-200/80">
                      <div className="flex items-center gap-1.5 text-xs text-paper-500 font-mono">
                        <Clock className="h-3.5 w-3.5 text-paper-400" />
                        <span>Tenggat: {rec.due_date}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={isDone ? "outline" : isHigh ? "destructive" : "default"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDispatch(rec);
                          }}
                          className={cn(
                            "text-xs font-semibold shadow-xs gap-1.5 h-8 px-4 transition-all",
                            isDone
                              ? "bg-risk-low-bg text-risk-low border-risk-low-br hover:bg-risk-low-bg/90"
                              : isHigh
                              ? "bg-risk-high hover:bg-risk-high/90 text-white"
                              : "bg-brand-700 hover:bg-brand-600 text-white"
                          )}
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-risk-low" />
                              <span>Instruksi Terkirim</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5 text-white" />
                              <span>Instruksikan Tim</span>
                              <ArrowRight className="h-3.5 w-3.5 text-white" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── COLLAPSED / PEEK CARD VIEW ── */
                  <div className="h-full flex flex-row lg:flex-col justify-between items-center lg:items-start gap-2 p-1">
                    {/* Collapsed Header */}
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-paper-100 border border-paper-200 flex items-center justify-center shrink-0">
                        {getActionIcon(rec.action_type)}
                      </div>
                      <Badge
                        variant={
                          rec.disease === "DBD"
                            ? "disease-dbd"
                            : rec.disease === "ISPA"
                            ? "disease-ispa"
                            : "disease-diare"
                        }
                        size="sm"
                        className="hidden sm:inline-flex"
                      >
                        {rec.disease}
                      </Badge>
                    </div>

                    {/* Vertical / Compact Title in Collapsed Mode */}
                    <div className="flex-1 lg:my-auto">
                      <div className="font-semibold text-xs text-paper-800 line-clamp-1 lg:line-clamp-2">
                        {rec.title}
                      </div>
                      <div className="text-[10px] font-mono text-paper-500 mt-0.5 hidden lg:block">
                        {rec.target_kecamatan[0]}
                        {rec.target_kecamatan.length > 1 &&
                          ` +${rec.target_kecamatan.length - 1} kec`}
                      </div>
                    </div>

                    {/* Collapsed Footer: Status Indicator */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isDone
                            ? "bg-risk-low"
                            : isRunning
                            ? "bg-brand-500"
                            : "bg-risk-high"
                        )}
                      />
                      <span className="text-[10px] font-mono text-paper-500 uppercase">
                        {isDone ? "Selesai" : isRunning ? "Jalan" : "Tunggu"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
