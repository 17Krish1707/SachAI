import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  ShieldCheck,
  CheckCircle2,
  Search,
  Sparkles,
  ArrowRight,
  Zap,
  Globe2,
  FileText,
  Volume2,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import VerificationWorkspace from "./components/VerificationWorkspace";
import ProgressPanel, { ProgressStage } from "./components/ProgressPanel";
import { api, VerificationResponse } from "../../core/api";
import { historyStore } from "../../core/historyStore";

export default function HomePage() {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [stage, setStage] = useState<ProgressStage>("receiving_input");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentInputType, setCurrentInputType] = useState<string>("text");
  const [claimsPreview, setClaimsPreview] = useState<string[]>([]);

  // Simulation of genuine progressive stage updates during API flight
  const runProgressSimulation = () => {
    setStage("receiving_input");
    const t1 = setTimeout(() => setStage("extracting_text"), 800);
    const t2 = setTimeout(() => setStage("identifying_claims"), 2200);
    const t3 = setTimeout(() => setStage("finding_sources"), 4200);
    const t4 = setTimeout(() => setStage("comparing_evidence"), 6500);
    const t5 = setTimeout(() => setStage("preparing_report"), 8500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  };

  const handleVerifyText = async (text: string, language?: string) => {
    setIsVerifying(true);
    setErrorMessage(null);
    setCurrentInputType("text");
    const cleanup = runProgressSimulation();

    try {
      const response = await api.verifyText(text, language);
      historyStore.saveToHistory(response);
      setStage("completed");
      setTimeout(() => {
        navigate(`/result/${response.id}`);
      }, 500);
    } catch (err: any) {
      setStage("error");
      setErrorMessage(err.message || "Failed to complete text verification.");
    } finally {
      cleanup();
      setIsVerifying(false);
    }
  };

  const handleVerifyUrl = async (url: string, language?: string) => {
    setIsVerifying(true);
    setErrorMessage(null);
    setCurrentInputType("url");
    const cleanup = runProgressSimulation();

    try {
      const response = await api.verifyUrl(url, language);
      historyStore.saveToHistory(response);
      setStage("completed");
      setTimeout(() => {
        navigate(`/result/${response.id}`);
      }, 500);
    } catch (err: any) {
      setStage("error");
      setErrorMessage(err.message || "Failed to analyze webpage URL.");
    } finally {
      cleanup();
      setIsVerifying(false);
    }
  };

  const handleVerifyMultimodal = async (formData: FormData) => {
    const type = (formData.get("type") as string) || "media";
    setIsVerifying(true);
    setErrorMessage(null);
    setCurrentInputType(type);
    const cleanup = runProgressSimulation();

    try {
      const response = await api.verifyMultimodal(formData);
      historyStore.saveToHistory(response);
      setStage("completed");
      setTimeout(() => {
        navigate(`/result/${response.id}`);
      }, 500);
    } catch (err: any) {
      setStage("error");
      setErrorMessage(err.message || "Failed to process multimodal verification.");
    } finally {
      cleanup();
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    setIsVerifying(false);
    setErrorMessage(null);
    setStage("receiving_input");
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-10 sm:pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-60 pointer-events-none">
          <div className="w-[500px] h-[300px] bg-gradient-to-tr from-emerald-100 to-amber-100 rounded-full blur-3xl transform -translate-y-12" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-300 text-[#0F382E] text-xs font-semibold mb-6 shadow-2xs">
          <ShieldCheck size={14} className="text-emerald-700" />
          <span>Zero Login Required • Evidence-Backed Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-[#0F382E] tracking-tight leading-[1.15] mb-6">
          Don’t just forward it. <br />
          <span className="bg-gradient-to-r from-[#0F382E] via-[#1A5C4E] to-emerald-700 bg-clip-text text-transparent">
            Verify it.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed font-normal mb-10">
          Turn forwarded messages, screenshots, documents, and voice notes into clear, source-backed fact checks powered by Gemini and live Tavily search.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-stone-600 font-medium">
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-stone-200 shadow-2xs">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Multi-Claim Decomposition</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-stone-200 shadow-2xs">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>5 IFCN-Aligned Verdicts</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-stone-200 shadow-2xs">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Hindi & Regional Audio</span>
          </div>
        </div>
      </section>

      {/* Main Verification Workspace Area */}
      <section id="verify-workspace" className="px-4 sm:px-6 scroll-mt-24">
        {isVerifying || errorMessage ? (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <ProgressPanel
              currentStage={stage}
              error={errorMessage}
              onRetry={handleRetry}
              inputType={currentInputType}
              extractedClaimsPreview={claimsPreview}
            />
          </div>
        ) : (
          <VerificationWorkspace
            onVerifyText={handleVerifyText}
            onVerifyUrl={handleVerifyUrl}
            onVerifyMultimodal={handleVerifyMultimodal}
            isLoading={isVerifying}
          />
        )}
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-widest">
            <Sparkles size={14} />
            <span>Engine Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0F382E] tracking-tight">
            How SachAI Verifies Information
          </h2>
          <p className="text-sm text-stone-600">
            From viral forwarding to verifiable truth in seconds through four synchronized stages
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-[#E7E2D6] shadow-2xs space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0F382E] flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h4 className="text-base font-bold text-[#0F382E]">
              Ingest & Normalize
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Upload voice note, screenshot, PDF circular, or text forward. Multimodal OCR and Whisper extract the raw contents.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E7E2D6] shadow-2xs space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0F382E] flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h4 className="text-base font-bold text-[#0F382E]">
              Claim Decomposition
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Gemini isolates distinct factual propositions, stripping away conversational chatter, emojis, and emotional bait.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E7E2D6] shadow-2xs space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0F382E] flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h4 className="text-base font-bold text-[#0F382E]">
              Live Web Discovery
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Tavily queries official gazettes, government notices, and news wires in real time. No fabricated URLs are ever allowed.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E7E2D6] shadow-2xs space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0F382E] flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h4 className="text-base font-bold text-[#0F382E]">
              Synthesized Verdict
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Generates nuanced verdict, plain-language reason, counter-message rebuttal, and a downloadable shareable fact card.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Community Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-[#0F382E] to-[#18483B] text-white p-8 sm:p-12 shadow-xl shadow-stone-900/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider inline-block">
              Community Defense
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Stop Viral Misinformation in Your Family & Group Chats
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Always verify suspicious forwardings before forwarding them to friends, parents, or community WhatsApp groups. Every check protects real lives and livelihoods.
            </p>
          </div>

          <button
            onClick={() => {
              window.scrollTo({ top: 300, behavior: "smooth" });
            }}
            className="px-6 py-3.5 rounded-2xl bg-white text-[#0F382E] font-bold text-sm hover:bg-stone-100 transition-all shadow-md shrink-0 active:scale-98"
          >
            Verify a Claim Now
          </button>
        </div>
      </section>
    </div>
  );
}
