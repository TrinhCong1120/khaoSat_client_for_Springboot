"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CornerUpLeft, Download, Mail, MessageCircle, RefreshCw, Send, X } from "lucide-react";
import { API_NOTIFICATIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Message = { id: string; channel: "EMAIL" | "TELEGRAM"; senderAddress: string;
  replyDestination: string | null; recipientAddress: string; senderUserId: string | null; matchedDeliveryId: string | null;
  subject: string | null; content: string; kind: "MESSAGE" | "BOUNCE" | "COMMAND";
  handlingStatus: "NEW" | "RESOLVED"; receivedAt: string };
type Attachment = { id: string; fileName: string; contentType: string | null;
  sizeBytes: number | null; status: "STORED" | "OVERSIZE" | "FAILED"; errorNote: string | null };
type Conversation = { direction: "IN" | "OUT"; id: string; content: string;
  subject: string | null; status: string; at: string; errorNote: string | null };
type Detail = { message: Message; attachments: Attachment[]; conversation: Conversation[] };
type Page = { content: Message[]; page: number; totalElements: number; totalPages: number };
const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const input = "min-h-10 rounded-xl border border-brand-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-40";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const result = await fetch(`${API_NOTIFICATIONS}/inbox${path}`, {
    ...init, headers: { Authorization: `Bearer ${getToken()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (!result.ok) {
    const data = await result.json().catch(() => null);
    throw new Error(data?.message || `Yêu cầu thất bại (${result.status})`);
  }
  if (result.status === 204) return undefined as T;
  return result.json();
}

export default function InboxSection({ canSend, onOpenDelivery }: {
  canSend: boolean; onOpenDelivery: (id: string) => void
}) {
  const [rows, setRows] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Detail | null>(null);
  const [subject, setSubject] = useState("");
  const [reply, setReply] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedMessageRef = useRef<HTMLLIElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { selectedMessageRef.current?.scrollIntoView({ block: "nearest" }); }, [selected?.message.id]);
  useEffect(() => { if (replyingTo) replyInputRef.current?.focus(); }, [replyingTo]);

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (channel) params.set("channel", channel);
      if (status) params.set("status", status);
      if (query) params.set("q", query);
      const result = await request<Page>(`?${params}`);
      setRows(result.content); setTotal(result.totalElements); setPages(result.totalPages);
      setError("");
    } catch (cause) { setError((cause as Error).message); }
  }, [page, channel, status, query]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  const open = async (id: string, compose = false) => {
    try {
      const detail = await request<Detail>(`/${id}`);
      setSelected(detail); setSubject(compose ? `Re: ${detail.message.subject?.replace(/^Re:\s*/i, "") || "Thông báo"}` : "");
      setReply(""); setConfirmed(false); setReplyingTo(compose ? id : null);
      setError("");
    } catch (cause) { setError((cause as Error).message); }
  };
  const act = async (path: string, method: string, body: unknown, message: string) => {
    if (!selected) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      await request(path, { method, body: JSON.stringify(body) });
      setNotice(message);
      setSelected(await request<Detail>(`/${selected.message.id}`)); await refresh();
      return true;
    } catch (cause) { setError((cause as Error).message); return false; }
    finally { setBusy(false); }
  };
  const download = async (attachment: Attachment) => {
    if (!selected) return;
    try {
      const result = await fetch(`${API_NOTIFICATIONS}/inbox/${selected.message.id}/attachments/${attachment.id}`,
        { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!result.ok) throw new Error(`Không tải được tệp (${result.status})`);
      const url = URL.createObjectURL(await result.blob());
      const link = document.createElement("a"); link.href = url; link.download = attachment.fileName;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (cause) { setError((cause as Error).message); }
  };
  const timeline = selected ? [...selected.conversation] : [];
  if (selected && !timeline.some((item) => item.id === selected.message.id)) {
    timeline.push({ direction: "IN", id: selected.message.id, content: selected.message.content,
      subject: selected.message.subject, status: selected.message.handlingStatus,
      at: selected.message.receivedAt, errorNote: null });
  }
  timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return <section aria-labelledby="inbox-heading" className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-20px_rgba(18,73,93,0.32)] dark:bg-gray-900">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50 px-5 py-5 sm:px-7 dark:border-gray-800 dark:bg-brand-950/50">
      <div><h2 id="inbox-heading" className="text-xl font-semibold text-brand-950 dark:text-brand-100">Hộp thư phản hồi</h2>
        <p className="mt-1 text-sm text-brand-800 dark:text-brand-200">Email và tin nhắn Telegram nhận được · {total} cuộc trò chuyện</p></div>
      <button type="button" onClick={() => void refresh()} className={`${button} bg-white text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100 dark:bg-gray-900 dark:text-brand-200 dark:ring-brand-800`}><RefreshCw size={16} /> Làm mới</button>
    </div>
    <form onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); }} className="grid gap-3 border-b border-brand-100 bg-brand-25/70 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:px-7 dark:border-gray-800 dark:bg-gray-900">
      <input aria-label="Tìm người gửi hoặc tiêu đề" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Người gửi hoặc tiêu đề" className={`${input} w-full`} />
      <select aria-label="Kênh phản hồi" value={channel} onChange={(event) => { setChannel(event.target.value); setPage(1); }} className={input}><option value="">Mọi kênh</option><option value="EMAIL">Email</option><option value="TELEGRAM">Telegram</option></select>
      <select aria-label="Trạng thái xử lý" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={input}><option value="">Mọi trạng thái</option><option value="NEW">Mới</option><option value="RESOLVED">Đã xử lý</option></select>
      <button type="submit" className={`${button} bg-brand-700 text-white hover:bg-brand-800`}>Tìm</button>
    </form>
    {error && <p role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {notice && <p role="status" className="mx-5 mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{notice}</p>}
    <div className="divide-y divide-brand-50 dark:divide-gray-800">{rows.map((row) => <button key={row.id} type="button" onClick={() => void open(row.id)} className="grid w-full gap-2 px-5 py-4 text-left text-sm hover:bg-brand-25 sm:grid-cols-[10rem_minmax(0,1fr)_6rem] sm:items-center sm:px-7 dark:hover:bg-gray-800">
      <time className="whitespace-nowrap text-gray-600 dark:text-gray-400">{date(row.receivedAt)}</time>
      <span className="min-w-0"><span className="flex items-center gap-2 font-semibold">{row.channel === "EMAIL" ? <Mail size={16} /> : <MessageCircle size={16} />}<span className="truncate">{row.senderAddress}</span></span><span className="mt-1 block truncate text-gray-600 dark:text-gray-300">{row.subject || row.content || "Tệp đính kèm"}</span></span>
      <span className={`whitespace-nowrap rounded-full px-2 py-1 text-center text-xs font-semibold ${row.handlingStatus === "NEW" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{row.handlingStatus === "NEW" ? "Mới" : "Đã xử lý"}</span>
    </button>)}{rows.length === 0 && <p className="px-5 py-10 text-center text-sm text-gray-600 dark:text-gray-400">Chưa có tin đến phù hợp.</p>}</div>
    <div className="flex items-center justify-between border-t border-brand-100 px-5 py-4 text-sm sm:px-7 dark:border-gray-800"><span>Trang {page} / {Math.max(1, pages)}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={`${button} text-brand-800 ring-1 ring-brand-200 dark:text-brand-200`}><ArrowLeft size={16} /> Trước</button><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className={`${button} text-brand-800 ring-1 ring-brand-200 dark:text-brand-200`}>Sau <ArrowRight size={16} /></button></div></div>

    {selected && <div role="dialog" aria-modal="true" aria-label="Cuộc trò chuyện" className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 p-2 sm:p-6"><div className="flex h-[min(92vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-100 px-5 py-4 dark:border-gray-800"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">{selected.message.channel === "EMAIL" ? <Mail size={19} /> : <MessageCircle size={19} />}</span><div className="min-w-0"><h3 className="truncate text-base font-semibold text-brand-950 dark:text-brand-100">{selected.message.senderAddress}</h3><p className="truncate text-xs text-gray-600 dark:text-gray-300">{selected.message.channel === "EMAIL" ? "Email" : "Telegram"} · {selected.message.handlingStatus === "NEW" ? "Mới" : "Đã xử lý"} · {timeline.length} tin</p></div></div><div className="flex shrink-0 items-center gap-1">{canSend && <button type="button" disabled={busy} onClick={() => void act(`/${selected.message.id}/status`, "PATCH", { status: selected.message.handlingStatus === "NEW" ? "RESOLVED" : "NEW" }, "Đã cập nhật trạng thái.")} className="rounded-lg px-2 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-gray-800">{selected.message.handlingStatus === "NEW" ? "Đánh dấu đã xử lý" : "Đánh dấu mới"}</button>}<button type="button" aria-label="Đóng" onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-brand-50 dark:hover:bg-gray-800"><X size={20} /></button></div></div>
      {(error || notice) && <div className="shrink-0 px-4 pt-3 text-sm">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{notice}</p>}</div>}
      <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-brand-25/70 px-3 py-5 text-sm sm:px-6 dark:bg-gray-950">
            {timeline.map((item) => {
              const outgoing = item.direction === "OUT";
              const title = item.subject?.trim() || (selected.message.channel === "EMAIL" ? "Email không tiêu đề" : "Tin nhắn Telegram");
              return <li key={`${item.direction}-${item.id}`} ref={item.id === selected.message.id ? selectedMessageRef : undefined} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                <article className={`w-fit min-w-0 max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[76%] ${outgoing
                  ? "rounded-br-md bg-brand-700 text-white"
                  : "rounded-bl-md border border-brand-100 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"}`}>
                  <p className={`text-xs font-medium ${outgoing ? "text-brand-100" : "text-brand-700 dark:text-brand-300"}`}>
                    {outgoing ? "Admin / Hệ thống" : selected.message.senderAddress}
                  </p>
                  <h5 className="mt-1 break-words text-sm font-semibold">{title}</h5>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{item.content || "Không có nội dung văn bản"}</p>
                  {item.id === selected.message.id && selected.attachments.length > 0 && <ul className="mt-3 space-y-2 border-t border-brand-100 pt-3 dark:border-gray-700">{selected.attachments.map((file) =>
                    <li key={file.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="min-w-0 break-all">{file.fileName} · {file.sizeBytes == null ? "?" : Math.ceil(file.sizeBytes / 1024) + " KB"}</span>
                      {file.status === "STORED" ? <button type="button" onClick={() => void download(file)} className="inline-flex items-center gap-1 font-semibold text-brand-700 underline dark:text-brand-300"><Download size={13} /> Tải</button>
                        : <span className="text-red-700 dark:text-red-300">{file.errorNote || file.status}</span>}
                    </li>)}</ul>}
                  {item.errorNote && <p className={`mt-2 text-xs ${outgoing ? "text-red-100" : "text-red-700 dark:text-red-300"}`}>{item.errorNote}</p>}
                  <div className={`mt-3 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[11px] ${outgoing ? "text-brand-100" : "text-gray-500 dark:text-gray-400"}`}>
                    <time dateTime={item.at}>{date(item.at)}</time><span>· {item.status}</span>
                  </div>
                  {outgoing && <button type="button" onClick={() => onOpenDelivery(item.id)} className="mt-2 text-xs font-semibold text-white underline underline-offset-2">Xem các lần thử</button>}
                  {!outgoing && canSend && (item.id !== selected.message.id || selected.message.kind !== "BOUNCE") && <button type="button" disabled={busy} onClick={() => { if (item.id === selected.message.id) { setReplyingTo(item.id); setSubject(`Re: ${item.subject?.replace(/^Re:\s*/i, "") || "Thông báo"}`); } else void open(item.id, true); }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"><CornerUpLeft size={14} /> Trả lời</button>}
                </article>
              </li>;
            })}
      </ol>
      {canSend && <div className="shrink-0 border-t border-brand-100 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900 sm:px-6">
        {selected.message.kind !== "BOUNCE" ? <form onSubmit={(event) => { event.preventDefault(); void act(`/${selected.message.id}/${replyingTo ? "reply" : "send"}`, "POST", { subject, content: reply, confirmedDestination: selected.message.replyDestination || selected.message.senderAddress }, "Đã xếp hàng gửi tin.").then((sent) => { if (sent) { setSubject(""); setReply(""); setConfirmed(false); setReplyingTo(null); } }); }} className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs"><p className="min-w-0 truncate text-gray-600 dark:text-gray-300">{replyingTo ? "Trả lời" : "Gửi tin mới"} tới <strong className="text-brand-900 dark:text-brand-100">{selected.message.replyDestination || selected.message.senderAddress}</strong></p>{replyingTo && <button type="button" onClick={() => { setReplyingTo(null); setSubject(""); }} className="shrink-0 text-brand-700 hover:underline dark:text-brand-300">Bỏ trả lời</button>}</div>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={500} placeholder="Nhập tiêu đề" aria-label="Tiêu đề" className={`${input} w-full`} />
          <div className="flex items-end gap-2"><textarea ref={replyInputRef} value={reply} onChange={(event) => setReply(event.target.value)} rows={2} maxLength={10000} placeholder="Nhập nội dung..." aria-label="Nội dung" className={`${input} max-h-32 min-h-12 min-w-0 flex-1 resize-y py-3`} /><button type="submit" aria-label={replyingTo ? "Gửi trả lời" : "Gửi tin"} title={replyingTo ? "Gửi trả lời" : "Gửi tin"} disabled={busy || !confirmed || !subject.trim() || !reply.trim()} className={`${button} size-12 shrink-0 bg-brand-700 p-0 text-white hover:bg-brand-800`}><Send size={18} /></button></div>
          <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5" /> Tôi đã kiểm tra địa chỉ hoặc Chat ID nhận ở trên</label>
        </form> : <p className="text-xs text-gray-500 dark:text-gray-400">Không thể gửi tin tới địa chỉ thư hoàn lại.</p>}
      </div>}
      </div></div>}
  </section>;
}
