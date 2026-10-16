import { API_DASHBOARD } from "@/lib/api";

export type Trend = { delta: number; percent: number | null; label: string | null };
export type SurveyRow = {
  surveyId: string; title: string; status: string; views: number | null; sessions: number | null;
  submissions: number; conversionRate: number | null; completionRate: number | null;
  medianActiveDurationMs: number | null; viewsTrend: Trend | null; submissionsTrend: Trend;
  trackingStatus: string; applicableQuestions: number; answeredQuestions: number;
  skippedQuestions: number; questionCountResponses: number;
  estimatedLegacyResponses: number; questionCountSource: "EXACT" | "PARTIAL" | "UNAVAILABLE";
};
export type Report = {
  period: { from: string; to: string; bucket: string; timezone: string; filterMode: "ALL" | "FROM_ONLY" | "TO_ONLY" | "BETWEEN"; trendMode: "PREVIOUS_EQUAL_PERIOD" | "RECENT_30_DAYS"; trendFrom: string; trendTo: string; previousFrom: string; previousTo: string };
  generatedAt: string;
  system: { accounts: number; activeAccounts: number; inactiveAccounts: number; roles: number; surveyCreators: number; roleDistribution: { name: string; users: number }[] };
  website: { visitorsToday: number | null; daily: { date: string; visitors: number | null; newVisitors: number | null; returningVisitors: number | null }[]; timeline: { label: string; start: string; visitors: number | null; newVisitors: number | null; returningVisitors: number | null }[]; trackingStartedAt: string | null };
  portfolio: { totalSurveys: number; statuses: Record<string, number>; createdInPeriod: number; publishedInPeriod: number; withoutResponses: number };
  activity: { views: number | null; submissions: number; timeline: { label: string; start: string; views: number | null; submissions: number }[]; trackingStatus: string; trackingStartedAt: string | null };
  funnel: { viewed: number; started: number; submitted: number; inProgress: number; abandoned: number; onlyViewed: number; viewToStartRate: number | null; startToSubmitRate: number | null; viewToSubmitRate: number | null; provisional: boolean };
  acquisition: { devices: { label: string; count: number }[]; sources: { label: string; count: number }[]; mediums: { label: string; count: number }[] };
  engagement: { medianActiveDurationMs: number | null; averagePagesViewed: number | null; byWeekday: { day: number; submissions: number }[]; byHour: { hour: number; submissions: number }[] };
  quality: { responseSessionCoverage: number | null; questionCountCoverage: number | null; deviceCoverage: number | null; sourceCoverage: number | null; durationCoverage: number | null; trackingStartedAt: string | null };
  completeness: { responses: number; exactResponses: number; applicableQuestions: number; answeredQuestions: number; skippedQuestions: number; averageApplicable: number | null; averageAnswered: number | null; averageSkipped: number | null; completionRate: number | null; estimatedLegacyResponses: number };
  averageSubmissionsPerSurvey: number | null; averageSubmissionsPerBucket: number | null;
  viewsTrend: Trend | null; submissionsTrend: Trend;
};
export type SurveyPage = { total: number; page: number; size: number; rows: SurveyRow[] };

export function reportParams(from?: string, to?: string, bucket = "AUTO") {
  const params = new URLSearchParams({ bucket });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return params;
}

export async function fetchReport<T>(token: string, path: string, params: URLSearchParams): Promise<T> {
  const response = await fetch(`${API_DASHBOARD}${path}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
