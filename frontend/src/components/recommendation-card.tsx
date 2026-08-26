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
  Layers,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionRecommendation } from "@/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface RecommendationCardProps {
  recommendation: ActionRecommendation;
  onOpenDispatch?: (recommendation: ActionRecommendation) => void;
  className?: string;
}

export function RecommendationCard({
  recommendation,
  onOpenDispatch,
  className,
}: RecommendationCardProps) {
  const isHighPriority = recommendation.priority === "high";
  const isCompleted = recommendation.status === "completed";
  const isInProgress = recommendation.status === "in_progress";

  const getActionIcon = () => {
    switch (recommendation.action_type) {
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

  const getActionTypeLabel = () => {
    switch (recommendation.action_type) {
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
    <div
      className={cn(
        "group relative flex flex-col justify-between gap-3.5 rounded-2xl p-5 border bg-paper-0 shadow-card transition-all duration-base hover:-translate-y-0.5 hover:shadow-lift",
        isHighPriority
          ? "border-risk-high-br/90 bg-gradient-to-b from-risk-high-bg/40 via-paper-0 to-paper-0"
          : isInProgress
          ? "border-brand-300/80 bg-gradient-to-b from-brand-50/50 via-paper-0 to-paper-0"
          : "border-paper-200/90",
        className
      )}
    >
      <div className="space-y-3">
        {/* Top Bar: Disease, Category Icon, Priority & Status Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg bg-paper-100/90 px-2 py-1 border border-paper-200/70 text-2xs font-semibold text-paper-800 shadow-xs">
              {getActionIcon()}
              <span>{getActionTypeLabel()}</span>
            </div>

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
              size="sm"
            >
              {isHighPriority ? "Prioritas Tinggi" : "Prioritas Sedang"}
            </Badge>
          </div>

          <span
            className={cn(
              "font-mono text-3xs font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5 border shrink-0 transition-colors",
              isCompleted
                ? "bg-risk-low-bg text-risk-low border-risk-low-br"
                : isInProgress
                ? "bg-brand-50 text-brand-800 border-brand-300"
                : "bg-risk-high-bg text-risk-high border-risk-high-br"
            )}
          >
            {isCompleted
              ? "Terkirim"
              : isInProgress
              ? "Sedang Berjalan"
              : "Menunggu Tindakan"}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-display font-semibold text-body-sm sm:text-base text-foreground leading-snug group-hover:text-brand-700 transition-colors">
          {recommendation.title}
        </h4>

        {/* Description */}
        <p className="text-xs text-paper-600 leading-relaxed line-clamp-2">
          {recommendation.description}
        </p>

        {/* AI Explainability & Lead Time Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {recommendation.lead_time_days && (
            <span className="inline-flex items-center gap-1 rounded-md bg-paper-100 px-2 py-0.5 font-mono text-3xs font-medium text-paper-700 border border-paper-200">
              <Clock className="h-3 w-3 text-brand-700" />
              <span>Lead: {recommendation.lead_time_days} Hari</span>
            </span>
          )}

          {recommendation.ai_confidence && (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 font-mono text-3xs font-medium text-brand-800 border border-brand-200/70">
              <Sparkles className="h-3 w-3 text-brand-700" />
              <span>AI Conf: {recommendation.ai_confidence}%</span>
            </span>
          )}

          {recommendation.estimated_impact && (
            <span className="inline-flex items-center gap-1 rounded-md bg-risk-low-bg/80 px-2 py-0.5 text-3xs font-medium text-risk-low border border-risk-low-br/60 line-clamp-1 max-w-full">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{recommendation.estimated_impact}</span>
            </span>
          )}
        </div>

        {/* Target Districts */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <div className="flex items-center gap-1 text-2xs font-semibold text-paper-600">
            <MapPin className="h-3.5 w-3.5 text-brand-700 shrink-0" />
            <span>Target Wilayah:</span>
          </div>
          {recommendation.target_kecamatan.map((kec, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-paper-50 border border-paper-200/90 px-2 py-0.5 text-3xs font-semibold text-paper-800 shadow-xs hover:bg-paper-100 transition-colors"
            >
              <span>{kec}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Footer: Due date & Interactive Button */}
      <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-paper-200/70 mt-1">
        <div className="flex items-center gap-1.5 text-2xs text-paper-600 font-mono">
          <Clock className="h-3.5 w-3.5 text-paper-600" />
          <span>Tenggat: {recommendation.due_date}</span>
        </div>

        <Button
          size="sm"
          variant={isCompleted ? "outline" : isHighPriority ? "destructive" : "default"}
          onClick={() => onOpenDispatch?.(recommendation)}
          className={cn(
            "text-xs font-semibold shadow-xs gap-1.5 h-8 px-3 transition-all",
            isCompleted
              ? "bg-risk-low-bg text-risk-low border-risk-low-br hover:bg-risk-low-bg/90"
              : isHighPriority
              ? "bg-risk-high hover:bg-risk-high/90 text-white"
              : "bg-brand-700 hover:bg-brand-600 text-white"
          )}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-risk-low" />
              <span className="text-risk-low">Instruksi Terkirim</span>
            </>
          ) : isInProgress ? (
            <>
              <span className="text-white">Instruksikan Tim</span>
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </>
          ) : (
            <>
              <span className="text-white">Instruksikan Tim</span>
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
