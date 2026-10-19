export type StoredUser = {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") || sessionStorage.getItem("token")
  );
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as StoredUser;
    if (!o || !Array.isArray(o.permissions)) return null;
    return o;
  } catch {
    return null;
  }
}

// The API authorizes requests from JWT claims, so UI permissions must use that same token.
export function getPermissions(): string[] {
  const token = getToken();
  if (!token) return [];
  try {
    const encoded = token.split(".")[1];
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
      (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return Array.isArray(claims.permission)
      ? claims.permission.filter((value: unknown): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}
