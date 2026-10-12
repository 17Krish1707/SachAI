import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Share2,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { VerificationResponse, api } from "../../core/api";
import { historyStore } from "../../core/historyStore";
import { downloadFactCardPng } from "../../core/cardGenerator";
import ClaimResultCard from "./components/ClaimResultCard";
import VerdictBadge from "../../shared/components/ui/VerdictBadge";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    // 1. First check local history store for instant rendering
    const localEntry = historyStore.getHistoryItem(id);
    if (localEntry) {
      setReport(localEntry.fullResult);
      setLoading(false);
      return;
    }

    // 2. Fetch from backend
    api
      .getResult(id)
      .then((data) => {
        setReport(data);
        historyStore.saveToHistory(data);
      })
      .catch((err) => {
        setError(err.message || "Could not retrieve verification report.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleCopySummary = async () => {
    if (!report) return;
    let textToCopy = `*SachAI Fact-Check Report*\n\n${report.overall_summary}\n\n`;
    report.claims.forEach((c, idx) => {
      textToCopy += `${idx + 1}. Claim: "${c.claim_text}"\nVerdict: ${c.verdict_display}\nExplanation: ${c.explanation}\n\n`;
    });
    textToCopy += `Verified via SachAI (https://sachai.vercel.app/result/${report.id})`;

    await navigator.clipboard.writeText(textToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWebShare = async () => {
    if (!report) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SachAI Fact Check Report",
          text: report.overall_summary,
          url: window.location.href,
        });
      } catch {
        // Fallback to clipboard
        handleCopySummary();
      }
    } else {
      handleCopySummary();
    }
  };

  const handleDownloadCard = async () => {
    if (!report) return;
    setDownloadingCard(true);
    try {
      await downloadFactCardPng(report);
    } finally {
      setDownloadingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-stone-800">Loading Fact-Check Report...</h3>
        <p className="text-xs text-stone-500 mt-1">Fetching verified claims & live evidence</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Report Not Found</h2>
        <p className="text-sm text-stone-600 mb-6 leading-relaxed">
          {error || "The requested verification report could not be found or has expired."}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F382E] text-white text-sm font-semibold hover:bg-[#164E3F] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Verify a New Claim</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-[#0F382E] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Verify Workspace</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleWebShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
          >
            {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
            <span>{copiedLink ? "Report Copied" : "Share"}</span>
          </button>

          <button
            onClick={handleDownloadCard}
            disabled={downloadingCard}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F382E] hover:bg-[#164E3F] text-white text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
          >
            <Download size={14} />
            <span>{downloadingCard ? "Generating..." : "Download Fact Card"}</span>
          </button>
        </div>
      </div>

      {/* Main Report Header Summary Card */}
      <div className="rounded-3xl bg-white border border-[#E7E2D6] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-mono uppercase font-semibold text-stone-700">
              ID: {report.id}
            </span>
            <span>•</span>
            <span className="capitalize">{report.input_type} Input</span>
            <span>•</span>
            <span>{report.detected_language}</span>
          </div>

          <div className="flex items-center gap-1.5 text-stone-400">
            <Clock size={13} />
            <span>{new Date(report.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-emerald-700" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F382E] tracking-tight">
              Verification Assessment
            </h1>
          </div>

          <p className="text-base sm:text-lg text-stone-800 font-medium leading-relaxed mt-2">
            {report.overall_summary}
          </p>

          {/* Verdict Distribution Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-5">
            {Object.entries(report.verdict_distribution || {}).map(([verdict, count]) => (
              <div
                key={verdict}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 border border-stone-200 text-stone-700"
              >
                <span>{count}</span>
                <span className="capitalize">{verdict.toLowerCase().replace("_", " ")}</span>
              </div>
            ))}
          </div>

          {/* Raw Text Accordion Toggle */}
          <div className="mt-6 pt-4 border-t border-stone-100">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="text-xs text-stone-500 hover:text-stone-800 font-semibold inline-flex items-center gap-1.5"
            >
              <FileText size={13} />
              <span>{showRawText ? "Hide Analyzed Submission Text" : "View Analyzed Submission Text"}</span>
            </button>

            {showRawText && (
              <div className="mt-3 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {report.extracted_text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Individual Claims Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0F382E]">
            Independently Analyzed Claims ({report.claims.length})
          </h2>
          <span className="text-xs text-stone-500">
            Each claim evaluated separately against live evidence
          </span>
        </div>

        {report.claims.map((claim, idx) => (
          <ClaimResultCard
            key={claim.id || idx}
            claim={claim}
            resultId={report.id}
            index={idx}
          />
        ))}
      </div>

      {/* Bottom CTA & Disclaimers */}
      <div className="pt-6 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h4 className="text-sm font-bold text-stone-800">
            Have another message or circular to verify?
          </h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Test any forward, voice note, screenshot, or web article.
          </p>
        </div>

        <Link
          to="/"
          className="px-6 py-3 rounded-2xl bg-[#0F382E] hover:bg-[#164E3F] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
        >
          Verify Another Claim
        </Link>
      </div>

      {/* Transparency Note */}
      <div className="p-4 rounded-2xl bg-stone-100/70 border border-stone-200 text-xs text-stone-500 text-center leading-relaxed">
        <strong>Trust & Integrity Notice:</strong> SachAI analyzes real-time evidence indexed from authoritative web sources and reputable reporting. Automated AI assessment can occasionally make errors or miss hyperlocal context. Please review the linked primary sources before forwarding critical health, safety, or legal notices.
      </div>
    </div>
  );
}
