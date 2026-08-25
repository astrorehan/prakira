"use client";

import * as React from "react";
import { AlertOctagon, CheckCircle2, Clock, MapPin, ShieldAlert, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionRecommendation } from "@/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { LiquidGlassCard } from "./ui/liquid-glass-card";

interface RecommendationCardProps {
  recommendation: ActionRecommendation;
  onExecute?: (id: string) => void;
  className?: string;
}

export function RecommendationCard({
  recommendation,
  onExecute,
  className,
}: RecommendationCardProps) {
  const [executed, setExecuted] = React.useState(recommendation.status === "completed");
  const isHighPriority = recommendation.priority === "high";

  const handleAction = () => {
    setExecuted(true);
    if (onExecute) {
      onExecute(recommendation.id);
    } else {
      alert(`Instruksi tindakan #${recommendation.id} berhasil dikirimkan ke puskesmas wilayah terkait!`);
    }
  };

  return (
    <LiquidGlassCard
      variant={isHighPriority ? "risk-high" : "blue"}
      elevation="sm"
      interactive
      className={cn("p-5 flex flex-col justify-between gap-3 animate-fade-in-up", className)}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                recommendation.disease === "DBD"
                  ? "disease-dbd"
                  : recommendation.disease === "ISPA"
                  ? "disease-ispa"
                  : "disease-diare"
              }
              size="sm"
            >
              {recommendation.disease}
            </Badge>

            <Badge
              variant={isHighPriority ? "risk-high" : "risk-medium"}
              pulse={isHighPriority}
              size="sm"
            >
              {isHighPriority ? "Prioritas Tinggi" : "Prioritas Sedang"}
            </Badge>
          </div>

          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5",
              executed || recommendation.status === "completed"
                ? "bg-risk-low-bg text-risk-low border border-risk-low-br/60"
                : recommendation.status === "in_progress"
                ? "bg-brand-100 text-brand-800 border border-brand-300/60"
                : "bg-risk-medium-bg text-risk-medium border border-risk-medium-br/60",
            )}
          >
            {executed || recommendation.status === "completed"
              ? "Terkirim"
              : recommendation.status === "in_progress"
              ? "Sedang Berjalan"
              : "Menunggu Tindakan"}
          </span>
        </div>

        <h4 className="font-display font-semibold text-base text-foreground mt-2.5 leading-snug">
          {recommendation.title}
        </h4>

        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {recommendation.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-semibold text-paper-700">Target Wilayah:</span>
          {recommendation.target_kecamatan.map((kec, i) => (
            <span
              key={i}
              className="rounded-md bg-white/90 border border-paper-200/80 px-2 py-0.5 text-[10px] font-medium text-paper-800 shadow-xs"
            >
              {kec}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-paper-200/60 mt-1">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-paper-400" />
          <span>Tenggat: {recommendation.due_date}</span>
        </div>

        <Button
          size="sm"
          variant={isHighPriority ? "destructive" : "default"}
          onClick={handleAction}
          className="text-xs text-white font-semibold shadow-xs"
        >
          {executed ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-white" />
              <span className="text-white">Instruksi Terkirim</span>
            </>
          ) : (
            <>
              <span className="text-white">Instruksikan Tim</span>
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </>
          )}
        </Button>
      </div>
    </LiquidGlassCard>
  );
}
