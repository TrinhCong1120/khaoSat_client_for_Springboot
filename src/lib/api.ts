const rawConfiguredApiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");

/**
 * Tự động phân giải URL gốc của API:
 * 1. Khi chạy trong trình duyệt:
 *    - Nếu đang chạy qua ngrok, mạng LAN, hoặc bất kỳ domain ngoài nào (hostname !== "localhost" và !== "127.0.0.1"),
 *      hệ thống tự động sử dụng đường dẫn tương đối để đi thẳng qua domain hiện tại, không bao giờ bị kẹt ở "localhost".
 *    - Nếu NEXT_PUBLIC_API_URL rỗng: tự động sử dụng đường dẫn tương đối `/api/...`.
 * 2. Khi chạy trên localhost / SSR:
 *    - Mặc định sử dụng đường dẫn tương đối (qua Nginx cổng 80 hoặc Next.js rewrites cổng 3000).
 */
export function getResolvedApiBase(): string {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    // Bất cứ khi nào chạy trên ngrok, tên miền ngoài, hoặc IP LAN:
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      // Nếu cấu hình .env cũ bị dính localhost, tự động bỏ qua để dùng relative path đi thẳng qua domain hiện tại
      if (!rawConfiguredApiBase || rawConfiguredApiBase.includes("localhost") || rawConfiguredApiBase.includes("127.0.0.1")) {
        return "";
      }
      try {
        const parsed = new URL(rawConfiguredApiBase, window.location.origin);
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
          return "";
        }
      } catch {
        return "";
      }
    }
  }

  // Nếu cấu hình rỗng, dùng relative path
  if (!rawConfiguredApiBase) {
    return "";
  }

  return rawConfiguredApiBase.replace(/\/api$/i, "");
}

export const API_BASE = getResolvedApiBase();

const endpoint = (name: string, fallback: string) => {
  const envVal = process.env[name];
  if (envVal && envVal.trim()) {
    if (typeof window !== "undefined") {
      const { hostname } = window.location;
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        if (envVal.includes("localhost") || envVal.includes("127.0.0.1")) {
          return fallback;
        }
      }
    }
    return envVal.trim();
  }
  const base = getResolvedApiBase();
  return base ? `${base}${fallback}` : fallback;
};

export const API_AUTH = endpoint("NEXT_PUBLIC_API_AUTH", "/api/Auth");
export const API_USERS = endpoint("NEXT_PUBLIC_API_USERS", "/api/Users");
export const API_ROLES = endpoint("NEXT_PUBLIC_API_ROLES", "/api/Roles");
export const API_MENUS = endpoint("NEXT_PUBLIC_API_MENUS", "/api/Menus");
export const API_FUNCTIONS = endpoint("NEXT_PUBLIC_API_FUNCTIONS", "/api/Functions");
export const API_NOTIFICATIONS = endpoint("NEXT_PUBLIC_API_NOTIFICATIONS", "/api/notifications");
export const API_SURVEYS = endpoint("NEXT_PUBLIC_API_SURVEYS", "/api/Surveys");
export const API_GROUPS = endpoint("NEXT_PUBLIC_API_GROUPS", "/api/Groups");
export const API_PAGES = endpoint("NEXT_PUBLIC_API_PAGES", "/api/Pages");
export const API_QUESTIONS = endpoint("NEXT_PUBLIC_API_QUESTIONS", "/api/Questions");
export const API_MEDIA = endpoint("NEXT_PUBLIC_API_MEDIA", "/api/Media");
export const API_VALIDATION_RULE_CATALOG = endpoint(
  "NEXT_PUBLIC_API_VALIDATION_RULE_CATALOG",
  "/api/ValidationRules/catalog"
);
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
export const API_GOOGLE_INTEGRATIONS = endpoint(
  "NEXT_PUBLIC_API_GOOGLE_INTEGRATIONS",
  "/api/integrations/google"
);
export const API_GOOGLE_SURVEYS_ROOT = `${API_SURVEYS}/google`;
export const API_GOOGLE_SURVEY = (surveyId: string) =>
  `${API_SURVEYS}/${encodeURIComponent(surveyId)}/google`;

export const API_CHATBOT =
  process.env.NEXT_PUBLIC_API_CHATBOT || `${getResolvedApiBase()}/chatbot`;
export const API_PROVINCES =
  process.env.NEXT_PUBLIC_API_PROVINCES || "https://provinces.open-api.vn/api/v2";

export const apiResource = (base: string, ...parts: Array<string | number>) =>
  `${base}/${parts.map((part) => encodeURIComponent(String(part))).join("/")}`;
