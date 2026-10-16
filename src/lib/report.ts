export function parseLegacyUtc(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLegacyUtc(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  const date = parseLegacyUtc(value);
  return date
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
        ...options,
      }).format(date)
    : "—";
}

export function formatApiInstant(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
}

export function formatSurveyLocal(value?: string | null) {
  if (!value) return "—";
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}+07:00`);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export function getApiError(status: number) {
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Bạn chưa có quyền xem kết quả khảo sát này.";
  if (status === 404) return "Không tìm thấy dữ liệu khảo sát.";
  return `Không thể tải dữ liệu (HTTP ${status}).`;
}

export function localDayBoundary(value: string, end = false) {
  if (!value) return undefined;
  return `${value}T${end ? "23:59:59" : "00:00:00"}`;
}
