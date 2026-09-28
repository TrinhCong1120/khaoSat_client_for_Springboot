const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const endpoint = (name: string, fallback: string) => {
  if (process.env[name]) return process.env[name];
  return `${API_BASE}${fallback}`;
};

export const API_AUTH = endpoint("NEXT_PUBLIC_API_AUTH", "/api/Auth");
export const API_USERS = endpoint("NEXT_PUBLIC_API_USERS", "/api/Users");
export const API_ROLES = endpoint("NEXT_PUBLIC_API_ROLES", "/api/Roles");
export const API_MENUS = endpoint("NEXT_PUBLIC_API_MENUS", "/api/Menus");
export const API_FUNCTIONS = endpoint("NEXT_PUBLIC_API_FUNCTIONS", "/api/Functions");
export const API_SURVEYS = endpoint("NEXT_PUBLIC_API_SURVEYS", "/api/Surveys");
export const API_PAGES = endpoint("NEXT_PUBLIC_API_PAGES", "/api/Pages");
export const API_QUESTIONS = endpoint("NEXT_PUBLIC_API_QUESTIONS", "/api/Questions");
export const API_CONDITIONS = endpoint("NEXT_PUBLIC_API_CONDITIONS", "/api/Conditions");
export const API_PUBLIC_SURVEYS = endpoint(
  "NEXT_PUBLIC_API_PUBLIC_SURVEYS",
  "/api/public/surveys"
);
export const API_RESPONSES = endpoint("NEXT_PUBLIC_API_RESPONSES", "/api/Responses");
export const API_REPORTS = endpoint("NEXT_PUBLIC_API_REPORTS", "/api/Reports");
export const API_DASHBOARD = endpoint("NEXT_PUBLIC_API_DASHBOARD", "/api/Dashboard");
export const API_FAILED_SURVEYS = endpoint(
  "NEXT_PUBLIC_API_FAILED_SURVEYS",
  "/api/FailedSurveys"
);
export const API_CHATBOT =
  process.env.NEXT_PUBLIC_API_CHATBOT || `${API_BASE}/chatbot`;
export const API_PROVINCES =
  process.env.NEXT_PUBLIC_API_PROVINCES || "https://provinces.open-api.vn/api/v2";

export const apiResource = (base: string, ...parts: Array<string | number>) =>
  `${base}/${parts.map((part) => encodeURIComponent(String(part))).join("/")}`;
