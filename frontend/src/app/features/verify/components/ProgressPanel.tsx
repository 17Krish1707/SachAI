import React from "react";
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react";

export type ProgressStage =
  | "receiving_input"
  | "extracting_text"
  | "identifying_claims"
  | "finding_sources"
  | "comparing_evidence"
  | "preparing_report"
  | "completed"
  | "error";

interface ProgressPanelProps {
  currentStage: ProgressStage;
  error?: string | null;
  onRetry?: () => void;
  inputType?: string;
  extractedClaimsPreview?: string[];
}

interface StageStep {
  id: ProgressStage;
  label: string;
  detail: string;
}

const STAGES: StageStep[] = [
  {
    id: "receiving_input",
    label: "Receiving Input",
    detail: "Validating submission format, payload integrity & size constraints",
  },
  {
    id: "extracting_text",
    label: "Extracting Content",
    detail: "Processing raw text, document OCR, speech-to-text, or secure URL scraping",
  },
  {
    id: "identifying_claims",
    label: "Isolating Factual Claims",
    detail: "Gemini filtering out noise, opinions & extracting testable factual assertions",
  },
  {
    id: "finding_sources",
    label: "Retrieving Live Evidence",
    detail: "Querying Tavily search index for official notices, fact-checks & verified reporting",
  },
  {
    id: "comparing_evidence",
    label: "Synthesizing Evidence",
    detail: "Comparing claims against primary sources to detect hoaxes, partial truths or stale dates",
  },
  {
    id: "preparing_report",
    label: "Finalizing Report",
    detail: "Structuring JSON verdicts, explanations, counter-messages and source citations",
  },
];

export default function ProgressPanel({
  currentStage,
  error,
  onRetry,
  inputType = "text",
  extractedClaimsPreview = [],
}: ProgressPanelProps) {
  const getStageIndex = (stage: ProgressStage): number => {
    switch (stage) {
      case "receiving_input":
        return 0;
      case "extracting_text":
        return 1;
      case "identifying_claims":
        return 2;
      case "finding_sources":
        return 3;
      case "comparing_evidence":
        return 4;
      case "preparing_report":
        return 5;
      case "completed":
        return 6;
      case "error":
        return -1;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl border border-[#E6E2D8] p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between pb-6 border-b border-stone-100 mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#0F382E] flex items-center gap-2">
            {currentStage === "error" ? (
              <>
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>Verification Interrupted</span>
              </>
            ) : currentStage === "completed" ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Verification Completed</span>
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                <span>Active Fact-Checking Pipeline</span>
              </>
            )}
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Real-time multimodal verification pipeline for {inputType}
          </p>
        </div>

        {currentStage === "error" && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Try Again</span>
          </button>
        )}
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 text-sm space-y-3">
          <div className="font-semibold flex items-center gap-2">
            <AlertCircle size={18} />
            <span>Verification Encountered an Issue</span>
          </div>
          <p className="text-rose-700 leading-relaxed text-xs sm:text-sm">{error}</p>
          {onRetry && (
            <div className="pt-2">
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Modify Input & Retry
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STAGES.map((stage, idx) => {
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              const isPending = currentIndex < idx;

              return (
                <div
                  key={stage.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/40 shadow-xs"
                      : isPast
                      ? "bg-stone-50/50 border-stone-200"
                      : "bg-white border-stone-100 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isPast ? (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      ) : isCurrent ? (
                        <Loader2 size={18} className="text-emerald-700 animate-spin" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-stone-300 flex items-center justify-center text-[10px] text-stone-400 font-medium">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4
                        className={`text-xs sm:text-sm font-semibold ${
                          isCurrent
                            ? "text-[#0F382E]"
                            : isPast
                            ? "text-stone-700"
                            : "text-stone-400"
                        }`}
                      >
                        {stage.label}
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                        {stage.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Extracted claims preview if available during pipeline execution */}
          {extractedClaimsPreview.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-2">
                Identified Checkable Claims ({extractedClaimsPreview.length})
              </span>
              <ul className="space-y-1.5">
                {extractedClaimsPreview.map((c, i) => (
                  <li key={i} className="text-xs text-stone-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span className="italic">"{c}"</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
