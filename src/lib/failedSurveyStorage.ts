export type FailedSurveyRecord = {
  id: string;
  fileName: string;
  createdAt: string;
  surveyId?: number | string | null;
  surveyTitle?: string | null;
  statusCode?: number | null;
  statusText?: string | null;
  message?: string | null;
  url?: string | null;
  payload?: unknown;
};

export type FailedSurveyFileItem = {
  fileName: string;
  fileSize: number;
  lastModified: string;
  content?: string | null;
};

const FAILED_SURVEYS_API = "/api/failed-surveys";

export const persistFailedSurveyRecord = async (
  record: Omit<FailedSurveyRecord, "id" | "fileName" | "createdAt">
) => {
  const createdAt = new Date().toISOString();
  const fileName = `failed_${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}_${Date.now()}.json`;

  const entry: FailedSurveyRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fileName,
    createdAt,
    ...record,
  };

  const res = await fetch(FAILED_SURVEYS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });

  if (!res.ok) {
    throw new Error(`Không lưu được file lỗi lên public (${res.status})`);
  }

  return await res.json();
};

export const listFailedSurveyFiles = async (): Promise<FailedSurveyFileItem[]> => {
  const res = await fetch(FAILED_SURVEYS_API, { cache: "no-store" });
  if (!res.ok) return [];

  const data = await res.json();
  return Array.isArray(data)
    ? data.map((item: any) => ({
        fileName: String(item.fileName ?? ""),
        fileSize: Number(item.fileSize ?? 0),
        lastModified: String(item.lastModified ?? ""),
        content: item.content ?? null,
      }))
    : [];
};

export const getFailedSurveyFileContent = async (fileName: string) => {
  const res = await fetch(`${FAILED_SURVEYS_API}?file=${encodeURIComponent(fileName)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return await res.text();
};

export const deleteFailedSurveyFile = async (fileName: string) => {
  const res = await fetch(
    `${FAILED_SURVEYS_API}?file=${encodeURIComponent(fileName)}`,
    { method: "DELETE" }
  );
  return res.ok;
};

export const deleteAllFailedSurveyFiles = async () => {
  const res = await fetch(FAILED_SURVEYS_API, { method: "DELETE" });
  return res.ok;
};
