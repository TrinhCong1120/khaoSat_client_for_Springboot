"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  CornerUpLeft,
  Download,
  FileText,
  Mail,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { API_NOTIFICATIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Message = {
  id: string;
  channel: "EMAIL" | "TELEGRAM" | "ZALO";
  senderAddress: string;
  replyDestination: string | null;
  recipientAddress: string;
  senderUserId: string | null;
  matchedDeliveryId: string | null;
  subject: string | null;
  content: string;
  kind: "MESSAGE" | "BOUNCE" | "COMMAND";
  handlingStatus: "NEW" | "RESOLVED";
  receivedAt: string;
};
type Attachment = {
  id: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  status: "STORED" | "OVERSIZE" | "FAILED";
  errorNote: string | null;
};
type Conversation = {
  direction: "IN" | "OUT";
  id: string;
  content: string;
  subject: string | null;
  status: string;
  at: string;
  errorNote: string | null;
};
type Detail = {
  message: Message;
  attachments: Attachment[];
  conversation: Conversation[];
};
type Page = {
  content: Message[];
  page: number;
  totalElements: number;
  totalPages: number;
};

const date = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const result = await fetch(`${API_NOTIFICATIONS}/inbox${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!result.ok) {
    const data = await result.json().catch(() => null);
    throw new Error(data?.message || `Yêu cầu thất bại (${result.status})`);
  }
  if (result.status === 204) return undefined as T;
  return result.json();
}

export default function InboxSection({
  canSend,
  onOpenDelivery,
}: {
  canSend: boolean;
  onOpenDelivery: (id: string) => void;
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

  useEffect(() => {
    selectedMessageRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected?.message.id]);

  useEffect(() => {
    if (replyingTo) replyInputRef.current?.focus();
  }, [replyingTo]);

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (channel) params.set("channel", channel);
      if (status) params.set("status", status);
      if (query) params.set("q", query);
      const result = await request<Page>(`?${params}`);
      setRows(result.content);
      setTotal(result.totalElements);
      setPages(result.totalPages);
      setError("");
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [page, channel, status, query]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  const open = async (id: string, compose = false) => {
    try {
      const detail = await request<Detail>(`/${id}`);
      setSelected(detail);
      setSubject(
        compose
          ? `Re: ${detail.message.subject?.replace(/^Re:\s*/i, "") || "Thông báo"}`
          : ""
      );
      setReply("");
      setConfirmed(false);
      setReplyingTo(compose ? id : null);
      setError("");
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const act = async (
    path: string,
    method: string,
    body: unknown,
    message: string
  ) => {
    if (!selected) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(path, { method, body: JSON.stringify(body) });
      setNotice(message);
      setSelected(await request<Detail>(`/${selected.message.id}`));
      await refresh();
      return true;
    } catch (cause) {
      setError((cause as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const download = async (attachment: Attachment) => {
    if (!selected) return;
    try {
      const result = await fetch(
        `${API_NOTIFICATIONS}/inbox/${selected.message.id}/attachments/${attachment.id}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!result.ok) throw new Error(`Không tải được tệp (${result.status})`);
      const url = URL.createObjectURL(await result.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const timeline = selected ? [...selected.conversation] : [];
  if (selected && !timeline.some((item) => item.id === selected.message.id)) {
    timeline.push({
      direction: "IN",
      id: selected.message.id,
      content: selected.message.content,
      subject: selected.message.subject,
      status: selected.message.handlingStatus,
      at: selected.message.receivedAt,
      errorNote: null,
    });
  }
  timeline.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  return (
    <section
      aria-labelledby="inbox-heading"
      className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5 sm:px-6 dark:border-gray-800">
        <div>
          <h2
            id="inbox-heading"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            Hộp thư phản hồi hai chiều
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Tin nhắn và email phản hồi nhận được từ người dùng · {total} cuộc trao đổi
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter bar */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
        className="grid gap-3 border-b border-gray-100 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:p-5 dark:border-gray-800"
      >
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            aria-label="Tìm người gửi hoặc tiêu đề"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo người gửi hoặc tiêu đề tin nhắn..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-9 pr-3 text-xs text-gray-900 outline-none transition focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-100"
          />
        </div>

        <select
          aria-label="Kênh phản hồi"
          value={channel}
          onChange={(event) => {
            setChannel(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-gray-200 bg-gray-50/60 px-3 text-xs font-medium text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200"
        >
          <option value="">Tất cả kênh</option>
          <option value="EMAIL">Email</option>
          <option value="TELEGRAM">Telegram</option>
          <option value="ZALO">Zalo</option>
        </select>

        <select
          aria-label="Trạng thái xử lý"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-gray-200 bg-gray-50/60 px-3 text-xs font-medium text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="NEW">Mới</option>
          <option value="RESOLVED">Đã xử lý</option>
        </select>

        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-600"
        >
          <span>Tìm kiếm</span>
        </button>
      </form>

      {/* Alerts */}
      {error && (
        <div className="p-4">
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        </div>
      )}
      {notice && (
        <div className="p-4">
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {notice}
          </p>
        </div>
      )}

      {/* Message List Rows */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => void open(row.id)}
            className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-gray-50/80 sm:px-6 dark:hover:bg-gray-800/40"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {row.channel === "EMAIL" ? (
                  <Mail size={16} />
                ) : (
                  <MessageCircle size={16} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-bold text-gray-900 dark:text-white sm:text-sm">
                    {row.senderAddress}
                  </span>
                  <span className="font-mono text-[11px] text-gray-400">
                    {date(row.receivedAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                  {row.subject || row.content || "Tệp đính kèm"}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex shrink-0 items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${
                row.handlingStatus === "NEW"
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              {row.handlingStatus === "NEW" ? "Mới nhận" : "Đã xử lý"}
            </span>
          </button>
        ))}

        {rows.length === 0 && (
          <div className="py-14 text-center">
            <Mail size={28} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Chưa có phản hồi nào phù hợp
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Các tin nhắn từ người dùng sẽ hiển thị tại đây khi được gửi đến.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 p-4 text-xs font-medium text-gray-600 dark:border-gray-800 dark:text-gray-400 sm:px-6 sm:text-sm">
        <span>
          Trang {page} / {Math.max(1, pages)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={14} /> Trước
          </button>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Sau <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* CONVERSATION DIALOG MODAL */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cuộc trò chuyện"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-950/60 p-2 sm:p-6 backdrop-blur-xs"
        >
          <div className="flex h-[min(92vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            {/* Dialog Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 p-4 sm:px-6 dark:border-gray-800">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  {selected.message.channel === "EMAIL" ? (
                    <Mail size={18} />
                  ) : (
                    <MessageCircle size={18} />
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white sm:text-base">
                    {selected.message.senderAddress}
                  </h3>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {selected.message.channel === "EMAIL"
                      ? "Email"
                      : selected.message.channel === "ZALO"
                        ? "Zalo"
                        : "Telegram"}{" "}
                    · {selected.message.handlingStatus === "NEW" ? "Mới nhận" : "Đã xử lý"} ·{" "}
                    {timeline.length} tin trao đổi
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {canSend && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        `/${selected.message.id}/status`,
                        "PATCH",
                        {
                          status:
                            selected.message.handlingStatus === "NEW"
                              ? "RESOLVED"
                              : "NEW",
                        },
                        "Đã cập nhật trạng thái xử lý."
                      )
                    }
                    className="inline-flex min-h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {selected.message.handlingStatus === "NEW"
                      ? "Đánh dấu đã xử lý"
                      : "Đánh dấu mới"}
                  </button>
                )}

                <button
                  type="button"
                  aria-label="Đóng"
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conversation Stream */}
            <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50/50 p-4 sm:p-6 dark:bg-gray-950/40">
              {timeline.map((item) => {
                const outgoing = item.direction === "OUT";
                const title =
                  item.subject?.trim() ||
                  (selected.message.channel === "EMAIL"
                    ? "Email không tiêu đề"
                    : selected.message.channel === "ZALO"
                      ? "Tin nhắn Zalo"
                      : "Tin nhắn Telegram");

                return (
                  <li
                    key={`${item.direction}-${item.id}`}
                    ref={
                      item.id === selected.message.id
                        ? selectedMessageRef
                        : undefined
                    }
                    className={`flex ${outgoing ? "justify-end" : "justify-start"}`}
                  >
                    <article
                      className={`w-fit min-w-0 max-w-[88%] rounded-2xl p-4 shadow-xs sm:max-w-[76%] ${
                        outgoing
                          ? "rounded-br-xs bg-brand-500 text-white"
                          : "rounded-bl-xs border border-gray-200/80 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          outgoing ? "text-white/80" : "text-brand-600 dark:text-brand-400"
                        }`}
                      >
                        {outgoing ? "Hệ thống / Quản trị viên" : selected.message.senderAddress}
                      </p>

                      <h5 className="mt-1 break-words text-xs font-bold sm:text-sm">
                        {title}
                      </h5>

                      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed sm:text-sm">
                        {item.content || "Không có nội dung văn bản"}
                      </p>

                      {/* Attachments */}
                      {item.id === selected.message.id &&
                        selected.attachments.length > 0 && (
                          <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-2.5 dark:border-gray-800">
                            {selected.attachments.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Paperclip size={12} />
                                  <span className="truncate">{file.fileName}</span>
                                </span>
                                {file.status === "STORED" ? (
                                  <button
                                    type="button"
                                    onClick={() => void download(file)}
                                    className="inline-flex items-center gap-1 font-semibold underline"
                                  >
                                    <Download size={12} /> Tải
                                  </button>
                                ) : (
                                  <span className="text-red-500">{file.status}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                      <div
                        className={`mt-2 flex items-center justify-end gap-2 text-[10px] ${
                          outgoing ? "text-white/70" : "text-gray-400"
                        }`}
                      >
                        <span>{date(item.at)}</span>
                        <span>•</span>
                        <span>{item.status}</span>
                      </div>

                      {outgoing && (
                        <button
                          type="button"
                          onClick={() => onOpenDelivery(item.id)}
                          className="mt-1.5 text-[11px] font-semibold text-white/90 underline"
                        >
                          Xem các lần thử gửi
                        </button>
                      )}

                      {!outgoing &&
                        canSend &&
                        (item.id !== selected.message.id ||
                          selected.message.kind !== "BOUNCE") && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (item.id === selected.message.id) {
                                setReplyingTo(item.id);
                                setSubject(
                                  `Re: ${
                                    item.subject?.replace(/^Re:\s*/i, "") ||
                                    "Thông báo"
                                  }`
                                );
                              } else {
                                void open(item.id, true);
                              }
                            }}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                          >
                            <CornerUpLeft size={12} />
                            <span>Trả lời</span>
                          </button>
                        )}
                    </article>
                  </li>
                );
              })}
            </ol>

            {/* Quick Reply Form */}
            {canSend && (
              <div className="shrink-0 border-t border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
                {selected.message.kind !== "BOUNCE" ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void act(
                        `/${selected.message.id}/${replyingTo ? "reply" : "send"}`,
                        "POST",
                        {
                          subject,
                          content: reply,
                          confirmedDestination:
                            selected.message.replyDestination ||
                            selected.message.senderAddress,
                        },
                        "Đã xếp hàng gửi tin phản hồi."
                      ).then((sent) => {
                        if (sent) {
                          setSubject("");
                          setReply("");
                          setConfirmed(false);
                          setReplyingTo(null);
                        }
                      });
                    }}
                    className="space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {replyingTo ? "Trả lời tin" : "Gửi tin mới"} tới:{" "}
                        <strong className="text-gray-900 dark:text-white">
                          {selected.message.replyDestination ||
                            selected.message.senderAddress}
                        </strong>
                      </span>
                      {replyingTo && (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(null);
                            setSubject("");
                          }}
                          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          Hủy chế độ trả lời
                        </button>
                      )}
                    </div>

                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      maxLength={500}
                      placeholder="Tiêu đề tin nhắn..."
                      className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 text-xs text-gray-900 outline-none transition focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-100"
                    />

                    <div className="flex items-end gap-2">
                      <textarea
                        ref={replyInputRef}
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        rows={2}
                        maxLength={10000}
                        placeholder="Nhập nội dung phản hồi nhanh..."
                        className="min-h-12 w-full resize-y rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-xs text-gray-900 outline-none transition focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-100"
                      />
                      <button
                        type="submit"
                        disabled={
                          busy || !confirmed || !subject.trim() || !reply.trim()
                        }
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-xs transition hover:bg-brand-600 disabled:opacity-40"
                        title="Gửi phản hồi"
                      >
                        <Send size={16} />
                      </button>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                        className="size-3.5 rounded accent-brand-500"
                      />
                      <span>
                        Tôi xác nhận gửi phản hồi đến địa chỉ/Chat ID người nhận ở trên.
                      </span>
                    </label>
                  </form>
                ) : (
                  <p className="text-xs text-gray-400">
                    Không thể gửi tin tới địa chỉ phản hồi của email bị trả lại (Bounce).
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
