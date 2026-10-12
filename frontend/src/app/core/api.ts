/**
 * SachAI - Centralized Typed API Client
 * Configured via VITE_API_BASE_URL (defaults to http://127.0.0.1:8000)
 */

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:8000";

export type VerdictType =
  | "VERIFIED"
  | "FALSE"
  | "PARTIALLY_SUPPORTED"
  | "OUTDATED"
  | "CANNOT_CONFIRM";

export interface EvidenceSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  published_date?: string | null;
  relevance_score?: number | null;
  is_supporting?: boolean | null;
  credibility_tier?: string | null;
}

export interface ClaimResult {
  id: string;
  claim_text: string;
  original_quote?: string | null;
  verdict: VerdictType;
  verdict_display: string;
  category: string;
  explanation: string;
  explanation_regional?: string | null;
  reason_for_verdict: string;
  confidence_assessment: string;
  uncertainty_caveats?: string | null;
  outdated_warning?: string | null;
  sources: EvidenceSource[];
  supporting_sources: EvidenceSource[];
  contradicting_sources: EvidenceSource[];
  counter_message?: string | null;
}

export interface VerificationResponse {
  id: string;
  input_type: string;
  extracted_text: string;
  detected_language: string;
  language_code: string;
  created_at: string;
  claims_count: number;
  claims: ClaimResult[];
  overall_summary: string;
  verdict_distribution: Record<string, number>;
  truncated: boolean;
  processing_time_sec: number;
  warnings: string[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  capabilities: {
    gemini_configured: boolean;
    tavily_configured: boolean;
    whatsapp_configured: boolean;
    multimodal_inputs: string[];
    supported_verdicts: string[];
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = "API request failed";
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail || `HTTP error ${res.status}`);
  }
  return res.json();
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse<HealthResponse>(res);
  },

  async verifyText(text: string, language = "auto"): Promise<VerificationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/verify/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
    });
    return handleResponse<VerificationResponse>(res);
  },

  async verifyUrl(url: string, language = "auto"): Promise<VerificationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/verify/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, language }),
    });
    return handleResponse<VerificationResponse>(res);
  },

  async verifyMultimodal(formData: FormData): Promise<VerificationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/verify`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<VerificationResponse>(res);
  },

  async getResult(resultId: string): Promise<VerificationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/result/${encodeURIComponent(resultId)}`);
    return handleResponse<VerificationResponse>(res);
  },

  async submitFeedback(payload: {
    result_id: string;
    claim_id?: string;
    helpful: boolean;
    feedback_text?: string;
  }): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
};
