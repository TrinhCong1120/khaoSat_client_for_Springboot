import { getToken } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/apiError";

export type ApiKeyListItem = {
  id: number;
  name: string;
  prefix: string;
  isActive: boolean;
  revoked: boolean;
  lastUsedAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: number;
};

function pickId(row: Record<string, unknown>): number {
  const v = row.id ?? row.Id;
  return typeof v === "number" ? v : Number(v);
}

function pickStr(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}

function pickBool(row: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

export function normalizeApiKeyRow(row: Record<string, unknown>): ApiKeyListItem {
  return {
    id: pickId(row),
    name: pickStr(row, "name", "Name") ?? "",
    prefix: pickStr(row, "prefix", "Prefix") ?? "",
    isActive: pickBool(row, "isActive", "IsActive") ?? true,
    revoked: pickBool(row, "revoked", "Revoked") ?? false,
    lastUsedAt:
      (pickStr(row, "lastUsedAt", "LastUsedAt") as string | null) ?? null,
    expiredAt:
      (pickStr(row, "expiredAt", "ExpiredAt") as string | null) ?? null,
    createdAt: pickStr(row, "createdAt", "CreatedAt") ?? "",
    updatedAt: pickStr(row, "updatedAt", "UpdatedAt") ?? "",
    userId: (() => {
      const u = row.userId ?? row.UserId;
      return typeof u === "number" ? u : u != null ? Number(u) : undefined;
    })(),
  };
}

export async function parseJsonRes(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function apikeysRedirect401(): void {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  window.location.href = "/signin";
}

export function apikeysAuthHeadersJson(): HeadersInit {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

export function apikeysErrorMessage(data: unknown, fallback: string): string {
  return getApiErrorMessage(data, fallback);
}
