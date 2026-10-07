"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiKey, FiRefreshCw, FiSearch, FiUserCheck, FiX } from "react-icons/fi";
import { API_SURVEYS, API_USERS } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiError";
import { getToken, getUser } from "@/lib/auth";
import SurveyNameConfirmationModal from "@/components/surveys/SurveyNameConfirmationModal";

type Survey = { id: string; title: string; creatorUser?: string | null; creatorUserId?: string | null };
type User = { id: string; username: string; email?: string | null };
type Access = { userId: string; username?: string | null; email?: string | null; permissions: string[] };
type AccessLevel = "" | "VIEW" | "EDIT";

export default function SurveyAccessModal({ survey, onClose, onChanged }: { survey: Survey; onClose: () => void; onChanged: () => void }) {
  const currentUser = getUser();
  const canTransferOwner = Boolean(currentUser && (
    currentUser.permissions.includes("survey_update_all") ||
    String(currentUser.id) === String(survey.creatorUserId)
  ));
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [access, setAccess] = useState<Access[]>([]);
  const [levels, setLevels] = useState<Record<string, AccessLevel>>({});
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [ownerCandidate, setOwnerCandidate] = useState<User | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return setError("Phiên đăng nhập đã hết hạn.");
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const accessResponse = await fetch(`${API_SURVEYS}/${survey.id}/access`, { headers });
      if (!accessResponse.ok) {
        const body = await accessResponse.json().catch(() => null);
        throw new Error(getApiErrorMessage(body, `Không tải được quyền truy cập (${accessResponse.status})`));
      }
      const accessData = await accessResponse.json();
      const nextAccess = Array.isArray(accessData) ? accessData : [];
      setAccess(nextAccess);
      setLevels(Object.fromEntries(nextAccess.map((item: Access) => [String(item.userId), item.permissions?.includes("EDIT") ? "EDIT" : "VIEW"])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được quyền truy cập.");
    } finally {
      setLoading(false);
    }
  }, [survey.id]);

  useEffect(() => { void load(); }, [load]);

  const candidates = useMemo(() => {
    const byId = new Map<string, User>();
    access.forEach((item) => byId.set(String(item.userId), {
      id: String(item.userId),
      username: item.username || String(item.userId),
      email: item.email || null,
    }));
    searchResults.forEach((user) => {
      if (String(user.id) !== String(survey.creatorUserId)) byId.set(String(user.id), user);
    });
    return Array.from(byId.values());
  }, [access, searchResults, survey.creatorUserId]);

  const searchUsers = async (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q || q.length > 255) {
      setError("Nhập đầy đủ username hoặc email, từ 1 đến 255 ký tự.");
      return;
    }
    const token = getToken();
    if (!token) return setError("Phiên đăng nhập đã hết hạn.");
    setSearching(true);
    setError("");
    try {
      const response = await fetch(`${API_USERS}/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getApiErrorMessage(body, `Không tìm được người dùng (${response.status})`));
      setSearchResults((Array.isArray(body) ? body : []).map((user: User) => ({
        id: String(user.id),
        username: String(user.username),
        email: user.email ? String(user.email) : null,
      })));
    } catch (searchError) {
      setSearchResults([]);
      setError(searchError instanceof Error ? searchError.message : "Không tìm được người dùng.");
    } finally {
      setSearching(false);
    }
  };

  const saveAccess = async (userId: string) => {
    const token = getToken();
    if (!token) return setError("Phiên đăng nhập đã hết hạn.");
    const level = levels[userId] || "";
    setBusyUserId(userId);
    setError("");
    try {
      const response = await fetch(`${API_SURVEYS}/${survey.id}/access/${userId}`, {
        method: level ? "PUT" : "DELETE",
        headers: { Authorization: `Bearer ${token}`, ...(level ? { "Content-Type": "application/json" } : {}) },
        ...(level ? { body: JSON.stringify({ permissions: [level] }) } : {}),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(body, `Không cập nhật được quyền (${response.status})`));
      }
      const responseAccess = level ? await response.json().catch(() => null) : null;
      setAccess((current) => level
        ? [...current.filter((item) => String(item.userId) !== userId), {
            userId,
            username: responseAccess?.username || searchResults.find((user) => user.id === userId)?.username || null,
            email: responseAccess?.email || searchResults.find((user) => user.id === userId)?.email || null,
            permissions: Array.isArray(responseAccess?.permissions)
              ? responseAccess.permissions
              : level === "EDIT" ? ["VIEW", "EDIT"] : ["VIEW"],
          }]
        : current.filter((item) => String(item.userId) !== userId));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không cập nhật được quyền.");
    } finally {
      setBusyUserId(null);
    }
  };

  const transferOwner = async (user: User) => {
    const token = getToken();
    if (!token) return setError("Phiên đăng nhập đã hết hạn.");
    setBusyUserId(user.id);
    setError("");
    try {
      const response = await fetch(`${API_SURVEYS}/${survey.id}/owner`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(body, `Không chuyển được chủ sở hữu (${response.status})`));
      }
      setOwnerCandidate(null);
      onChanged();
      onClose();
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : "Không chuyển được chủ sở hữu.");
    } finally {
      setBusyUserId(null);
    }
  };

  return <>
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="access-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400"><FiKey /><span className="text-sm font-semibold">Quyền truy cập khảo sát</span></div>
            <h2 id="access-title" className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white">{survey.title}</h2>
            <p className="mt-1 text-xs text-gray-500">Chủ sở hữu: {survey.creatorUser || "Không xác định"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"><FiX size={20} /></button>
        </header>
        <div className="overflow-y-auto p-5">
          {error && <p role="alert" className="mb-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900 dark:bg-error-950/30 dark:text-error-300">{error}</p>}
          <form onSubmit={searchUsers} className="mb-2 flex gap-2">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Tìm người dùng</span>
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} maxLength={255} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập đầy đủ username hoặc email…" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950" />
            </label>
            <button type="submit" disabled={searching || !query.trim()} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">{searching ? "Đang tìm…" : "Tìm"}</button>
          </form>
          <p className="mb-4 text-xs text-gray-500">API chỉ trả kết quả khi username hoặc email khớp toàn bộ.</p>
          {access.length > 0 && <p className="mb-2 text-xs font-semibold text-gray-500">Đang có quyền: {access.length} người</p>}
          {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500"><FiRefreshCw className="animate-spin" /> Đang tải quyền truy cập…</div> : candidates.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">Nhập đầy đủ username hoặc email để tìm người dùng.</p> : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              {candidates.map((user) => {
                const saved = access.find((item) => String(item.userId) === String(user.id));
                const savedLevel: AccessLevel = saved?.permissions.includes("EDIT") ? "EDIT" : saved ? "VIEW" : "";
                const level = levels[user.id] || "";
                return <div key={user.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-center">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{user.username}</p>{user.email && <p className="truncate text-xs text-gray-500">{user.email}</p>}</div>
                  <select aria-label={`Quyền của ${user.username}`} value={level} onChange={(event) => setLevels((current) => ({ ...current, [user.id]: event.target.value as AccessLevel }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"><option value="">Không có quyền</option><option value="VIEW">Chỉ xem</option><option value="EDIT">Có thể sửa</option></select>
                  <div className="flex justify-end gap-2">
                    {canTransferOwner && <button type="button" onClick={() => { setError(""); setOwnerCandidate(user); }} disabled={busyUserId != null} title="Chuyển chủ sở hữu" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700"><FiUserCheck /></button>}
                    <button type="button" onClick={() => void saveAccess(user.id)} disabled={level === savedLevel || busyUserId != null} className="min-w-16 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40">{busyUserId === user.id ? "Đang lưu" : "Lưu"}</button>
                  </div>
                </div>;
              })}
            </div>
          )}
        </div>
      </section>
    </div>
    {ownerCandidate && (
      <SurveyNameConfirmationModal
        heading="Xác nhận chuyển chủ sở hữu"
        actionText={`chuyển quyền sở hữu cho ${ownerCandidate.username}`}
        surveyTitle={survey.title}
        confirmLabel="Chuyển quyền sở hữu"
        busy={busyUserId === ownerCandidate.id}
        error={error}
        onCancel={() => { setOwnerCandidate(null); setError(""); }}
        onConfirm={() => transferOwner(ownerCandidate)}
      />
    )}
  </>;
}
