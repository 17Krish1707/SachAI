import { VerificationResponse, VerdictType } from "./api";

export interface SavedVerification {
  id: string;
  inputType: string;
  previewText: string;
  detectedLanguage: string;
  createdAt: string;
  claimsCount: number;
  overallSummary: string;
  verdictDistribution: Record<string, number>;
  primaryVerdict: VerdictType;
  fullResult: VerificationResponse;
}

const STORAGE_KEY = "sachai_verification_history_v1";

export const historyStore = {
  getHistory(): SavedVerification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to read local history:", e);
      return [];
    }
  },

  saveToHistory(res: VerificationResponse): void {
    try {
      const current = this.getHistory();
      // Remove any existing entry with same id
      const filtered = current.filter((item) => item.id !== res.id);

      // Determine predominant verdict
      const dist = res.verdict_distribution || {};
      let primaryVerdict: VerdictType = "CANNOT_CONFIRM";
      if ((dist["FALSE"] || 0) > 0) primaryVerdict = "FALSE";
      else if ((dist["PARTIALLY_SUPPORTED"] || 0) > 0) primaryVerdict = "PARTIALLY_SUPPORTED";
      else if ((dist["OUTDATED"] || 0) > 0) primaryVerdict = "OUTDATED";
      else if ((dist["VERIFIED"] || 0) > 0) primaryVerdict = "VERIFIED";

      const previewText = (res.extracted_text || "").slice(0, 160).trim();

      const newEntry: SavedVerification = {
        id: res.id,
        inputType: res.input_type,
        previewText: previewText + (res.extracted_text.length > 160 ? "..." : ""),
        detectedLanguage: res.detected_language,
        createdAt: res.created_at,
        claimsCount: res.claims_count,
        overallSummary: res.overall_summary,
        verdictDistribution: dist,
        primaryVerdict,
        fullResult: res,
      };

      // Keep latest 50 verifications locally
      const updated = [newEntry, ...filtered].slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save to local history:", e);
    }
  },

  removeFromHistory(id: string): void {
    try {
      const current = this.getHistory();
      const updated = current.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to remove history item:", e);
    }
  },

  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear local history:", e);
    }
  },

  getHistoryItem(id: string): SavedVerification | undefined {
    const list = this.getHistory();
    return list.find((item) => item.id === id);
  },
};
