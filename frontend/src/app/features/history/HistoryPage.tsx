import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  History,
  Trash2,
  Search,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Filter,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { historyStore, SavedVerification } from "../../core/historyStore";
import VerdictBadge from "../../shared/components/ui/VerdictBadge";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState<SavedVerification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVerdict, setSelectedVerdict] = useState<string>("ALL");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const list = historyStore.getHistory();
    setHistoryItems(list);
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    historyStore.removeFromHistory(id);
    loadHistory();
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear your local verification history? This cannot be undone.")) {
      historyStore.clearHistory();
      loadHistory();
    }
  };

  const filteredItems = historyItems.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.previewText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.overallSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVerdict =
      selectedVerdict === "ALL" || item.primaryVerdict === selectedVerdict;

    return matchesSearch && matchesVerdict;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Page Title & Clear Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E7E2D6]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History size={20} className="text-[#0F382E]" />
            <h1 className="text-2xl font-extrabold text-[#0F382E] tracking-tight">
              Local Verification History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500">
            Stored exclusively in your current browser session. Zero global exposure or signup required.
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 hover:border-rose-200 hover:bg-rose-50 text-stone-600 hover:text-rose-700 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <Trash2 size={13} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past claims, keywords, or report ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 outline-none focus:border-[#0F382E] shadow-2xs"
          />
          <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-stone-400" />
          <select
            value={selectedVerdict}
            onChange={(e) => setSelectedVerdict(e.target.value)}
            className="text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0F382E] shadow-2xs"
          >
            <option value="ALL">All Verdicts</option>
            <option value="FALSE">False / Debunked</option>
            <option value="VERIFIED">Verified True</option>
            <option value="PARTIALLY_SUPPORTED">Partially Supported</option>
            <option value="OUTDATED">Outdated Context</option>
            <option value="CANNOT_CONFIRM">Cannot Confirm</option>
          </select>
        </div>
      </div>

      {/* History Items List */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-stone-200/80">
          <ShieldCheck size={36} className="mx-auto text-stone-300 mb-3" />
          <h3 className="text-base font-bold text-stone-700">No verifications found</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            {historyItems.length === 0
              ? "You haven't analyzed any claims yet. Submissions verified on the home page will appear here."
              : "No past verifications match your search and filter criteria."}
          </p>
          <div className="mt-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F382E] text-white text-xs font-semibold hover:bg-[#164E3F] transition-colors"
            >
              <span>Verify a Claim Now</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/result/${item.id}`)}
              className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-[#0F382E] hover:shadow-sm cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <VerdictBadge verdict={item.primaryVerdict} size="sm" />
                  <span className="font-mono text-stone-400 font-semibold">{item.id}</span>
                  <span className="text-stone-300">•</span>
                  <span className="capitalize text-stone-500 font-medium">{item.inputType}</span>
                  <span className="text-stone-300">•</span>
                  <span className="flex items-center gap-1 text-stone-400">
                    <Calendar size={11} />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-stone-900 group-hover:text-[#0F382E] line-clamp-2">
                  {item.previewText}
                </h4>

                <p className="text-xs text-stone-500 line-clamp-1">
                  {item.overallSummary}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className="text-xs text-[#0F382E] font-semibold group-hover:underline flex items-center gap-1">
                  <span>View Report</span>
                  <ExternalLink size={12} />
                </span>

                <button
                  onClick={(e) => handleDeleteItem(e, item.id)}
                  title="Delete from history"
                  className="p-2 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
