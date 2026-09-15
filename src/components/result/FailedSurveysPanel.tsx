"use client";

import { useCallback, useEffect, useState } from "react";

type FailedFileMeta = {
  name: string;
  sizeBytes: number;
  lastWriteTimeUtc: string;
};

type FailedListResponse = {
  folder: string;
  files: FailedFileMeta[];
};

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

type Props = {
  apiUrl: string;
  onImportClick: () => void;
  isImporting: boolean;
  /** Tăng sau khi import thành công để làm mới danh sách */
  refreshVersion?: number;
};

export default function FailedSurveysPanel({
  apiUrl,
  onImportClick,
  isImporting,
  refreshVersion = 0,
}: Props) {
  const [folder, setFolder] = useState<string>("");
  const [files, setFiles] = useState<FailedFileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/survey/admin/failed-surveys?includeContent=false`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) {
        setError(`Không tải được danh sách (${res.status})`);
        return;
      }
      const data: FailedListResponse = await res.json();
      setFolder(data.folder);
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch {
      setError("Lỗi mạng khi tải danh sách file lỗi");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadList();
  }, [loadList, refreshVersion]);

  const downloadFile = async (fileName: string) => {
    setBusyName(fileName);
    try {
      const res = await fetch(
        `${apiUrl}/survey/admin/failed-surveys/${encodeURIComponent(fileName)}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) {
        window.alert(`Tải xuống thất bại (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert("Lỗi mạng khi tải file");
    } finally {
      setBusyName(null);
    }
  };

  const deleteFile = async (fileName: string) => {
    if (!window.confirm(`Xóa file "${fileName}"?`)) return;
    setBusyName(fileName);
    try {
      const res = await fetch(
        `${apiUrl}/survey/admin/failed-surveys/${encodeURIComponent(fileName)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      if (!res.ok) {
        window.alert(`Xóa thất bại (${res.status})`);
        return;
      }
      if (previewName === fileName) {
        setPreviewName(null);
        setPreviewText("");
      }
      await loadList();
    } catch {
      window.alert("Lỗi mạng khi xóa file");
    } finally {
      setBusyName(null);
    }
  };

  const deleteAll = async () => {
    if (!files.length) return;
    if (
      !window.confirm(
        `Xóa tất cả ${files.length} file trong thư mục failed-surveys?`
      )
    ) {
      return;
    }
    setBusyName("__all__");
    try {
      const res = await fetch(`${apiUrl}/survey/admin/failed-surveys`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        window.alert(`Xóa hết thất bại (${res.status})`);
        return;
      }
      setPreviewName(null);
      setPreviewText("");
      await loadList();
    } catch {
      window.alert("Lỗi mạng khi xóa hết");
    } finally {
      setBusyName(null);
    }
  };

  const openPreview = async (fileName: string) => {
    setPreviewName(fileName);
    setPreviewText("");
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/survey/admin/failed-surveys/${encodeURIComponent(fileName)}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) {
        setPreviewText(`(Không đọc được: ${res.status})`);
        return;
      }
      setPreviewText(await res.text());
    } catch {
      setPreviewText("(Lỗi mạng)");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewName(null);
    setPreviewText("");
  };

  const formatSize = (n: number) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            File khảo sát lỗi
          </h2>
          {folder && (
            <p className="mt-1 text-xs text-gray-500 break-all">
              Thư mục server: {folder}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadList()}
            disabled={loading || busyName !== null}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Làm mới
          </button>
          <button
            type="button"
            onClick={onImportClick}
            disabled={isImporting}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:bg-amber-300"
          >
            {isImporting ? "Đang import..." : "Import từ file JSON"}
          </button>
          <button
            type="button"
            onClick={() => void deleteAll()}
            disabled={loading || !files.length || busyName !== null}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 text-red-700 dark:text-red-400 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
          >
            Xóa hết
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Đang tải danh sách...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-500 text-sm">
          Chưa có file nào trong thư mục failed-surveys.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-600 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">Tên file</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Kích thước
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Cập nhật (UTC)
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const busy = busyName === f.name;
                return (
                  <tr
                    key={f.name}
                    className="border-b border-gray-100 dark:border-gray-800/80 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs break-all max-w-[240px]">
                      {f.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {formatSize(f.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {formatTime(f.lastWriteTimeUtc)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void openPreview(f.name)}
                          disabled={busy || busyName === "__all__"}
                          className="px-2 py-1 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadFile(f.name)}
                          disabled={busy || busyName === "__all__"}
                          className="px-2 py-1 text-xs font-medium rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 disabled:opacity-50"
                        >
                          Tải xuống
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteFile(f.name)}
                          disabled={busy || busyName === "__all__"}
                          className="px-2 py-1 text-xs font-medium rounded-md text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {previewName && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closePreview}
          role="presentation"
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-white/90 truncate font-mono text-sm">
                {previewName}
              </h3>
              <button
                type="button"
                onClick={closePreview}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Đóng
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewLoading ? (
                <p className="text-gray-500 text-sm">Đang đọc...</p>
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                  {previewText}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
