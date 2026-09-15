/**
 * Hợp đồng API: backend cần triển khai
 * GET {API_URL}/survey/dashboard
 * Header: Authorization: Bearer {token}
 */

export type DashboardActivityDay = {
  /** Nhãn trục X, ví dụ T2…CN hoặc 25/03 */
  label: string;
  responses: number;
  views: number;
};

export type DashboardStatusSlice = {
  label: string;
  count: number;
};

export type DashboardTopSurvey = {
  title: string;
  completionPercent: number;
  responseCount: number;
};

export type DashboardKpis = {
  openSurveys: number;
  /** So với kỳ trước (cùng độ dài), có thể âm */
  openSurveysTrendDelta?: number | null;
  responsesLast30Days: number;
  responsesTrendPercent?: number | null;
  /** 0–100 */
  averageCompletionRatePercent: number;
  completionTrendDeltaPercent?: number | null;
  /** Nếu không có câu hỏi đánh giá sao thì null */
  satisfactionScore?: number | null;
  satisfactionTrendDelta?: number | null;
};

export type DashboardApiResponse = {
  kpis: DashboardKpis;
  /** Đúng 7 phần tử (hoặc ít hơn — UI sẽ pad số 0) */
  activityLast7Days: DashboardActivityDay[];
  /** Thứ tự = màu trên donut */
  statusDistribution: DashboardStatusSlice[];
  topSurveysByCompletion: DashboardTopSurvey[];
};

const DEFAULT: DashboardApiResponse = {
  kpis: {
    openSurveys: 0,
    responsesLast30Days: 0,
    averageCompletionRatePercent: 0,
  },
  activityLast7Days: [],
  statusDistribution: [],
  topSurveysByCompletion: [],
};

export function normalizeDashboard(raw: unknown): DashboardApiResponse {
  if (!raw || typeof raw !== "object") return { ...DEFAULT, kpis: { ...DEFAULT.kpis } };
  const r = raw as Partial<DashboardApiResponse>;
  const k = (r.kpis ?? {}) as Partial<DashboardKpis>;
  return {
    kpis: {
      openSurveys: Number(k.openSurveys) || 0,
      openSurveysTrendDelta:
        k.openSurveysTrendDelta == null ? null : Number(k.openSurveysTrendDelta),
      responsesLast30Days: Number(k.responsesLast30Days) || 0,
      responsesTrendPercent:
        k.responsesTrendPercent == null ? null : Number(k.responsesTrendPercent),
      averageCompletionRatePercent: Math.min(
        100,
        Math.max(0, Number(k.averageCompletionRatePercent) || 0)
      ),
      completionTrendDeltaPercent:
        k.completionTrendDeltaPercent == null
          ? null
          : Number(k.completionTrendDeltaPercent),
      satisfactionScore:
        k.satisfactionScore == null ? null : Number(k.satisfactionScore),
      satisfactionTrendDelta:
        k.satisfactionTrendDelta == null ? null : Number(k.satisfactionTrendDelta),
    },
    activityLast7Days: Array.isArray(r.activityLast7Days)
      ? r.activityLast7Days.map((d) => ({
          label: String((d as DashboardActivityDay).label ?? ""),
          responses: Number((d as DashboardActivityDay).responses) || 0,
          views: Number((d as DashboardActivityDay).views) || 0,
        }))
      : [],
    statusDistribution: Array.isArray(r.statusDistribution)
      ? r.statusDistribution.map((s) => ({
          label: String((s as DashboardStatusSlice).label ?? ""),
          count: Number((s as DashboardStatusSlice).count) || 0,
        }))
      : [],
    topSurveysByCompletion: Array.isArray(r.topSurveysByCompletion)
      ? r.topSurveysByCompletion.map((t) => ({
          title: String((t as DashboardTopSurvey).title ?? ""),
          completionPercent: Math.min(
            100,
            Math.max(0, Number((t as DashboardTopSurvey).completionPercent) || 0)
          ),
          responseCount: Number((t as DashboardTopSurvey).responseCount) || 0,
        }))
      : [],
  };
}

export function formatViInt(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
}

export function formatViDecimal(n: number, maxFrac = 1): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  }).format(n);
}

export function trendSigned(
  n: number | null | undefined,
  mode: "int" | "percent" | "decimal"
): { text: string; positive: boolean } {
  if (n == null || Number.isNaN(n)) return { text: "—", positive: true };
  const positive = n >= 0;
  const sign = n > 0 ? "+" : "";
  if (mode === "percent") {
    return { text: `${sign}${formatViDecimal(n)}%`, positive };
  }
  if (mode === "decimal") {
    return { text: `${sign}${formatViDecimal(n)}`, positive };
  }
  return { text: `${sign}${formatViInt(Math.round(n))}`, positive };
}

export async function fetchDashboard(token: string): Promise<DashboardApiResponse> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${API_URL}/survey/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Lỗi ${res.status}`);
  }
  const json = await res.json();
  return normalizeDashboard(json);
}
