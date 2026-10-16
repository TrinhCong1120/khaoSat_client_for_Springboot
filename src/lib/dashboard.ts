import { API_DASHBOARD } from "@/lib/api";

export type DashboardApiResponse = {
  openSurveys: number;
  openSurveysDelta: number | null;
  totalResponses: number;
  responsesLast30Days: number;
  responsesTrendPercent: number | null;
  completionRate: number;
  satisfactionScore: number | null;
  satisfactionTrendDelta: number | null;
  activities: Array<{ date: string; label: string; responses: number; views: number }>;
  surveyStatuses: Array<{ status: string; count: number }>;
  topSurveys: Array<{ surveyId: string; title: string; completionPercent: number | null; responseCount: number }>;
};

export function normalizeDashboard(raw: unknown): DashboardApiResponse {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const activities = Array.isArray(value.activities) ? value.activities : [];
  const statuses = Array.isArray(value.surveyStatuses) ? value.surveyStatuses : [];
  const top = Array.isArray(value.topSurveys) ? value.topSurveys : [];
  return {
    openSurveys: Number(value.openSurveys) || 0,
    openSurveysDelta: value.openSurveysDelta == null ? null : Number(value.openSurveysDelta),
    totalResponses: Number(value.totalResponses) || 0,
    responsesLast30Days: Number(value.responsesLast30Days) || 0,
    responsesTrendPercent: value.responsesTrendPercent == null ? null : Number(value.responsesTrendPercent),
    completionRate: Number(value.completionRate) || 0,
    satisfactionScore: value.satisfactionScore == null ? null : Number(value.satisfactionScore),
    satisfactionTrendDelta: value.satisfactionTrendDelta == null ? null : Number(value.satisfactionTrendDelta),
    activities: activities.map((item) => { const row = item as Record<string, unknown>; return { date: String(row.date ?? ""), label: String(row.label ?? row.date ?? ""), responses: Number(row.responses) || 0, views: Number(row.views) || 0 }; }),
    surveyStatuses: statuses.map((item) => { const row = item as Record<string, unknown>; return { status: String(row.status ?? ""), count: Number(row.count) || 0 }; }),
    topSurveys: top.map((item) => { const row = item as Record<string, unknown>; return { surveyId: String(row.surveyId ?? ""), title: String(row.title ?? ""), completionPercent: row.completionPercent == null ? null : Number(row.completionPercent), responseCount: Number(row.responseCount) || 0 }; }),
  };
}

export async function fetchDashboard(token: string): Promise<DashboardApiResponse> {
  const response = await fetch(API_DASHBOARD, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Không thể tải dashboard (HTTP ${response.status})`);
  return normalizeDashboard(await response.json());
}

export const formatViInt = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
export const formatViDecimal = (value: number, digits = 1) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(value);
