"use client";

import React, { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Modal from "@/components/ui/modal/Modal";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { getToken } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/apiError";
import { API_CHATBOT } from "@/lib/api";
import Pagination from "@/components/ui/pagination/Pagination";
import {
  FiHome,
  FiChevronRight,
  FiDatabase,
  FiUpload,
  FiDownload,
  FiTrash2,
  FiAlertCircle,
  FiRefreshCw,
  FiFile,
  FiCheckCircle,
} from "react-icons/fi";
import Link from "next/link";

const CHATBOT_BASE = API_CHATBOT;

type FileEntry = {
  name: string;
  size: number;
  modifiedAt: string;
};

type FilesResponse = {
  path: string;
  files: FileEntry[];
};

function normalizeFileEntry(row: Record<string, unknown>): FileEntry {
  const name =
    (typeof row.name === "string" && row.name) ||
    (typeof row.Name === "string" && row.Name) ||
    "";
  const sizeRaw = row.size ?? row.Size;
  const size =
    typeof sizeRaw === "number"
      ? sizeRaw
      : typeof sizeRaw === "string"
        ? Number(sizeRaw)
        : 0;
  const modifiedAt =
    (typeof row.modifiedAt === "string" && row.modifiedAt) ||
    (typeof row.ModifiedAt === "string" && row.ModifiedAt) ||
    "";
  return { name, size, modifiedAt };
}

function numField(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function boolField(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

function parseIndexResult(o: Record<string, unknown>) {
  const indexed = boolField(o.indexed) ?? boolField(o.Indexed);
  const chunkCount = numField(o.chunkCount) ?? numField(o.ChunkCount);
  const durationMs = numField(o.durationMs) ?? numField(o.DurationMs);
  const fileRaw = o.file ?? o.File;
  let filePath: string | undefined;
  if (fileRaw && typeof fileRaw === "object") {
    const f = fileRaw as Record<string, unknown>;
    const p = f.path ?? f.Path;
    if (typeof p === "string") filePath = p;
  }
  return { indexed, chunkCount, durationMs, filePath };
}

function formatIndexSummary(
  kind: "upload" | "delete",
  r: ReturnType<typeof parseIndexResult>
): string {
  const parts: string[] = [];
  if (kind === "upload" && r.chunkCount != null) {
    parts.push(`${r.chunkCount} đoạn văn bản`);
  }
  if (r.durationMs != null) {
    parts.push(`${r.durationMs} ms`);
  }
  if (kind === "upload") {
    if (r.indexed === true) parts.push("chỉ mục xong");
    else if (r.indexed === false) parts.push("chưa chỉ mục");
  } else if (r.indexed === true) {
    parts.push("chỉ mục đã cập nhật");
  }
  const detail = parts.length ? ` (${parts.join(" · ")})` : "";
  return kind === "upload"
    ? `Tải lên thành công${detail}.`
    : `Đã xóa file${detail}.`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatbotDataPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FilesResponse | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const files = data?.files ?? [];
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const redirect401 = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = "/signin";
  };

  const authHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${getToken()}`,
  });

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) { redirect401(); return; }

      const res = await fetch(`${CHATBOT_BASE}/chatbot-data/files?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { redirect401(); return; }

      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = text; }
      }

      if (!res.ok) {
        throw new Error(getApiErrorMessage(parsed, `Lỗi ${res.status}`));
      }

      const o = parsed as Record<string, unknown>;
      const path = typeof o.path === "string" ? o.path : typeof o.Path === "string" ? o.Path : "";
      const rawFiles = o.content ?? o.Content;
      const filesArr = Array.isArray(rawFiles) ? rawFiles : [];
      const totalPages = numField(o.totalPages ?? o.TotalPages) ?? 0;
      if (totalPages > 0 && page > totalPages) { setPage(totalPages); return; }
      setData({
        path,
        files: filesArr.map((x) => normalizeFileEntry(x as Record<string, unknown>)),
      });
      setTotal(numField(o.totalElements ?? o.TotalElements) ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải danh sách");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 6500);
    return () => window.clearTimeout(t);
  }, [banner]);

  const downloadFile = async (filename: string) => {
    const url = `${CHATBOT_BASE}/chatbot-data/files/${encodeURIComponent(filename)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (res.status === 401) { redirect401(); return; }
    if (!res.ok) {
      const t = await res.text();
      let parsed: unknown = t;
      try { parsed = t ? JSON.parse(t) : null; } catch { /* ignore */ }
      alert(getApiErrorMessage(parsed, `Lỗi ${res.status}`));
      return;
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  };

  const uploadErrorFallback = (status: number) => {
    if (status === 422) return "Không đọc được file PDF (hoặc tài liệu không hợp lệ).";
    if (status === 503) return "Không gọi được dịch vụ embedding (Ollama). Thử lại sau.";
    return "Tải lên thất bại";
  };

  const deleteErrorFallback = (status: number) => {
    if (status === 503) return "Không cập nhật được chỉ mục (Ollama). Thử lại sau.";
    return "Xóa thất bại";
  };

  const deleteFile = async (filename: string) => {
    if (!confirm(`Xóa file "${filename}"?`)) return;
    setDeleting(true);
    try {
      const url = `${CHATBOT_BASE}/chatbot-data/files/${encodeURIComponent(filename)}`;
      const res = await fetch(url, { method: "DELETE", headers: authHeaders() });
      if (res.status === 401) { redirect401(); return; }
      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = text; }
      }
      if (!res.ok) {
        alert(getApiErrorMessage(parsed, deleteErrorFallback(res.status)));
        return;
      }
      if (parsed && typeof parsed === "object") {
        setBanner({ text: formatIndexSummary("delete", parseIndexResult(parsed as Record<string, unknown>)), isSuccess: true });
      } else {
        setBanner({ text: "Đã xóa file.", isSuccess: true });
      }
      await fetchFiles();
    } finally {
      setDeleting(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${CHATBOT_BASE}/chatbot-data/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (res.status === 401) { redirect401(); return; }
      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = text; }
      }
      if (!res.ok) {
        alert(getApiErrorMessage(parsed, uploadErrorFallback(res.status)));
        return;
      }
      if (parsed && typeof parsed === "object") {
        setBanner({ text: formatIndexSummary("upload", parseIndexResult(parsed as Record<string, unknown>)), isSuccess: true });
      } else {
        setBanner({ text: "Tải lên thành công.", isSuccess: true });
      }
      await fetchFiles();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const busy = uploading || deleting;
  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* AI Processing Modal */}
      <Modal
        isOpen={busy}
        onClose={() => {}}
        blocking
        className="max-w-sm"
        title="AI đang xử lý"
        description={
          uploading
            ? "Đang chỉ mục tài liệu cho chatbot, vui lòng đợi…"
            : "Đang cập nhật chỉ mục sau khi xóa file…"
        }
      >
        <div className="flex flex-col gap-3 px-6 pb-6">
          <div className="flex items-center gap-3">
            <TypingIndicator label="Đang xử lý" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Vui lòng không đóng trang.</span>
          </div>
        </div>
      </Modal>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Link href="/admin" className="flex items-center gap-1.5 transition-colors hover:text-brand-600 dark:hover:text-brand-400">
          <FiHome size={13} />
          <span>Trang chủ</span>
        </Link>
        <FiChevronRight size={12} className="text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-200">Tài liệu AI</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
            <FiDatabase size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Tài liệu AI (chatbot)
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Thư mục: {data?.path ?? "—"}
            </p>
          </div>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiUpload size={15} />
            <span>{uploading ? "Đang tải..." : "Tải file lên"}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tổng files</p>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Dung lượng trang này</p>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{formatFileSize(totalSize)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Files trong trang</p>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{files.length}</p>
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-medium ${
            banner.isSuccess
              ? "border-success-200 bg-success-50 text-success-800 dark:border-success-900/40 dark:bg-success-950/30 dark:text-success-200"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
          }`}
        >
          <FiCheckCircle size={16} className="shrink-0" />
          {banner.text}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
          <div className="size-9 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Đang tải danh sách file...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
            <FiAlertCircle size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Không thể tải dữ liệu</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <button
            type="button"
            onClick={fetchFiles}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700"
          >
            <FiRefreshCw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-800 dark:text-white/90">Danh sách tài liệu</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{total} files</span>
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[680px] w-full text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3.5 text-left">Tên file</th>
                    <th className="px-5 py-3.5 text-left">Kích thước</th>
                    <th className="px-5 py-3.5 text-left">Sửa đổi lần cuối</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {!data?.files?.length ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-gray-400 text-xs italic">
                        Chưa có file nào. Tải lên tài liệu để bắt đầu đào tạo chatbot.
                      </td>
                    </tr>
                  ) : (
                    files.map((f) => (
                      <tr key={f.name} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-950/40 dark:text-brand-400">
                              <FiFile size={14} />
                            </div>
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[280px]">{f.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{formatFileSize(f.size)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-400">{f.modifiedAt || "—"}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={busy}
                              title="Tải xuống"
                              onClick={() => void downloadFile(f.name)}
                              className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FiDownload size={16} />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              title="Xóa"
                              onClick={() => void deleteFile(f.name)}
                              className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
              {!data?.files?.length ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Chưa có file.</div>
              ) : files.map((f) => (
                <article key={f.name} className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-950/40 dark:text-brand-400">
                      <FiFile size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-medium text-gray-800 dark:text-gray-200">{f.name}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{formatFileSize(f.size)} · {f.modifiedAt || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <button type="button" disabled={busy} className="font-semibold text-brand-600 disabled:opacity-50 hover:underline" onClick={() => void downloadFile(f.name)}>Tải xuống</button>
                    <button type="button" disabled={busy} className="font-semibold text-rose-600 disabled:opacity-50 hover:underline" onClick={() => void deleteFile(f.name)}>Xóa</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
