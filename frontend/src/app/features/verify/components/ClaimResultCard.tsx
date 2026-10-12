import React, { useState } from "react";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Share2,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import { ClaimResult, EvidenceSource, api } from "../../../core/api";
import VerdictBadge, { VERDICT_CONFIG } from "../../../shared/components/ui/VerdictBadge";

interface ClaimResultCardProps {
  claim: ClaimResult;
  resultId: string;
  index: number;
}

export default function ClaimResultCard({
  claim,
  resultId,
  index,
}: ClaimResultCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [copiedCounter, setCopiedCounter] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const normVerdict = claim.verdict || "CANNOT_CONFIRM";
  const config = VERDICT_CONFIG[normVerdict] || VERDICT_CONFIG.CANNOT_CONFIRM;

  const handleCopyCounter = async () => {
    if (claim.counter_message) {
      await navigator.clipboard.writeText(claim.counter_message);
      setCopiedCounter(true);
      setTimeout(() => setCopiedCounter(false), 2000);
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    setFeedbackGiven(helpful);
    try {
      await api.submitFeedback({
        result_id: resultId,
        claim_id: claim.id,
        helpful,
      });
    } catch {
      // Local graceful fallback
    }
  };

  return (
    <div
      className={`rounded-3xl border bg-white shadow-xs overflow-hidden transition-all ${
        normVerdict === "FALSE"
          ? "border-rose-200"
          : normVerdict === "VERIFIED"
          ? "border-emerald-200"
          : normVerdict === "PARTIALLY_SUPPORTED"
          ? "border-amber-200"
          : normVerdict === "OUTDATED"
          ? "border-indigo-200"
          : "border-stone-200"
      }`}
    >
      {/* Header Bar with Claim Number & Verdict Badge */}
      <div className="p-6 sm:p-7 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4 bg-stone-50/50">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs uppercase font-bold tracking-wider text-stone-500">
            {claim.category || "Factual Statement"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <VerdictBadge verdict={claim.verdict} size="lg" />
        </div>
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        {/* The Evaluated Claim */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[#0F382E] leading-snug">
            "{claim.claim_text}"
          </h3>

          {claim.original_quote && (
            <div className="mt-2 text-xs text-stone-500 italic bg-stone-50 p-3 rounded-xl border border-stone-100">
              <span className="font-semibold not-italic text-stone-600">Excerpt from forward: </span>
              "{claim.original_quote}"
            </div>
          )}
        </div>

        {/* Outdated Context Warning Banner */}
        {claim.outdated_warning && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="text-indigo-600 mt-0.5 shrink-0" size={18} />
            <div>
              <span className="font-bold block">Temporal Context Notice:</span>
              <p className="mt-0.5 text-indigo-800 leading-relaxed">
                {claim.outdated_warning}
              </p>
            </div>
          </div>
        )}

        {/* Plain Language Explanation & Specific Reason */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              Verified Finding
            </h4>
            <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-normal">
              {claim.explanation}
            </p>
          </div>

          {claim.explanation_regional && (
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-sm text-[#0F382E] leading-relaxed">
              <span className="text-xs font-bold block text-emerald-800 mb-1">
                Regional Explanation:
              </span>
              {claim.explanation_regional}
            </div>
          )}

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
            <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
              Primary Evidence Basis
            </h5>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              {claim.reason_for_verdict}
            </p>
          </div>
        </div>

        {/* Suggested WhatsApp Counter Rebuttal Message */}
        {claim.counter_message && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                <Share2 size={14} />
                <span>Suggested WhatsApp Counter Message</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCounter}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-300 text-amber-900 transition-colors"
              >
                {copiedCounter ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedCounter ? "Copied!" : "Copy Rebuttal"}</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-amber-950 font-mono bg-white/70 p-3 rounded-xl border border-amber-200/60 leading-relaxed whitespace-pre-wrap">
              {claim.counter_message}
            </p>
          </div>
        )}

        {/* Confidence & Caveats */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-700">Evidence Assessment:</span>
            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-medium">
              {claim.confidence_assessment}
            </span>
          </div>

          {claim.uncertainty_caveats && (
            <div className="flex items-center gap-1 text-stone-500 text-xs italic">
              <HelpCircle size={13} />
              <span>{claim.uncertainty_caveats}</span>
            </div>
          )}
        </div>

        {/* Sources Accordion Toggle */}
        {claim.sources && claim.sources.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200 text-xs sm:text-sm font-semibold text-stone-700 transition-colors"
            >
              <span>
                Retrieved Live Sources & Citations ({claim.sources.length})
              </span>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expanded && (
              <div className="mt-3 space-y-3 animate-in fade-in">
                {claim.sources.map((src, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-stone-200 hover:border-emerald-300 transition-colors bg-white text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#0F382E] hover:underline flex items-center gap-1 text-xs sm:text-sm"
                      >
                        <span>{src.title || src.domain}</span>
                        <ExternalLink size={13} className="shrink-0 text-stone-400" />
                      </a>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600 shrink-0">
                        {src.credibility_tier || src.domain}
                      </span>
                    </div>

                    <p className="text-stone-600 text-[11px] sm:text-xs leading-relaxed">
                      "{src.snippet}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                      <span className="font-mono">{src.domain}</span>
                      {src.published_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          <span>{src.published_date}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Feedback Widget */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>Was this fact-check assessment accurate?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFeedback(true)}
              disabled={feedbackGiven !== null}
              className={`p-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                feedbackGiven === true
                  ? "bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold"
                  : "hover:bg-stone-100 border-stone-200 text-stone-600"
              }`}
            >
              <ThumbsUp size={13} />
              <span>Yes</span>
            </button>
            <button
              onClick={() => handleFeedback(false)}
              disabled={feedbackGiven !== null}
              className={`p-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                feedbackGiven === false
                  ? "bg-rose-100 border-rose-300 text-rose-800 font-semibold"
                  : "hover:bg-stone-100 border-stone-200 text-stone-600"
              }`}
            >
              <ThumbsDown size={13} />
              <span>No</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
