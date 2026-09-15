export type StoredUser = {
  id: number;
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
