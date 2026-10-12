import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { ShieldCheck, History, Info, Sparkles, Menu, X, ArrowRight, ExternalLink } from "lucide-react";
import { api, HealthResponse } from "../../../core/api";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .getHealth()
      .then((data) => {
        if (isMounted) setHealth(data);
      })
      .catch(() => {
        // Silent failure in dev or if backend is booting
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = [
    { label: "Verify Claim", path: "/", icon: ShieldCheck },
    { label: "How It Works", path: "/#how-it-works", icon: Sparkles },
    { label: "History", path: "/history", icon: History },
    { label: "About", path: "/about", icon: Info },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1E2621] font-sans antialiased selection:bg-[#165B4C]/15 selection:text-[#0F382E]">
      {/* Top Notice Bar */}
      <div className="bg-[#0F382E] text-stone-100 text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2 font-medium">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>SachAI 2.0 • Multimodal misinformation intelligence & fact-checking</span>
        <span className="hidden sm:inline text-stone-300">• Verify before you forward</span>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8E4DC] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-[#0F382E]/15 group-hover:scale-105 transition-transform duration-200">
              <img src="/logo.svg" alt="SachAI Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-[#0F382E]">
                  SachAI
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-[#0F382E] rounded-md border border-emerald-200">
                  v2.0
                </span>
              </div>
              <span className="text-xs text-stone-500 font-medium tracking-tight">
                Verify before you forward
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-[#0F382E] bg-emerald-50/80 font-semibold"
                      : "text-stone-600 hover:text-[#0F382E] hover:bg-stone-100/60"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-[#0F382E]" : "text-stone-400"} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action Button & Status */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#0F382E] hover:bg-[#164E3F] text-white shadow-sm hover:shadow-md transition-all duration-200 active:scale-98"
            >
              <span>Verify Claim</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile menu toggle button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FAF8F5] border-b border-[#E8E4DC] px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100"
                >
                  <Icon size={18} className="text-[#0F382E]" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <div className="pt-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#0F382E] text-white"
              >
                <span>Verify Claim</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-[#121B17] text-stone-300 border-t border-stone-800 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={18} />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">SachAI</span>
              </div>
              <p className="text-sm text-stone-400 max-w-md leading-relaxed">
                Sach (सच) means <span className="text-emerald-400 font-medium">Truth</span>. We provide instant, evidence-backed fact checking for forwarded messages, audio notes, screenshots, and circulars to protect community trust.
              </p>
              <div className="text-xs text-stone-400 pt-1">
                Built with Gemini Multimodal Intelligence & Tavily Live Search.
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider mb-3">
                Navigation
              </h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li>
                  <Link to="/" className="hover:text-emerald-400 transition-colors">
                    Fact-Check Workspace
                  </Link>
                </li>
                <li>
                  <Link to="/#how-it-works" className="hover:text-emerald-400 transition-colors">
                    Verification Methodology
                  </Link>
                </li>
                <li>
                  <Link to="/history" className="hover:text-emerald-400 transition-colors">
                    Browser Verification History
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-emerald-400 transition-colors">
                    About & Research Context
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider mb-3">
                Integrity & Privacy
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed">
                No user login required. Uploaded media is processed strictly for ephemeral verification. We never disclose your submissions to other users or third parties.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Zero signup • Privacy first</span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
            <p>© {new Date().getFullYear()} SachAI. All rights reserved.</p>
            <p className="text-center sm:text-right">
              Disclaimer: AI-assisted verification can occasionally make mistakes. Always cross-check primary sources for high-stakes health and legal decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
