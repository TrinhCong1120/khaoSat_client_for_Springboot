"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Mail, MessageCircle, Search, Send, Users, X } from "lucide-react";
import { API_NOTIFICATIONS } from "@/lib/api";
import { getToken, getPermissions } from "@/lib/auth";
import InboxSection from "./InboxSection";

type Channel = "EMAIL" | "TELEGRAM";
type Status = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "BOUNCED";
type Delivery = {
  id: string; source: "SYSTEM" | "MANUAL"; actorUserId: string | null; actorName: string | null;
  recipientUserId: string | null; recipientName: string | null; destination: string; channel: Channel;
  subject: string; content: string; eventType: string | null; retryOf: string | null;
  status: Status; attempts: number; createdAt: string; sentAt: string | null; bouncedAt: string | null;
  nextAttemptAt: string; errorNote: string | null;
};
type Attempt = { attemptNo: number; startedAt: string; finishedAt: string | null;
  status: string; errorNote: string | null };
type Recipient = { id: string; username: string; email: string | null; telegramChatId: number | null };
type Page = { content: Delivery[]; page: number; size: number; totalElements: number; totalPages: number };

const statusLabel: Record<Status, string> = {
  PENDING: "Chờ gửi", PROCESSING: "Đang gửi", SENT: "Kênh gửi đã nhận", FAILED: "Thất bại", BOUNCED: "Thư bị trả lại",
};
const deliveryStatus = (delivery: Delivery) => delivery.status === "SENT"
  ? delivery.channel === "EMAIL" ? "SMTP đã nhận" : "Telegram đã nhận"
  : statusLabel[delivery.status];
const date = (value?: string | null) => value
  ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value))
  : "—";
const fieldClass = "min-h-11 w-full rounded-xl border border-brand-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-brand-400 dark:focus:ring-brand-900";
const statusStyle: Record<Status, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
  PROCESSING: "bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-800",
  SENT: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
  FAILED: "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800",
  BOUNCED: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_NOTIFICATIONS}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${getToken()}`, ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Yêu cầu thất bại (${response.status})`);
  }
  return response.json();
}

export default function NotificationsPage() {
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [rows, setRows] = useState<Delivery[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<{ delivery: Delivery; attempts: Attempt[] } | null>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["EMAIL"]);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [matches, setMatches] = useState<Recipient[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setPermissions(getPermissions()), []);
  const canView = permissions?.includes("notification_view") ?? false;
  const canSend = permissions?.includes("notification_send") ?? false;
  const missingContacts = recipients.filter((recipient) =>
    (channels.includes("EMAIL") && !recipient.email) ||
    (channels.includes("TELEGRAM") && !recipient.telegramChatId));
  const canSubmit = !busy && recipients.length > 0 && channels.length > 0 &&
    !!subject.trim() && !!content.trim() && missingContacts.length === 0;

  const refresh = useCallback(async () => {
    if (!canView) return;
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (channel) params.set("channel", channel);
      if (query.trim()) params.set("q", query.trim());
      if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
      if (to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
      const result = await api<Page>(`?${params}`);
      setRows(result.content);
      setTotalPages(result.totalPages);
      setTotal(result.totalElements);
      setError("");
    } catch (cause) { setError((cause as Error).message); }
  }, [canView, page, status, channel, query, from, to]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!canSend) return;
    const timer = setTimeout(() => {
      void api<Recipient[]>(`/recipients?q=${encodeURIComponent(recipientQuery)}`)
        .then(setMatches).catch((cause) => setError((cause as Error).message));
    }, 250);
    return () => clearTimeout(timer);
  }, [canSend, recipientQuery]);

  const openDetail = async (id: string) => {
    try {
      setSelected(await api<{ delivery: Delivery; attempts: Attempt[] }>(`/${id}`));
    } catch (cause) { setError((cause as Error).message); }
  };

  const send = async () => {
    setError(""); setNotice(""); setBusy(true);
    try {
      const result = await api<{ ids: string[] }>("", {
        method: "POST",
        body: JSON.stringify({ recipientIds: recipients.map((recipient) => recipient.id), channels, subject, content }),
      });
      setNotice(`Đã xếp hàng ${result.ids.length} lượt gửi.`);
      setSubject(""); setContent(""); setRecipients([]);
      setPage(1);
      await refresh();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const retry = async (id: string) => {
    setError(""); setNotice(""); setBusy(true);
    try {
      await api(`/${id}/retry`, { method: "POST" });
      setNotice("Đã tạo lượt gửi lại.");
      setSelected(null);
      setPage(1);
      await refresh();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const toggleChannel = (value: Channel) => setChannels((current) =>
    current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const toggleRecipient = (recipient: Recipient) => setRecipients((current) =>
    current.some((item) => item.id === recipient.id)
      ? current.filter((item) => item.id !== recipient.id) : [...current, recipient]);

  return (
    <div className="space-y-7 rounded-3xl bg-brand-25 p-3 text-gray-900 sm:p-5 dark:bg-gray-950 dark:text-gray-100">
      <header className="flex items-center gap-4 px-1 py-2 sm:py-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200" aria-hidden="true"><Send size={22} strokeWidth={1.8} /></span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl dark:text-brand-100">Quản lý thông báo</h1>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Soạn tin cho tài khoản trong hệ thống và theo dõi từng lượt gửi qua email, Telegram.</p>
        </div>
      </header>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</p>}
      {notice && <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800"><Check size={18} className="mt-0.5 shrink-0" />{notice}</p>}

      {canSend && <section aria-labelledby="compose-heading" className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-20px_rgba(18,73,93,0.32)] dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50 px-5 py-5 sm:px-7 dark:border-gray-800 dark:bg-brand-950/50">
          <div><h2 id="compose-heading" className="text-xl font-semibold text-brand-950 dark:text-brand-100">Gửi thông báo</h2>
            <p className="mt-1 text-sm text-brand-800 dark:text-brand-200">Chọn người nhận, kênh gửi rồi soạn nội dung.</p></div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-200 dark:bg-gray-900 dark:text-brand-200 dark:ring-brand-800"><Users size={15} /> {recipients.length} người nhận</span>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="border-b border-brand-100 bg-brand-25/70 p-5 sm:p-7 lg:border-b-0 lg:border-r dark:border-gray-800 dark:bg-gray-900">
            <label htmlFor="recipient-search" className="mb-2 block text-sm font-semibold text-brand-950 dark:text-gray-100">Người nhận</label>
            <div className="relative"><Search size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-brand-600 dark:text-brand-300" />
              <input id="recipient-search" value={recipientQuery} onChange={(event) => setRecipientQuery(event.target.value)} placeholder="Tìm tên đăng nhập hoặc email" className={`${fieldClass} pl-10`} /></div>
            <div className="mt-3 max-h-60 overflow-y-auto rounded-xl bg-white ring-1 ring-brand-100 dark:bg-gray-950 dark:ring-gray-700">
              {matches.length ? matches.map((recipient) => {
                const checked = recipients.some((item) => item.id === recipient.id);
                return <label key={recipient.id} className="flex cursor-pointer items-start gap-3 border-b border-brand-50 px-3 py-3 transition-colors last:border-0 hover:bg-brand-50 dark:border-gray-800 dark:hover:bg-gray-800">
                  <input type="checkbox" checked={checked} onChange={() => toggleRecipient(recipient)} className="mt-1 h-4 w-4 accent-brand-700" />
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{recipient.username}</span>
                    <span className="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-400">{recipient.email || "Chưa có email"} · {recipient.telegramChatId ? "Có Telegram" : "Chưa có Telegram"}</span></span>
                </label>;
              }) : <p className="px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-400">Không tìm thấy tài khoản phù hợp.</p>}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-300">Đã chọn</p>
            {recipients.length ? <div className="mt-2 flex flex-wrap gap-2">{recipients.map((recipient) =>
              <button key={recipient.id} type="button" onClick={() => toggleRecipient(recipient)} aria-label={`Bỏ chọn ${recipient.username}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-100 px-3 text-xs font-semibold text-brand-900 transition hover:bg-brand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 dark:bg-brand-900 dark:text-brand-100 dark:hover:bg-brand-800">
                {recipient.username}<X size={13} aria-hidden="true" />
              </button>)}</div> : <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Chưa chọn tài khoản nào.</p>}
            {missingContacts.length > 0 && <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{missingContacts.map((person) => person.username).join(", ")} chưa có thông tin liên hệ cho kênh đã chọn.</p>}
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            <fieldset><legend className="mb-2 text-sm font-semibold text-brand-950 dark:text-gray-100">Kênh gửi</legend>
              <div className="grid gap-3 sm:grid-cols-2">{(["EMAIL", "TELEGRAM"] as const).map((value) => {
                const active = channels.includes(value);
                const Icon = value === "EMAIL" ? Mail : MessageCircle;
                return <label key={value} className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-xl px-4 transition-colors ring-1 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600 ${active ? "bg-brand-50 text-brand-950 ring-2 ring-brand-600 dark:bg-brand-950 dark:text-brand-100 dark:ring-brand-400" : "bg-gray-50 text-gray-700 ring-gray-200 hover:bg-brand-25 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"}`}>
                  <input type="checkbox" checked={active} onChange={() => toggleChannel(value)} className="sr-only peer" />
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${active ? "bg-brand-700 text-white" : "bg-white text-brand-700 dark:bg-gray-900 dark:text-brand-300"}`}><Icon size={20} /></span>
                  <span className="flex-1 text-sm font-semibold">{value === "EMAIL" ? "Email" : "Telegram"}</span>
                  {active && <Check size={17} aria-hidden="true" />}
                </label>;
              })}</div>
            </fieldset>
            <label className="block text-sm font-semibold text-brand-950 dark:text-gray-100">Tiêu đề
              <input value={subject} maxLength={500} onChange={(event) => setSubject(event.target.value)} placeholder="Nhập tiêu đề thông báo" className={`mt-2 ${fieldClass}`} /></label>
            <label className="block text-sm font-semibold text-brand-950 dark:text-gray-100">Nội dung
              <textarea value={content} maxLength={10000} rows={6} onChange={(event) => setContent(event.target.value)} placeholder="Viết nội dung bạn muốn gửi..." className={`mt-2 resize-y ${fieldClass}`} /></label>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand-100 pt-5 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">{recipients.length && channels.length ? `${recipients.length * channels.length} lượt gửi sẽ được tạo` : "Chọn người nhận và kênh để tiếp tục"}</p>
              <button type="button" disabled={!canSubmit} onClick={() => void send()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(18,73,93,0.8)] transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none dark:disabled:bg-gray-700 dark:disabled:text-gray-300">
                <Send size={17} /> {busy ? "Đang xếp hàng..." : "Gửi thông báo"}
              </button>
            </div>
          </div>
        </div>
      </section>}

      {canView ? <section aria-labelledby="history-heading" className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-20px_rgba(18,73,93,0.32)] dark:bg-gray-900">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-100 px-5 py-5 sm:px-7 dark:border-gray-800">
          <div><h2 id="history-heading" className="text-xl font-semibold text-brand-950 dark:text-brand-100">Lịch sử gửi</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Tra cứu trạng thái và xem lý do nếu gửi thất bại.</p></div>
          <span className="text-sm font-semibold tabular-nums text-brand-800 dark:text-brand-200">{total} lượt gửi</span>
        </div>
        <div className="grid gap-3 bg-brand-25/70 px-5 py-5 sm:grid-cols-2 sm:px-7 lg:grid-cols-5 dark:bg-gray-900">
          <label className="min-w-0 text-xs font-medium text-brand-900 sm:col-span-2 lg:col-span-1 dark:text-brand-200">Tìm kiếm<div className="relative mt-1"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-600" /><input placeholder="Người nhận, địa chỉ..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className={`${fieldClass} min-w-0 pl-10`} /></div></label>
          <label className="min-w-0 text-xs font-medium text-brand-900 dark:text-brand-200">Trạng thái<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={`mt-1 ${fieldClass} min-w-0`}><option value="">Mọi trạng thái</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="min-w-0 text-xs font-medium text-brand-900 dark:text-brand-200">Kênh<select value={channel} onChange={(event) => { setChannel(event.target.value); setPage(1); }} className={`mt-1 ${fieldClass} min-w-0`}><option value="">Mọi kênh</option><option value="EMAIL">Email</option><option value="TELEGRAM">Telegram</option></select></label>
          <label className="min-w-0 text-xs font-medium text-brand-900 dark:text-brand-200">Từ ngày<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className={`mt-1 ${fieldClass} min-w-0`} /></label>
          <label className="min-w-0 text-xs font-medium text-brand-900 dark:text-brand-200">Đến ngày<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className={`mt-1 ${fieldClass} min-w-0`} /></label>
        </div>
        <div className="overflow-x-auto" role="region" aria-label="Bảng lịch sử gửi thông báo" tabIndex={0}><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-brand-50 text-xs font-semibold uppercase tracking-wide text-brand-900 dark:bg-gray-800 dark:text-brand-200"><tr className="whitespace-nowrap">
          <th className="px-5 py-3.5">Thời gian</th><th className="px-4 py-3.5">Người gửi</th><th className="px-4 py-3.5">Người nhận</th><th className="px-4 py-3.5">Kênh</th><th className="px-4 py-3.5">Tiêu đề</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5">Lần thử</th><th className="sticky right-0 z-10 border-l border-brand-100 bg-brand-50 px-4 py-3.5 dark:border-gray-700 dark:bg-gray-800"><span className="sr-only">Chi tiết</span></th>
        </tr></thead><tbody className="divide-y divide-brand-50 dark:divide-gray-800">{rows.map((row) => <tr key={row.id} className="group whitespace-nowrap transition-colors hover:bg-brand-25 dark:hover:bg-gray-800/70">
          <td className="whitespace-nowrap px-5 py-4 text-gray-600 tabular-nums dark:text-gray-300">{date(row.createdAt)}</td>
          <td className="px-4 py-4 font-medium">{row.actorName || row.actorUserId || "Hệ thống"}</td>
          <td className="max-w-56 px-4 py-4"><span className="block truncate font-medium">{row.recipientName || row.recipientUserId || "—"}</span><small className="block truncate text-gray-600 dark:text-gray-400" title={row.destination}>{row.destination}</small></td>
          <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-brand-800 dark:text-brand-200">{row.channel === "EMAIL" ? <Mail size={15} /> : <MessageCircle size={15} />}{row.channel === "EMAIL" ? "Email" : "Telegram"}</span></td>
          <td className="max-w-52 truncate px-4 py-4" title={row.subject}>{row.subject}</td>
          <td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle[row.status]}`}>{deliveryStatus(row)}</span></td>
          <td className="px-4 py-4 tabular-nums text-gray-600 dark:text-gray-300">{row.attempts}</td>
          <td className="sticky right-0 z-10 border-l border-brand-100 bg-white px-4 py-4 group-hover:bg-brand-25 dark:border-gray-700 dark:bg-gray-900 dark:group-hover:bg-gray-800"><button type="button" onClick={() => void openDetail(row.id)} aria-label={`Xem chi tiết thông báo gửi đến ${row.destination}`} className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-brand-300 dark:hover:bg-brand-950">Xem <ChevronRight size={15} className="shrink-0" /></button></td>
        </tr>)}</tbody></table>{!rows.length && <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-brand-900 dark:text-brand-100"><Search size={25} strokeWidth={1.6} /><p className="font-semibold">Chưa có thông báo phù hợp</p><p className="text-sm text-gray-600 dark:text-gray-400">Thử đổi bộ lọc hoặc tìm bằng địa chỉ người nhận.</p></div>}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-5 py-4 text-sm sm:px-7 dark:border-gray-800"><span className="text-gray-600 tabular-nums dark:text-gray-400">Trang {page} / {Math.max(1, totalPages)}</span><div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-200 dark:ring-brand-800"><ArrowLeft size={16} /> Trước</button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-200 dark:ring-brand-800">Sau <ArrowRight size={16} /></button>
        </div></div>
      </section> : permissions !== null && !canSend && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-800">Phiên đăng nhập hiện tại chưa có quyền quản lý thông báo. Hãy đăng xuất rồi đăng nhập lại để nhận quyền mới.</p>}

      {canView && <InboxSection canSend={canSend} onOpenDelivery={(id) => void openDetail(id)} />}

      {selected && <div role="dialog" aria-modal="true" aria-label="Chi tiết thông báo" className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 p-3 sm:p-6">
        <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-brand-100 bg-brand-50 px-5 py-4 sm:px-6 dark:border-gray-800 dark:bg-brand-950"><div><h2 className="text-lg font-semibold text-brand-950 dark:text-brand-100">Chi tiết thông báo</h2><p className="mt-0.5 text-xs text-brand-800 dark:text-brand-300">Lịch sử xử lý của lượt gửi này</p></div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-900 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-brand-200 dark:hover:bg-brand-900"><X size={19} /></button></div>
          <div className="space-y-5 p-5 sm:p-6">
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${statusStyle[selected.delivery.status]}`}>{deliveryStatus(selected.delivery)}</span>
            <dl className="grid gap-x-5 gap-y-4 rounded-xl bg-brand-25 p-4 text-sm sm:grid-cols-2 dark:bg-gray-800">
              <div><dt className="text-xs font-medium text-gray-600 dark:text-gray-400">Người gửi</dt><dd className="mt-1 font-semibold">{selected.delivery.actorName || selected.delivery.actorUserId || "Hệ thống"}</dd></div>
              <div className="min-w-0"><dt className="text-xs font-medium text-gray-600 dark:text-gray-400">Người nhận</dt><dd className="mt-1 break-all font-semibold">{selected.delivery.recipientName || selected.delivery.recipientUserId || "—"} ({selected.delivery.destination})</dd></div>
              <div><dt className="text-xs font-medium text-gray-600 dark:text-gray-400">Kênh</dt><dd className="mt-1 font-semibold">{selected.delivery.channel === "EMAIL" ? "Email" : "Telegram"}</dd></div>
              <div><dt className="text-xs font-medium text-gray-600 dark:text-gray-400">Tạo lúc</dt><dd className="mt-1 font-semibold tabular-nums">{date(selected.delivery.createdAt)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-600 dark:text-gray-400">Gửi lúc</dt><dd className="mt-1 font-semibold tabular-nums">{date(selected.delivery.sentAt)}</dd></div>
              {selected.delivery.bouncedAt && <div><dt className="text-xs font-medium text-gray-600 dark:text-gray-400">Trả lại lúc</dt><dd className="mt-1 font-semibold tabular-nums">{date(selected.delivery.bouncedAt)}</dd></div>}
              {selected.delivery.status === "PENDING" && <div><dt className="text-xs font-medium text-gray-600 dark:text-gray-400">Dự kiến thử tiếp</dt><dd className="mt-1 font-semibold tabular-nums">{date(selected.delivery.nextAttemptAt)}</dd></div>}
            </dl>
            {selected.delivery.retryOf && <p className="text-xs text-gray-600 dark:text-gray-400">Gửi lại từ lượt: {selected.delivery.retryOf}</p>}
            <div><h3 className="text-base font-semibold text-brand-950 dark:text-brand-100">{selected.delivery.subject}</h3><p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-800 dark:bg-gray-800 dark:text-gray-200">{selected.delivery.content}</p></div>
            {selected.delivery.channel === "EMAIL" && selected.delivery.status === "SENT" && <p className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100"><Clock3 size={17} className="mt-0.5 shrink-0" />SMTP đã nhận thư. Nếu nhà cung cấp gửi thông báo hoàn thư, hệ thống sẽ cập nhật sau khi đọc hộp thư gửi; trạng thái này không xác nhận người nhận đã đọc thư.</p>}
            {selected.delivery.errorNote && <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-100 dark:ring-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" /><span><strong>{selected.delivery.status === "FAILED" || selected.delivery.status === "BOUNCED" ? "Lý do thất bại" : "Lỗi gần nhất"}:</strong> {selected.delivery.errorNote}</span></p>}
            <div><h3 className="text-sm font-semibold text-brand-950 dark:text-brand-100">Các lần thử</h3><ol className="mt-3 space-y-2">{selected.attempts.map((attempt) => <li key={attempt.attemptNo} className="flex gap-3 rounded-xl bg-brand-25 p-3 text-sm dark:bg-gray-800"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-900 dark:bg-brand-900 dark:text-brand-100">{attempt.attemptNo}</span><div><p className="font-medium">{date(attempt.startedAt)} · {attempt.status === "SENT" ? "SMTP/Telegram đã nhận" : attempt.status === "FAILED" ? "Thất bại" : "Đang gửi"}</p>{attempt.errorNote && <p className="mt-1 text-red-700 dark:text-red-300">{attempt.errorNote}</p>}</div></li>)}</ol></div>
            {canSend && (selected.delivery.status === "FAILED" || selected.delivery.status === "BOUNCED") && <button type="button" disabled={busy} onClick={() => void retry(selected.delivery.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:opacity-50"><Send size={16} /> Gửi lại</button>}
          </div>
        </div>
      </div>}
    </div>
  );
}
