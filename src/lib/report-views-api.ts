import { API_REPORTS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getApiError } from "@/lib/report";
import type {
  CreateExportLogPayload,
  ReportViewItem,
  SaveReportViewPayload,
  SurveyDataset,
} from "@/types/report";

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    if (body?.message) return body.message;
  } catch {
    // ignore JSON parse errors
  }
  return getApiError(res.status);
}

export async function fetchSurveyDataset(
  surveyId: string,
  includePii = false
): Promise<SurveyDataset> {
  const res = await fetch(
    `${API_REPORTS}/survey/${surveyId}/dataset?includePii=${includePii ? "true" : "false"}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return (await res.json()) as SurveyDataset;
}

export async function listReportViews(surveyId: string): Promise<ReportViewItem[]> {
  const res = await fetch(`${API_REPORTS}/survey/${surveyId}/views`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return (await res.json()) as ReportViewItem[];
}

export async function createReportView(
  surveyId: string,
  payload: SaveReportViewPayload
): Promise<ReportViewItem> {
  const res = await fetch(`${API_REPORTS}/survey/${surveyId}/views`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return (await res.json()) as ReportViewItem;
}

export async function updateReportView(
  surveyId: string,
  viewId: string,
  payload: SaveReportViewPayload
): Promise<ReportViewItem> {
  const res = await fetch(`${API_REPORTS}/survey/${surveyId}/views/${viewId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return (await res.json()) as ReportViewItem;
}

export async function deleteReportView(surveyId: string, viewId: string): Promise<void> {
  const res = await fetch(`${API_REPORTS}/survey/${surveyId}/views/${viewId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
}

export async function recordReportExportLog(
  surveyId: string,
  payload: CreateExportLogPayload
): Promise<void> {
  const res = await fetch(`${API_REPORTS}/survey/${surveyId}/export-logs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
}

