"use client";

import React, { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Modal from "@/components/ui/modal/Modal";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { getToken } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/apiError";
import { API_CHATBOT } from "@/lib/api";

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
  const indexed =
    boolField(o.indexed) ?? boolField(o.Indexed);
  const chunkCount =
    numField(o.chunkCount) ?? numField(o.ChunkCount);
  const durationMs =
    numField(o.durationMs) ?? numField(o.DurationMs);
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

export default function ChatbotDataPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FilesResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
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
      if (!token) {
        redirect401();
        return;
      }

      const res = await fetch(`${CHATBOT_BASE}/chatbot-data/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        redirect401();
        return;
      }

      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }

      if (!res.ok) {
        throw new Error(getApiErrorMessage(parsed, `Lỗi ${res.status}`));
      }

      const o = parsed as Record<string, unknown>;
      const path =
        typeof o.path === "string"
          ? o.path
          : typeof o.Path === "string"
            ? o.Path
            : "";
      const rawFiles = o.files ?? o.Files;
      const filesArr = Array.isArray(rawFiles) ? rawFiles : [];
      setData({
        path,
        files: filesArr.map((x) =>
          normalizeFileEntry(x as Record<string, unknown>)
        ),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải danh sách");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 6500);
    return () => window.clearTimeout(t);
  }, [banner]);

  const downloadFile = async (filename: string) => {
    const url = `${CHATBOT_BASE}/chatbot-data/files/${encodeURIComponent(filename)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (res.status === 401) {
      redirect401();
      return;
    }
    if (!res.ok) {
      const t = await res.text();
      let parsed: unknown = t;
      try {
        parsed = t ? JSON.parse(t) : null;
      } catch {
        /* ignore */
      }
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
      const res = await fetch(url, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        redirect401();
        return;
      }
      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }
      if (!res.ok) {
        alert(
          getApiErrorMessage(parsed, deleteErrorFallback(res.status))
        );
        return;
      }
      if (parsed && typeof parsed === "object") {
        const summary = formatIndexSummary(
          "delete",
          parseIndexResult(parsed as Record<string, unknown>)
        );
        setBanner(summary);
      } else {
        setBanner("Đã xóa file.");
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
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: fd,
      });
      if (res.status === 401) {
        redirect401();
        return;
      }
      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }
      if (!res.ok) {
        alert(
          getApiErrorMessage(parsed, uploadErrorFallback(res.status))
        );
        return;
      }
      if (parsed && typeof parsed === "object") {
        const summary = formatIndexSummary(
          "upload",
          parseIndexResult(parsed as Record<string, unknown>)
        );
        setBanner(summary);
      } else {
        setBanner("Tải lên thành công.");
      }
      await fetchFiles();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const busy = uploading || deleting;

  return (
    <div className="p-4 lg:p-6 space-y-6">
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <TypingIndicator label="Đang xử lý" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Vui lòng không đóng trang.
            </span>
          </div>
        </div>
      </Modal>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Tài liệu AI (chatbot)
          </h1>
          <p className="text-sm text-gray-500">
            Thư mục: {data?.path ?? "—"}
          </p>
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
          <Button
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Đang tải..." : "Tải file lên"}
          </Button>
        </div>
      </div>

      {banner && (
        <div
          className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-800 dark:border-success-900/40 dark:bg-success-950/30 dark:text-success-200"
          role="status"
        >
          {banner}
        </div>
      )}

      {loading && (
        <div className="text-gray-500">Đang tải...</div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                <th className="px-4 py-3 font-medium">Tên file</th>
                <th className="px-4 py-3 font-medium">Kích thước</th>
                <th className="px-4 py-3 font-medium">Sửa đổi</th>
                <th className="px-4 py-3 font-medium w-48">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {!data?.files?.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Chưa có file.
                  </td>
                </tr>
              ) : (
                data.files.map((f) => (
                  <tr
                    key={f.name}
                    className="border-b border-gray-100 dark:border-gray-800/80"
                  >
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {f.size.toLocaleString()} B
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {f.modifiedAt || "—"}
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="text-brand-600 hover:underline text-xs font-medium disabled:opacity-50"
                        onClick={() => void downloadFile(f.name)}
                      >
                        Tải xuống
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50"
                        onClick={() => void deleteFile(f.name)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
