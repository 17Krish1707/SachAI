import React from "react";
import { Link } from "react-router";
import {
  ShieldCheck,
  Search,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Globe2,
  FileCheck2,
  BookOpen,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-16">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-[#0F382E] text-xs font-semibold">
          <ShieldCheck size={14} />
          <span>About SachAI • Fact-Checking Intelligence</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#0F382E] tracking-tight">
          Verify Before You Forward
        </h1>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal">
          Sach (सच) means truth in Hindi and Sanskrit. Built for high-velocity digital ecosystems where forwarded messages, voice notes, screenshots, and circulars frequently circulate without factual backing.
        </p>
      </div>

      {/* 4 Pillars of Architecture (Matching Product PPT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-7 rounded-3xl bg-white border border-[#E7E2D6] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F382E] flex items-center justify-center font-bold">
            01
          </div>
          <h3 className="text-lg font-bold text-[#0F382E]">
            Multimodal Input Extraction
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Misinformation is rarely pure text. SachAI accepts forwarded texts, voice notes, screenshots, circular PDFs, and web links—extracting clean content via Whisper STT, Tesseract OCR, PyMuPDF, and Gemini Multimodal Vision.
          </p>
        </div>

        <div className="p-7 rounded-3xl bg-white border border-[#E7E2D6] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F382E] flex items-center justify-center font-bold">
            02
          </div>
          <h3 className="text-lg font-bold text-[#0F382E]">
            Independent Claim Decomposition
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Viral forwards bundle multiple assertions together. Gemini decomposes submissions into separate testable propositions—filtering out greetings, personal opinions, and hyperbole so every claim is evaluated individually.
          </p>
        </div>

        <div className="p-7 rounded-3xl bg-white border border-[#E7E2D6] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F382E] flex items-center justify-center font-bold">
            03
          </div>
          <h3 className="text-lg font-bold text-[#0F382E]">
            Live Evidence Retrieval (Tavily)
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            We never guess or rely on stale training memory. Tavily searches the live web for verified fact-checks, official government circulars (pib.gov.in, rbi.org.in), and accredited news reports, preserving exact URLs and publication dates.
          </p>
        </div>

        <div className="p-7 rounded-3xl bg-white border border-[#E7E2D6] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F382E] flex items-center justify-center font-bold">
            04
          </div>
          <h3 className="text-lg font-bold text-[#0F382E]">
            Nuanced 5-Verdict Standard
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Binary True/False ignores real-world complexity. SachAI classifies each claim into Verified, False, Partially Supported, Outdated Context, or Cannot Confirm—with zero fabricated sources and evidence-backed confidence ratings.
          </p>
        </div>
      </div>

      {/* The 5 Verdict Categories Explained */}
      <div className="bg-white rounded-3xl border border-[#E7E2D6] p-8 sm:p-10 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F382E] tracking-tight">
            Our 5 Verdict Categories
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Standardized evaluation aligned with International Fact-Checking Network (IFCN) principles
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              Verified True
            </span>
            <p className="text-xs text-stone-700 leading-relaxed">
              Directly corroborated by primary official sources, gazettes, or accredited fact-checking consensus.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
              False / Debunked
            </span>
            <p className="text-xs text-stone-700 leading-relaxed">
              Demonstrably false, fabricated, a known scam, or directly contradicted by reputable evidence.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
              Partially Supported
            </span>
            <p className="text-xs text-stone-700 leading-relaxed">
              Contains factual elements but draws exaggerated conclusions or omits critical qualifying context.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">
              Outdated Context
            </span>
            <p className="text-xs text-stone-700 leading-relaxed">
              Was historically accurate or based on an expired order, but now recirculated misleadingly as breaking news.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-100 border border-stone-300 space-y-1.5">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
              Cannot Confirm
            </span>
            <p className="text-xs text-stone-700 leading-relaxed">
              Public evidence is contradictory, insufficient, or unavailable. We never default to false when evidence is missing.
            </p>
          </div>
        </div>
      </div>

      {/* Product Roadmap / Future Scope (Explicitly labeled) */}
      <div className="p-8 sm:p-10 rounded-3xl bg-[#14231E] text-stone-200 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <span>Product Roadmap</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Future Scope (In Progress / Proposed)
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Capabilities planned for subsequent releases (not represented as currently available in this prototype):
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white">
              WhatsApp Community Bot Auto-Reply
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Direct group tip-line integration where group administrators can add SachAI Bot to automatically reply with verified debunk cards when known hoaxes are detected.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white">
              Community Broadcast Alert Feed
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Geo-targeted alerts for trending medical or financial scams, alerting vulnerable communities in their native mother tongue before harm occurs.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white">
              Decentralized Fact-Checking Consortium
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Human-in-the-loop escalation pipeline connecting disputed high-impact claims to verified regional journalism partners and university fact-checking labs.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#0F382E] text-white text-sm font-semibold hover:bg-[#164E3F] shadow-md transition-all"
        >
          <span>Try the Fact-Checking Workspace</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
