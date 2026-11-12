"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  History,
  Home,
  Inbox,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { API_NOTIFICATIONS } from "@/lib/api";
import { getToken, getPermissions } from "@/lib/auth";
import InboxSection from "./InboxSection";

type Channel = "EMAIL" | "TELEGRAM" | "ZALO";
type Status = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "BOUNCED";
type Delivery = {
  id: string;
  source: "SYSTEM" | "MANUAL";
  actorUserId: string | null;
  actorName: string | null;
  recipientUserId: string | null;
  recipientName: string | null;
  destination: string;
  channel: Channel;
  subject: string;
  content: string;
  eventType: string | null;
  retryOf: string | null;
  status: Status;
  attempts: number;
  createdAt: string;
  sentAt: string | null;
  bouncedAt: string | null;
  nextAttemptAt: string;
  errorNote: string | null;
};
type Attempt = {
  attemptNo: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  errorNote: string | null;
};
type Recipient = {
  id: string;
  username: string;
  email: string | null;
  telegramChatId: number | null;
  zaloChatId: string | null;
};
type Page = {
  content: Delivery[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

const statusLabel: Record<Status, string> = {
  PENDING: "Chờ gửi",
  PROCESSING: "Đang gửi",
  SENT: "Kênh gửi đã nhận",
  FAILED: "Thất bại",
  BOUNCED: "Thư bị trả lại",
};

const channelLabel: Record<Channel, string> = {
  EMAIL: "Email",
  TELEGRAM: "Telegram",
  ZALO: "Zalo",
};

const deliveryStatus = (delivery: Delivery) =>
  delivery.status === "SENT"
    ? delivery.channel === "EMAIL"
      ? "SMTP đã nhận"
      : delivery.channel === "ZALO"
        ? "Zalo đã nhận"
        : "Telegram đã nhận"
    : statusLabel[delivery.status];

const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(new Date(value))
    : "—";

const statusStyle: Record<Status, { badge: string; dot: string }> = {
  PENDING: {
    badge:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
    dot: "bg-amber-500",
  },
  PROCESSING: {
    badge:
      "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
    dot: "bg-blue-500 animate-pulse",
  },
  SENT: {
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
    dot: "bg-emerald-500",
  },
  FAILED: {
    badge:
      "bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40",
    dot: "bg-red-500",
  },
  BOUNCED: {
    badge:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
    dot: "bg-rose-500",
  },
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_NOTIFICATIONS}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
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
  const [selected, setSelected] = useState<{
    delivery: Delivery;
    attempts: Attempt[];
  } | null>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["EMAIL"]);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [matches, setMatches] = useState<Recipient[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "history" | "inbox">(
    "compose"
  );

  useEffect(() => setPermissions(getPermissions()), []);
  const canView = permissions?.includes("notification_view") ?? false;
  const canSend = permissions?.includes("notification_send") ?? false;

  const missingContacts = recipients.filter(
    (recipient) =>
      (channels.includes("EMAIL") && !recipient.email) ||
      (channels.includes("TELEGRAM") && !recipient.telegramChatId) ||
      (channels.includes("ZALO") && !recipient.zaloChatId)
  );

  const canSubmit =
    !busy &&
    recipients.length > 0 &&
    channels.length > 0 &&
    !!subject.trim() &&
    !!content.trim() &&
    missingContacts.length === 0;

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
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [canView, page, status, channel, query, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!canSend) return;
    const timer = setTimeout(() => {
      void api<Recipient[]>(`/recipients?q=${encodeURIComponent(recipientQuery)}`)
        .then(setMatches)
        .catch((cause) => setError((cause as Error).message));
    }, 250);
    return () => clearTimeout(timer);
  }, [canSend, recipientQuery]);

  const openDetail = async (id: string) => {
    try {
      setSelected(
        await api<{ delivery: Delivery; attempts: Attempt[] }>(`/${id}`)
      );
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const send = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await api<{ ids: string[] }>("", {
        method: "POST",
        body: JSON.stringify({
          recipientIds: recipients.map((recipient) => recipient.id),
          channels,
          subject,
          content,
        }),
      });
      setNotice(`Đã xếp hàng gửi thành công ${result.ids.length} lượt gửi.`);
      setSubject("");
      setContent("");
      setRecipients([]);
      setPage(1);
      await refresh();
      setActiveTab("history");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const retry = async (id: string) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await api(`/${id}/retry`, { method: "POST" });
      setNotice("Đã tạo lượt gửi lại thành công.");
      setSelected(null);
      setPage(1);
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleChannel = (value: Channel) =>
    setChannels((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );

  const toggleRecipient = (recipient: Recipient) =>
    setRecipients((current) =>
      current.some((item) => item.id === recipient.id)
        ? current.filter((item) => item.id !== recipient.id)
        : [...current, recipient]
    );

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          <Home size={13} />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight size={12} className="text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          Quản lý thông báo
        </span>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-xs ring-1 ring-brand-500/15 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-400/20">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Trung tâm thông báo
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Soạn tin đa kênh (Email, Telegram, Zalo) cho người dùng hệ thống và theo dõi nhật ký gửi tin.
            </p>
          </div>
        </div>

        {canView && (
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/80 sm:text-sm"
          >
            <RefreshCw size={15} />
            <span>Làm mới dữ liệu</span>
          </button>
        )}
      </header>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur-xs dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1 text-red-400 hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Notice alert */}
      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 backdrop-blur-xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800" role="tablist">
        {canSend && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "compose"}
            onClick={() => setActiveTab("compose")}
            className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold transition sm:text-sm ${
              activeTab === "compose"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Send size={15} />
            <span>Soạn & Gửi thông báo</span>
          </button>
        )}

        {canView && (
          <>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              onClick={() => setActiveTab("history")}
              className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold transition sm:text-sm ${
                activeTab === "history"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <History size={15} />
              <span>Lịch sử gửi ({total})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "inbox"}
              onClick={() => setActiveTab("inbox")}
              className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold transition sm:text-sm ${
                activeTab === "inbox"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Inbox size={15} />
              <span>Hộp thư phản hồi</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: COMPOSE & SEND */}
      {activeTab === "compose" && canSend && (
        <section
          aria-labelledby="compose-heading"
          className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5 sm:px-6 dark:border-gray-800">
            <div>
              <h2
                id="compose-heading"
                className="text-lg font-bold text-gray-900 dark:text-white"
              >
                Soạn tin thông báo mới
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Lựa chọn người nhận, kênh gửi và soạn nội dung tin nhắn.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-200/60 dark:border-brand-500/20">
              <Users size={14} />
              <span>{recipients.length} người nhận đã chọn</span>
            </span>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            {/* Left side: Recipient picker */}
            <div className="border-b border-gray-100 p-5 sm:p-6 lg:border-b-0 lg:border-r dark:border-gray-800">
              <label
                htmlFor="recipient-search"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                Người nhận
              </label>

              <div className="relative mt-2">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="recipient-search"
                  value={recipientQuery}
                  onChange={(event) => setRecipientQuery(event.target.value)}
                  placeholder="Tìm tên đăng nhập hoặc email..."
                  className="h-10.5 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-10 pr-3.5 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-100 sm:text-sm"
                />
              </div>

              {/* Matches candidates */}
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-1 dark:border-gray-800 dark:bg-gray-950/40">
                {matches.length ? (
                  matches.map((recipient) => {
                    const checked = recipients.some((item) => item.id === recipient.id);
                    return (
                      <label
                        key={recipient.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg p-2.5 transition hover:bg-white dark:hover:bg-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(recipient)}
                          className="mt-0.5 size-4 rounded accent-brand-500"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                            {recipient.username}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-gray-500 dark:text-gray-400">
                            {recipient.email || "Chưa có email"} ·{" "}
                            {recipient.telegramChatId ? "Có Telegram" : "Chưa có Telegram"}
                          </span>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <p className="py-6 text-center text-xs text-gray-400">
                    {recipientQuery
                      ? "Không tìm thấy tài khoản phù hợp."
                      : "Nhập từ khóa tìm kiếm tài khoản ở trên."}
                  </p>
                )}
              </div>

              {/* Selected Pills */}
              <div className="mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Đã chọn ({recipients.length})
                </span>
                {recipients.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {recipients.map((recipient) => (
                      <button
                        key={recipient.id}
                        type="button"
                        onClick={() => toggleRecipient(recipient)}
                        title={`Bỏ chọn ${recipient.username}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
                      >
                        <span>{recipient.username}</span>
                        <X size={12} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Chưa có người nhận nào được chọn.</p>
                )}
              </div>

              {missingContacts.length > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>{missingContacts.map((p) => p.username).join(", ")}</strong> chưa có
                    thông tin liên hệ cho kênh gửi đã chọn.
                  </span>
                </div>
              )}
            </div>

            {/* Right side: Channels, Subject, Content */}
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Kênh truyền gửi
                </span>
                <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {(["EMAIL", "TELEGRAM", "ZALO"] as const).map((value) => {
                    const active = channels.includes(value);
                    const Icon = value === "EMAIL" ? Mail : MessageCircle;
                    return (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          active
                            ? "border-brand-500 bg-brand-50/50 dark:border-brand-500/50 dark:bg-brand-500/10"
                            : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleChannel(value)}
                          className="size-4 rounded accent-brand-500"
                        />
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            active
                              ? "bg-brand-500 text-white"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {channelLabel[value]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Tiêu đề thông báo <span className="text-red-500">*</span>
                </label>
                <input
                  value={subject}
                  maxLength={500}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Nhập tiêu đề thông báo..."
                  className="mt-2 h-10.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Nội dung chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  maxLength={10000}
                  rows={5}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Viết nội dung thông báo muốn gửi tới người nhận..."
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3.5 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {recipients.length && channels.length
                    ? `${recipients.length * channels.length} lượt gửi sẽ được khởi tạo trong hàng đợi.`
                    : "Vui lòng chọn người nhận và kênh gửi để tiếp tục."}
                </p>

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void send()}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-40 sm:text-sm"
                >
                  <Send size={15} />
                  <span>{busy ? "Đang gửi..." : "Gửi thông báo ngay"}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === "history" && canView && (
        <section
          aria-labelledby="history-heading"
          className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900"
        >
          {/* Filters Bar */}
          <div className="grid gap-3 border-b border-gray-100 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-5 dark:border-gray-800">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Tìm kiếm
              </label>
              <div className="relative mt-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  placeholder="Người nhận, địa chỉ..."
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-8 pr-3 text-xs text-gray-900 outline-none transition focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 text-xs font-medium text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(statusLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Kênh gửi
              </label>
              <select
                value={channel}
                onChange={(event) => {
                  setChannel(event.target.value);
                  setPage(1);
                }}
                className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 text-xs font-medium text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200"
              >
                <option value="">Tất cả kênh</option>
                <option value="EMAIL">Email</option>
                <option value="TELEGRAM">Telegram</option>
                <option value="ZALO">Zalo</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Từ ngày
              </label>
              <input
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
                className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 text-xs text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Đến ngày
              </label>
              <input
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
                className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 text-xs text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-4 py-3.5">Người gửi</th>
                  <th className="px-4 py-3.5">Người nhận</th>
                  <th className="px-4 py-3.5">Kênh</th>
                  <th className="px-4 py-3.5">Tiêu đề</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Lần thử</th>
                  <th className="px-5 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((row) => {
                  const conf = statusStyle[row.status] ?? statusStyle.PENDING;
                  return (
                    <tr
                      key={row.id}
                      className="group transition hover:bg-gray-50/70 dark:hover:bg-gray-800/30"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-gray-600 dark:text-gray-400">
                        {date(row.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">
                        {row.actorName || row.actorUserId || "Hệ thống"}
                      </td>
                      <td className="max-w-56 px-4 py-3.5">
                        <span className="block truncate font-medium text-gray-900 dark:text-white">
                          {row.recipientName || row.recipientUserId || "—"}
                        </span>
                        <span
                          className="block truncate font-mono text-[11px] text-gray-400"
                          title={row.destination}
                        >
                          {row.destination}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                          {row.channel === "EMAIL" ? (
                            <Mail size={13} className="text-blue-500" />
                          ) : (
                            <MessageCircle size={13} className="text-emerald-500" />
                          )}
                          <span>{channelLabel[row.channel]}</span>
                        </span>
                      </td>
                      <td
                        className="max-w-52 truncate px-4 py-3.5 font-medium text-gray-800 dark:text-gray-200"
                        title={row.subject}
                      >
                        {row.subject}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${conf.badge}`}
                        >
                          <span className={`size-1.5 rounded-full ${conf.dot}`} />
                          <span>{deliveryStatus(row)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-gray-600 dark:text-gray-400">
                        {row.attempts}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => void openDetail(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-brand-600 shadow-2xs transition hover:bg-brand-50 hover:text-brand-700 dark:border-gray-800 dark:bg-gray-900 dark:text-brand-400"
                        >
                          <span>Xem</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!rows.length && (
              <div className="py-14 text-center">
                <Search size={28} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Chưa có thông báo nào phù hợp
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-100 p-4 text-xs font-medium text-gray-600 dark:border-gray-800 dark:text-gray-400 sm:text-sm">
            <span>
              Trang {page} / {Math.max(1, totalPages)}
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
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Sau <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: INBOX SECTION */}
      {activeTab === "inbox" && canView && (
        <InboxSection canSend={canSend} onOpenDelivery={(id) => void openDetail(id)} />
      )}

      {/* DETAIL MODAL FOR DELIVERY */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chi tiết thông báo"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200/80 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Chi tiết lượt gửi thông báo
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Lịch sử và tiến trình xử lý thông báo của hệ thống
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Đóng"
                className="rounded-xl border border-gray-200/80 p-2 text-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${
                    statusStyle[selected.delivery.status]?.badge ?? ""
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      statusStyle[selected.delivery.status]?.dot ?? ""
                    }`}
                  />
                  <span>{deliveryStatus(selected.delivery)}</span>
                </span>
                <span className="text-xs text-gray-400">
                  ID: <span className="font-mono">{selected.delivery.id}</span>
                </span>
              </div>

              {/* Attributes Grid */}
              <dl className="grid gap-x-5 gap-y-3.5 rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-xs dark:border-gray-800 dark:bg-gray-950/40 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">Người gửi</dt>
                  <dd className="mt-1 font-bold text-gray-900 dark:text-white">
                    {selected.delivery.actorName ||
                      selected.delivery.actorUserId ||
                      "Hệ thống"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">Người nhận</dt>
                  <dd className="mt-1 break-all font-bold text-gray-900 dark:text-white">
                    {selected.delivery.recipientName ||
                      selected.delivery.recipientUserId ||
                      "—"}{" "}
                    <span className="font-normal text-gray-500">
                      ({selected.delivery.destination})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">Kênh gửi</dt>
                  <dd className="mt-1 font-bold text-gray-900 dark:text-white">
                    {channelLabel[selected.delivery.channel]}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">Khởi tạo lúc</dt>
                  <dd className="mt-1 font-mono font-semibold text-gray-900 dark:text-white">
                    {date(selected.delivery.createdAt)}
                  </dd>
                </div>
                {selected.delivery.sentAt && (
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Đã gửi lúc</dt>
                    <dd className="mt-1 font-mono font-semibold text-gray-900 dark:text-white">
                      {date(selected.delivery.sentAt)}
                    </dd>
                  </div>
                )}
                {selected.delivery.bouncedAt && (
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Bị trả lại lúc
                    </dt>
                    <dd className="mt-1 font-mono font-semibold text-red-600">
                      {date(selected.delivery.bouncedAt)}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Message Content */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {selected.delivery.subject}
                </h3>
                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-xs leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-200">
                  {selected.delivery.content}
                </div>
              </div>

              {selected.delivery.errorNote && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                  <div>
                    <p className="font-bold">Chi tiết lỗi xử lý:</p>
                    <p className="mt-0.5">{selected.delivery.errorNote}</p>
                  </div>
                </div>
              )}

              {/* Attempt list */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Các lần thử gửi ({selected.attempts.length})
                </h4>
                <ol className="mt-2.5 space-y-2">
                  {selected.attempts.map((attempt) => (
                    <li
                      key={attempt.attemptNo}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-xs dark:border-gray-800 dark:bg-gray-950/40"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 font-mono text-[11px] font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                        {attempt.attemptNo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {attempt.status === "SENT"
                              ? "Gửi thành công"
                              : attempt.status === "FAILED"
                                ? "Gửi thất bại"
                                : "Đang xử lý"}
                          </span>
                          <span className="font-mono text-gray-400">
                            {date(attempt.startedAt)}
                          </span>
                        </div>
                        {attempt.errorNote && (
                          <p className="mt-1 text-red-600 dark:text-red-400">
                            {attempt.errorNote}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Retry action if failed */}
              {canSend &&
                (selected.delivery.status === "FAILED" ||
                  selected.delivery.status === "BOUNCED") && (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void retry(selected.delivery.id)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-40"
                    >
                      <Send size={15} />
                      <span>{busy ? "Đang gửi..." : "Gửi lại thông báo"}</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
