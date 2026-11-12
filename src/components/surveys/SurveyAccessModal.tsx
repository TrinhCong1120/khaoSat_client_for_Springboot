"use client";

import { useCallback, useEffect, useState } from "react";
import { API_SURVEYS } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Survey = { id: string; title: string; canManageAccess: boolean };
type Access = { userId: string; username: string; email?: string | null; permissions: string[] };
type User = { id: string; username: string; email?: string | null };
const rights = ["VIEW", "EDIT", "VIEW_RESPONSES", "EXPORT_DATA", "MANAGE_PUBLICATION", "DELETE", "MANAGE_ACCESS"] as const;
const labels: Record<string, string> = { VIEW: "Xem khảo sát", EDIT: "Sửa nội dung", VIEW_RESPONSES: "Xem phản hồi/báo cáo", EXPORT_DATA: "Xuất dữ liệu", MANAGE_PUBLICATION: "Xuất bản/khóa", DELETE: "Xóa khảo sát", MANAGE_ACCESS: "Thêm người và cấp quyền" };

export default function SurveyAccessModal({ survey, onClose, onChanged }: { survey: Survey; onClose: () => void; onChanged: () => void }) {
  const [access, setAccess] = useState<Access[]>([]);
  const [found, setFound] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [allowed, setAllowed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const headers = useCallback(() => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" }), []);
  const load = useCallback(async () => {
    const [response, effective] = await Promise.all([
      fetch(`${API_SURVEYS}/${survey.id}/access`, { headers: headers() }),
      fetch(`${API_SURVEYS}/${survey.id}/access/effective`, { headers: headers() }),
    ]);
    if (!response.ok) throw new Error("Không tải được quyền khảo sát.");
    if (!effective.ok) throw new Error("Không tải được quyền hiện có.");
    const rows = await response.json() as Access[];
    setAllowed(await effective.json() as string[]);
    setAccess(rows);
    setDraft(Object.fromEntries(rows.map((row) => [row.userId, row.permissions])));
  }, [headers, survey.id]);
  useEffect(() => { void load().catch((cause) => setError(String(cause))); }, [load]);

  const search = async () => {
    if (!query.trim()) return;
    setError("");
    const response = await fetch(`${API_SURVEYS}/${survey.id}/access/users/search?q=${encodeURIComponent(query.trim())}`, { headers: headers() });
    if (!response.ok) return setError("Không tìm được tài khoản.");
    setFound(await response.json() as User[]);
  };
  const save = async (userId: string, remove = false) => {
    setBusy(true); setError("");
    try {
      const chosen = draft[userId] ?? [];
      const response = await fetch(`${API_SURVEYS}/${survey.id}/access/${userId}`, {
        method: remove ? "DELETE" : "PUT", headers: headers(),
        body: remove ? undefined : JSON.stringify({ permissions: chosen }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || `Không lưu được quyền (${response.status}).`);
      await load(); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được quyền."); }
    finally { setBusy(false); }
  };
  const candidates = [...access.map((row) => ({ id: row.userId, username: row.username, email: row.email })),
    ...found.filter((user) => !access.some((row) => row.userId === user.id))];

  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="access-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
      <div className="flex justify-between gap-4"><div><h2 id="access-title" className="text-lg font-semibold">Quyền khảo sát: {survey.title}</h2><p className="text-xs text-gray-500">Quyền cấp tại đây hoạt động độc lập với group.</p></div><button onClick={onClose} aria-label="Đóng" className="self-start text-xl">×</button></div>
      {error && <p role="alert" className="my-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="my-4 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search(); }} placeholder="Username hoặc email chính xác" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm dark:bg-gray-950" /><button onClick={() => void search()} className="rounded-lg border px-3 py-2 text-sm">Tìm</button></div>
      <div className="space-y-3">{candidates.map((user) => <div key={user.id} className="rounded-xl border p-4"><div className="mb-3"><p className="font-medium">{user.username}</p>{user.email && <p className="text-xs text-gray-500">{user.email}</p>}</div><div className="grid gap-2 sm:grid-cols-2">{rights.map((right) => <label key={right} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(draft[user.id] ?? []).includes(right)} disabled={!allowed.includes(right)} onChange={(event) => setDraft((old) => ({ ...old, [user.id]: event.target.checked ? [...(old[user.id] ?? []), right] : (old[user.id] ?? []).filter((value) => value !== right) }))} />{labels[right]}</label>)}</div><div className="mt-4 flex gap-2"><button disabled={busy || !(draft[user.id] ?? []).length} onClick={() => void save(user.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white disabled:opacity-40">Lưu quyền</button>{access.some((row) => row.userId === user.id) && <button disabled={busy || (draft[user.id] ?? []).some((right) => !allowed.includes(right))} onClick={() => void save(user.id, true)} className="rounded-lg border px-3 py-2 text-xs text-red-600">Thu hồi</button>}</div></div>)}</div>
    </section>
  </div>;
}
