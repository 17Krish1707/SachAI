import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Clock, HelpCircle } from "lucide-react";
import { VerdictType } from "../../../core/api";

interface VerdictBadgeProps {
  verdict: VerdictType | string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export const VERDICT_CONFIG: Record<
  VerdictType,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dotBg: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    description: string;
  }
> = {
  VERIFIED: {
    label: "Verified True",
    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dotBg: "bg-emerald-500",
    icon: CheckCircle2,
    description: "Confirmed by official sources and reliable investigations.",
  },
  FALSE: {
    label: "False Claim",
    bg: "bg-rose-50 text-rose-800 border-rose-200",
    text: "text-rose-800",
    border: "border-rose-200",
    dotBg: "bg-rose-500",
    icon: XCircle,
    description: "Debunked or contradicted by credible reporting.",
  },
  PARTIALLY_SUPPORTED: {
    label: "Partially Supported",
    bg: "bg-amber-50 text-amber-800 border-amber-200",
    text: "text-amber-800",
    border: "border-amber-200",
    dotBg: "bg-amber-500",
    icon: AlertTriangle,
    description: "Contains factual elements but draws misleading or exaggerated conclusions.",
  },
  OUTDATED: {
    label: "Outdated Context",
    bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
    text: "text-indigo-800",
    border: "border-indigo-200",
    dotBg: "bg-indigo-500",
    icon: Clock,
    description: "Past event or expired circular recirculated as current news.",
  },
  CANNOT_CONFIRM: {
    label: "Cannot Confirm",
    bg: "bg-stone-100 text-stone-700 border-stone-300",
    text: "text-stone-700",
    border: "border-stone-300",
    dotBg: "bg-stone-400",
    icon: HelpCircle,
    description: "Insufficient public evidence or inconclusive sources.",
  },
};

export default function VerdictBadge({
  verdict,
  size = "md",
  showIcon = true,
}: VerdictBadgeProps) {
  const normVerdict = (verdict?.toUpperCase() || "CANNOT_CONFIRM") as VerdictType;
  const config = VERDICT_CONFIG[normVerdict] || VERDICT_CONFIG.CANNOT_CONFIRM;
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-xs sm:text-sm font-medium gap-1.5",
    lg: "px-4 py-1.5 text-sm sm:text-base font-semibold gap-2",
  };

  const iconSizes = {
    sm: 12,
    md: 15,
    lg: 18,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs transition-colors ${config.bg} ${sizeClasses[size]}`}
    >
      {showIcon && <IconComponent size={iconSizes[size]} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}
