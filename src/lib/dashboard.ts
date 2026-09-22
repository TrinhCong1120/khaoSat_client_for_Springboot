import { API_DASHBOARD } from "@/lib/api";

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
  const source = raw as Partial<DashboardApiResponse> & {
    openSurveys?: number;
    openSurveysDelta?: number | null;
    totalResponses?: number;
    completionRate?: number;
    activities?: Array<{ date?: string; label?: string; responses?: number; views?: number }>;
    surveyStatuses?: Array<{ status?: string; label?: string; count?: number }>;
    topSurveys?: Array<DashboardTopSurvey & { surveyId?: number }>;
  };
  const k = (source.kpis ?? {}) as Partial<DashboardKpis>;
  const legacyKpis: DashboardKpis = {
    openSurveys: Number(source.openSurveys) || 0,
    openSurveysTrendDelta:
      source.openSurveysDelta == null ? null : Number(source.openSurveysDelta),
    responsesLast30Days: Number(source.responsesLast30Days) || 0,
    responsesTrendPercent:
      source.responsesTrendPercent == null ? null : Number(source.responsesTrendPercent),
    averageCompletionRatePercent: Number(source.completionRate) || 0,
    satisfactionScore:
      source.satisfactionScore == null ? null : Number(source.satisfactionScore),
    satisfactionTrendDelta:
      source.satisfactionTrendDelta == null ? null : Number(source.satisfactionTrendDelta),
  };
  const kpis = source.kpis ? k : legacyKpis;
  const activity = source.activityLast7Days ?? source.activities ?? [];
  const statuses = source.statusDistribution ?? source.surveyStatuses ?? [];
  const topSurveys = source.topSurveysByCompletion ?? source.topSurveys ?? [];
  return {
    kpis: {
      openSurveys: Number(kpis.openSurveys) || 0,
      openSurveysTrendDelta:
        kpis.openSurveysTrendDelta == null ? null : Number(kpis.openSurveysTrendDelta),
      responsesLast30Days: Number(kpis.responsesLast30Days) || 0,
      responsesTrendPercent:
        kpis.responsesTrendPercent == null ? null : Number(kpis.responsesTrendPercent),
      averageCompletionRatePercent: Math.min(
        100,
        Math.max(0, Number(kpis.averageCompletionRatePercent) || 0)
      ),
      completionTrendDeltaPercent:
        kpis.completionTrendDeltaPercent == null
          ? null
          : Number(kpis.completionTrendDeltaPercent),
      satisfactionScore:
        kpis.satisfactionScore == null ? null : Number(kpis.satisfactionScore),
      satisfactionTrendDelta:
        kpis.satisfactionTrendDelta == null ? null : Number(kpis.satisfactionTrendDelta),
    },
    activityLast7Days: Array.isArray(activity)
      ? activity.map((d) => ({
          label: String(d.label ?? d.date ?? ""),
          responses: Number(d.responses) || 0,
          views: Number(d.views) || 0,
        }))
      : [],
    statusDistribution: Array.isArray(statuses)
      ? statuses.map((s) => ({
          label: String(s.label ?? s.status ?? ""),
          count: Number(s.count) || 0,
        }))
      : [],
    topSurveysByCompletion: Array.isArray(topSurveys)
      ? topSurveys.map((t) => ({
          title: String(t.title ?? ""),
          completionPercent: Math.min(100, Math.max(0, Number(t.completionPercent) || 0)),
          responseCount: Number(t.responseCount) || 0,
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
  const res = await fetch(API_DASHBOARD, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Lỗi ${res.status}`);
  }
  const json = await res.json();
  return normalizeDashboard(json);
}
