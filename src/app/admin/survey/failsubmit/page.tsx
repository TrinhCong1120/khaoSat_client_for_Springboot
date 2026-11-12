"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  FileCode,
  FileText,
  FileWarning,
  History,
  Home,
  LayoutList,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  User,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { API_FAILED_SURVEYS } from "@/lib/api";
import { getPermissions, getToken } from "@/lib/auth";

type Case = {
  id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED" | "DELETED";
  assignedUserId: string | null;
  assignedUsername: string | null;
  createdAt: string;
  updatedAt: string;
  hasFile: boolean;
};

type Event = {
  id: string;
  action: string;
  actorUsername: string | null;
  note: string | null;
  details: string;
  createdAt: string;
};

type Detail = { item: Case; events: Event[] };
type CasePage = {
  items: Case[];
  page: number;
  pageSize: number;
  total: number;
  counts: Record<string, number>;
};
type Assignee = { id: string; username: string };
type ImportResult = {
  total: number;
  imported: number;
  skippedDuplicate: number;
  failedRemain: number;
};

const labels: Record<string, string> = {
  NEW: "Mới",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
};

const statusConfig: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  NEW: {
    label: "Mới phát hiện",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
    dotClass: "bg-amber-500",
  },
  IN_PROGRESS: {
    label: "Đang xử lý",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
    dotClass: "bg-blue-500 animate-pulse",
  },
  RESOLVED: {
    label: "Đã xử lý",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
    dotClass: "bg-emerald-500",
  },
  DELETED: {
    label: "Đã xóa",
    badgeClass:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    dotClass: "bg-gray-400",
  },
};

const actionLabels: Record<string, string> = {
  CREATED: "Tạo hồ sơ",
  STATUS_CHANGED: "Đổi trạng thái",
  ASSIGNED: "Phân công",
  NOTE: "Thêm ghi chú",
  IMPORTED: "Import phản hồi",
  DELETED: "Xóa file",
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
  const response = await fetch(`${API_FAILED_SURVEYS}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      response.status === 403
        ? "Bạn không có quyền quản lý lỗi."
        : body.length < 180 && body
          ? body
          : `Thao tác thất bại (${response.status}).`
    );
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export default function FailedSurveyCasesPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<CasePage>({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    counts: {},
  });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  useEffect(() => setAllowed(getPermissions().includes("survey_failed_manage")), []);

  useEffect(() => {
    if (!allowed) return;
    void request<Assignee[]>("/cases/assignees")
      .then(setAssignees)
      .catch((cause) => setError(String(cause)));
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    void request<CasePage>(`/cases?${params}`)
      .then((result) => {
        if (active) setRows(result);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được hồ sơ.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed, status, search, page, notice]);

  const open = async (id: string) => {
    setError("");
    setPreview("");
    try {
      setDetail(await request<Detail>(`/cases/${id}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được chi tiết.");
    }
  };

  const run = async (work: () => Promise<string | void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await work();
      setNotice(message || `Đã cập nhật lúc ${new Date().toLocaleTimeString("vi-VN")}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Thao tác thất bại.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const upload = (file: File) =>
    void run(async () => {
      if (!file.name.toLowerCase().endsWith(".json"))
        throw new Error("Chỉ nhận file định dạng .JSON.");
      const data = new FormData();
      data.append("file", file);
      const item = await request<Case>("/cases", { method: "POST", body: data });
      setPage(1);
      await open(item.id);
    });

  const update = (body: Record<string, unknown>) => {
    if (!detail) return;
    void run(async () => {
      const next = await request<Detail>(`/cases/${detail.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setDetail(next);
      setNote("");
    });
  };

  const importCase = () => {
    if (!detail) return;
    void run(async () => {
      const result = await request<ImportResult>(`/cases/${detail.item.id}/import`, {
        method: "POST",
      });
      setDetail(await request<Detail>(`/cases/${detail.item.id}`));
      return `Import thành công: ${result.imported} bản ghi, ${result.skippedDuplicate} trùng lặp, ${result.failedRemain} còn lỗi.`;
    });
  };

  const download = async (showPreview: boolean) => {
    if (!detail) return;
    void run(async () => {
      const response = await fetch(`${API_FAILED_SURVEYS}/cases/${detail.item.id}/download`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`Không đọc được file (${response.status}).`);
      const blob = await response.blob();
      if (showPreview) {
        setPreview((await blob.text()).slice(0, 25000));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = detail.item.fileName;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const remove = () => {
    if (
      !detail ||
      !window.confirm(
        `Xác nhận xóa file "${detail.item.fileName}"? Lịch sử sự kiện hồ sơ vẫn sẽ được lưu trữ.`
      )
    )
      return;
    void run(async () => {
      await request<void>(`/cases/${detail.item.id}`, { method: "DELETE" });
      setDetail(null);
      setPreview("");
    });
  };

  const copyJson = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (allowed === null)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Đang kiểm tra quyền truy cập…</p>
      </div>
    );

  if (!allowed)
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold">Chưa được cấp quyền</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed sm:text-sm">
            Bạn không có quyền quản lý phản hồi gửi lỗi (mã quyền:{" "}
            <code>survey_failed_manage</code>). Vui lòng liên hệ quản trị viên để được cấp quyền hoặc
            đăng nhập lại nếu quyền vừa được cập nhật.
          </p>
        </div>
      </div>
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
        <Link
          href="/admin/survey"
          className="transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          Khảo sát
        </Link>
        <ChevronRight size={12} className="text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          Phản hồi gửi lỗi
        </span>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-xs ring-1 ring-amber-500/15 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20">
            <FileWarning size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Phản hồi gửi lỗi
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Theo dõi file JSON gửi hỏng từ người dùng, phân công xử lý và import dữ liệu vào hệ
              thống.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/survey"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/80 sm:text-sm"
          >
            <LayoutList size={16} />
            <span>Danh sách khảo sát</span>
          </Link>

          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 sm:text-sm"
          >
            <Upload size={16} />
            <span>Tải file JSON lên</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) upload(file);
            }}
          />
        </div>
      </header>

      {/* Alerts */}
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
            className="rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
            className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-100 hover:text-emerald-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Status Filter Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["NEW", "IN_PROGRESS", "RESOLVED"] as const).map((value) => {
          const active = status === value;
          const conf = statusConfig[value];
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatus(status === value ? "" : value);
                setPage(1);
              }}
              className={`rounded-2xl border p-4.5 text-left shadow-xs transition ${
                active
                  ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 dark:border-brand-500/60 dark:bg-brand-500/10"
                  : "border-gray-200/80 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {labels[value]}
                </span>
                <span className={`size-2.5 rounded-full ${conf.dotClass}`} />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {rows.counts[value] ?? 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {active ? "Đang chọn bộ lọc này (Nhấn để hủy)" : "Nhấn để lọc theo trạng thái này"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Grid: List & Detail Drawer */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(360px,1fr)]">
        {/* Left Column: Cases Table / List */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
          {/* Filter & Search Bar */}
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                aria-label="Tìm tên file"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Tìm theo tên file tải lên..."
                className="h-10.5 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-10 pr-3 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-100 sm:text-sm"
              />
            </div>

            <select
              aria-label="Lọc trạng thái"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="h-10.5 rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 text-xs font-medium text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200 sm:text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="NEW">Mới</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="RESOLVED">Đã xử lý</option>
            </select>
          </div>

          <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/40 px-4 py-2.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-950/20 dark:text-gray-400">
            <span>{loading ? "Đang tải dữ liệu…" : `Tổng số ${rows.total} hồ sơ`}</span>
            {status && (
              <button
                type="button"
                onClick={() => setStatus("")}
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Xóa lọc trạng thái
              </button>
            )}
          </div>

          {/* List Rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <div className="space-y-3 p-5" aria-label="Đang tải danh sách hồ sơ">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
                  />
                ))}
              </div>
            ) : rows.items.length === 0 ? (
              <div className="py-14 text-center">
                <FileCode size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Chưa có hồ sơ phù hợp
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Thử tìm kiếm với từ khóa khác hoặc tải file JSON mới lên.
                </p>
              </div>
            ) : (
              rows.items.map((item) => {
                const conf = statusConfig[item.status] ?? statusConfig.DELETED;
                const isSelected = detail?.item.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void open(item.id)}
                    className={`group flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3.5 text-left transition ${
                      isSelected
                        ? "bg-brand-50/80 dark:bg-brand-500/10"
                        : "hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
                          isSelected
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        <FileCode size={18} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-semibold ${
                            isSelected
                              ? "text-brand-700 dark:text-brand-300"
                              : "text-gray-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400"
                          }`}
                          title={item.originalFileName}
                        >
                          {item.originalFileName}
                        </span>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(item.createdAt).toLocaleString("vi-VN")}
                          </span>
                          <span>•</span>
                          <span>{(item.fileSize / 1024).toFixed(1)} KB</span>
                          {item.assignedUsername && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                <User size={12} />
                                {item.assignedUsername}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${conf.badgeClass}`}
                      >
                        <span className={`size-1.5 rounded-full ${conf.dotClass}`} />
                        {labels[item.status] ?? item.status}
                      </span>
                      <ChevronRight
                        size={15}
                        className={`text-gray-400 transition group-hover:translate-x-0.5 ${
                          isSelected ? "text-brand-500" : ""
                        }`}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 p-4 text-xs font-medium text-gray-600 dark:border-gray-800 dark:text-gray-400 sm:text-sm">
            <span>
              Trang {page} / {Math.max(1, Math.ceil(rows.total / 20))}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </button>
              <button
                type="button"
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                disabled={page * 20 >= rows.total || loading}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Case Details & Operations Drawer */}
        <aside className="min-w-0 space-y-5 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          {!detail ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800">
                <FileText size={28} />
              </div>
              <p className="mt-3 text-base font-semibold text-gray-800 dark:text-gray-200">
                Chưa chọn hồ sơ nào
              </p>
              <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
                Nhấn vào một mục bên danh sách để xem chi tiết, phân công người xử lý và import phản
                hồi.
              </p>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="border-b border-gray-100 pb-4 dark:border-gray-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Chi tiết hồ sơ lỗi
                    </span>
                    <h2
                      className="mt-1 break-all text-lg font-bold text-gray-900 dark:text-white"
                      title={detail.item.originalFileName}
                    >
                      {detail.item.originalFileName}
                    </h2>
                    <p className="mt-0.5 truncate font-mono text-xs text-gray-400">
                      {detail.item.fileName}
                    </p>
                  </div>
                </div>

                {/* File Quick Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void download(true)}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Eye size={14} />
                    <span>Xem JSON</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void download(false)}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Download size={14} />
                    <span>Tải file xuống</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={remove}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 shadow-2xs transition hover:bg-red-50 dark:border-red-900/60 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={14} />
                    <span>Xóa file</span>
                  </button>
                </div>
              </div>

              {/* JSON Code Preview (if open) */}
              {preview && (
                <div className="rounded-xl border border-gray-800 bg-gray-950 p-3 shadow-inner">
                  <div className="mb-2 flex items-center justify-between border-b border-gray-800 pb-2 text-xs text-gray-400">
                    <span className="font-mono">Nội dung file JSON</span>
                    <button
                      type="button"
                      onClick={() => void copyJson()}
                      className="flex items-center gap-1 text-gray-400 hover:text-white"
                    >
                      <Copy size={13} />
                      <span>{copied ? "Đã copy!" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="max-h-56 overflow-auto font-mono text-[11px] leading-relaxed text-gray-200">
                    {preview}
                  </pre>
                </div>
              )}

              {/* Assignee Select */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Phân công người xử lý
                </label>
                <select
                  value={detail.item.assignedUserId ?? ""}
                  disabled={busy}
                  onChange={(event) =>
                    update(
                      event.target.value
                        ? { assignedUserId: event.target.value }
                        : { clearAssignee: true }
                    )
                  }
                  className="mt-2 h-10.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:text-sm"
                >
                  <option value="">-- Chưa phân công --</option>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Actions */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Trạng thái hiện tại:
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                      statusConfig[detail.item.status]?.badgeClass ?? ""
                    }`}
                  >
                    {labels[detail.item.status] ?? detail.item.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {detail.item.status === "NEW" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => update({ status: "IN_PROGRESS" })}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <span>Bắt đầu xử lý</span>
                    </button>
                  )}

                  {detail.item.status === "IN_PROGRESS" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => update({ status: "RESOLVED" })}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      <CheckCircle2 size={14} />
                      <span>Đánh dấu đã xử lý</span>
                    </button>
                  )}

                  {detail.item.status === "RESOLVED" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => update({ status: "IN_PROGRESS" })}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <RotateCcw size={14} />
                      <span>Mở lại hồ sơ</span>
                    </button>
                  )}

                  {detail.item.status !== "RESOLVED" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={importCase}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-40"
                    >
                      <Sparkles size={14} />
                      <span>{busy ? "Đang xử lý…" : "Import phản hồi"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Note input */}
              <div>
                <label
                  htmlFor="case-note"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                >
                  Thêm ghi chú tiến độ
                </label>
                <textarea
                  id="case-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Mô tả chi tiết nguyên nhân lỗi hoặc hành động khắc phục..."
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:text-sm"
                />
                <button
                  type="button"
                  disabled={busy || !note.trim()}
                  onClick={() => update({ note })}
                  className="mt-2 inline-flex min-h-9 items-center justify-center rounded-xl bg-brand-500 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-brand-600 disabled:opacity-40"
                >
                  <span>Lưu ghi chú</span>
                </button>
              </div>

              {/* Timeline Events */}
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  <History size={14} />
                  <span>Lịch sử thao tác</span>
                </h3>

                <ol className="mt-3 max-h-60 space-y-2.5 overflow-y-auto pr-1">
                  {detail.events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-xs dark:border-gray-800 dark:bg-gray-950/40"
                    >
                      <div className="flex items-center justify-between font-semibold text-gray-900 dark:text-white">
                        <span>{actionLabels[event.action] ?? event.action}</span>
                        <span className="font-normal text-gray-400">
                          {event.actorUsername ?? "Hệ thống"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock size={11} />
                        <span>{new Date(event.createdAt).toLocaleString("vi-VN")}</span>
                      </div>
                      {event.note && (
                        <p className="mt-2 rounded-lg bg-white/80 p-2 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          {event.note}
                        </p>
                      )}
                      {event.action === "IMPORTED" && (
                        <p className="mt-1.5 text-emerald-600 dark:text-emerald-400">
                          {event.details}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
