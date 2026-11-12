export type StoredUser = {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
};

export function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const encoded = parts[1];
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
      (char) => char.charCodeAt(0)
    );
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof claims.exp === "number") {
      // exp is in seconds, Date.now() is in ms
      return Date.now() >= claims.exp * 1000;
    }
    return false;
  } catch {
    return true;
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!raw || raw === "undefined" || raw === "null" || !raw.trim()) {
    clearAuth();
    return false;
  }
  if (isTokenExpired(raw)) {
    clearAuth();
    return false;
  }
  return true;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token || token === "undefined" || token === "null" || !token.trim()) {
    return null;
  }
  if (isTokenExpired(token)) {
    clearAuth();
    return null;
  }
  return token;
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

export function getRoles(): string[] {
  const token = getToken();
  if (!token) return [];
  try {
    const encoded = token.split(".")[1];
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
      (char) => char.charCodeAt(0)
    );
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    if (Array.isArray(claims.role)) {
      return claims.role.filter((r: unknown): r is string => typeof r === "string");
    }
    if (typeof claims.role === "string") {
      return [claims.role];
    }
    return [];
  } catch {
    return [];
  }
}

export function isUserAdmin(): boolean {
  // 1. Direct role check from signed JWT token claims
  const tokenRoles = getRoles().map((r) => r.toLowerCase());
  if (tokenRoles.includes("admin") || tokenRoles.includes("superadmin")) return true;

  // 2. Stored user object check (if available in localStorage)
  const user = getUser();
  if (user) {
    const userRoles = user.roles?.map((r) => r.toLowerCase()) ?? [];
    if (userRoles.includes("admin") || userRoles.includes("superadmin")) return true;
  }

  // 3. Permission claim check
  const permissions = getPermissions();
  return permissions.includes("survey_view_all") || permissions.includes("user_view");
}

export function hasPermission(code: string): boolean {
  return getPermissions().includes(code);
}
