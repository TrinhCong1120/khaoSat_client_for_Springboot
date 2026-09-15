/** ASP.NET Core có thể trả về chuỗi JSON thuần, ProblemDetails (detail/title), hoặc { message } */
export function getApiErrorMessage(data: unknown, fallback: string): string {
  if (data == null || data === "") return fallback;
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    if (typeof o.detail === "string" && o.detail.trim()) return o.detail;
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (typeof o.title === "string" && o.title.trim()) {
      const t = o.title.trim();
      if (t !== "Bad Request" && t !== "Unauthorized") return t;
    }
    const errs = o.errors;
    if (errs && typeof errs === "object") {
      const parts = Object.values(errs as Record<string, string[]>)
        .flat()
        .filter((x): x is string => typeof x === "string");
      if (parts.length) return parts.join("; ");
    }
    if (typeof o.title === "string") return o.title;
  }
  return fallback;
}
