import type { Report } from "@/lib/dashboard-report";

export type SurveyDashboard = Pick<Report,
  "period" | "generatedAt" | "activity" | "funnel" | "acquisition" |
  "engagement" | "quality" | "completeness" | "viewsTrend" | "submissionsTrend"> & {
  surveyId: string;
  lifetime: { views: number | null; submissions: number };
  averageSubmissionsPerBucket: number | null;
};
