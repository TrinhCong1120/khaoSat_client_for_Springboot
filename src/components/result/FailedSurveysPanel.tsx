"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteAllFailedSurveyFiles,
  deleteFailedSurveyFile,
  getFailedSurveyFileContent,
  listFailedSurveyFiles,
} from "@/lib/failedSurveyStorage";

type FailedFileMeta = {
  name: string;
  sizeBytes: number;
  lastWriteTimeUtc: string;
  source?: "local" | "server";
  content?: string;
};

type Props = {
  onImportClick: () => void;
  onImportStoredFile: (fileName: string) => Promise<boolean>;
  isImporting: boolean;
  /** Tăng sau khi import thành công để làm mới danh sách */
  refreshVersion?: number;
};

export default function FailedSurveysPanel({
  onImportClick,
  onImportStoredFile,
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
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const loadList = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const serverFiles = await listFailedSurveyFiles();
      setFolder("public/failed-surveys");
      setFiles(
        serverFiles.map((file) => ({
          name: file.fileName,
          sizeBytes: file.fileSize,
          lastWriteTimeUtc: file.lastModified,
        }))
      );
      setSelectedNames((current) =>
        current.filter((name) => serverFiles.some((file) => file.fileName === name))
      );
    } catch {
      setFolder("public/failed-surveys");
      setFiles([]);
      setError("Không tải được danh sách file lỗi từ public/failed-surveys.");
    } finally {
      setLoading(false);
    }
  }, []);

  const allSelected = files.length > 0 && selectedNames.length === files.length;

  const toggleSelected = (fileName: string) => {
    setSelectedNames((current) =>
      current.includes(fileName)
        ? current.filter((name) => name !== fileName)
        : [...current, fileName]
    );
  };

  const toggleAllSelected = () => {
    setSelectedNames(allSelected ? [] : files.map((file) => file.name));
  };

  const importSelectedFiles = async () => {
    if (!selectedNames.length || isBatchImporting) return;

    setIsBatchImporting(true);
    setBatchProgress(0);
    let importedCount = 0;

    try {
      for (const fileName of selectedNames) {
        setBusyName(fileName);
        const imported = await onImportStoredFile(fileName);
        if (imported) {
          const deleted = await deleteFailedSurveyFile(fileName);
          if (deleted) importedCount += 1;
        }
        setBatchProgress((current) => current + 1);
      }

      setSelectedNames([]);
      setIsImportModalOpen(false);
      await loadList();
      window.alert(
        `Đã import và xóa ${importedCount}/${selectedNames.length} file. File chưa import hoàn tất vẫn được giữ lại.`
      );
    } catch {
      window.alert("Có lỗi khi import các file đã chọn. Những file chưa hoàn tất vẫn được giữ lại.");
    } finally {
      setBusyName(null);
      setIsBatchImporting(false);
      setBatchProgress(0);
    }
  };

  useEffect(() => {
    void loadList();
  }, [loadList, refreshVersion]);

  const downloadFile = async (fileName: string) => {
    setBusyName(fileName);
    try {
      const content = await getFailedSurveyFileContent(fileName);
      if (!content) {
        window.alert("Không tìm thấy nội dung file");
        return;
      }

      const blob = new Blob([content], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert("Lỗi khi tải file");
    } finally {
      setBusyName(null);
    }
  };

  const deleteFile = async (fileName: string) => {
    if (!window.confirm(`Xóa file "${fileName}"?`)) return;
    setBusyName(fileName);
    try {
      const ok = await deleteFailedSurveyFile(fileName);
      if (!ok) {
        window.alert("Xóa thất bại");
        return;
      }
      if (previewName === fileName) {
        setPreviewName(null);
        setPreviewText("");
      }
      await loadList();
    } catch {
      window.alert("Lỗi khi xóa file");
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
      const ok = await deleteAllFailedSurveyFiles();
      if (!ok) {
        window.alert("Xóa hết thất bại");
        return;
      }
      setPreviewName(null);
      setPreviewText("");
      await loadList();
    } catch {
      window.alert("Lỗi khi xóa hết");
    } finally {
      setBusyName(null);
    }
  };

  const openPreview = async (fileName: string) => {
    setPreviewName(fileName);
    setPreviewText("");
    setPreviewLoading(true);
    try {
      const text = await getFailedSurveyFileContent(fileName);
      setPreviewText(text ?? "(Không đọc được file)");
    } catch {
      setPreviewText("(Lỗi khi đọc file)");
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
            disabled={isImporting || isBatchImporting}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:bg-amber-300"
          >
            {isImporting ? "Đang import..." : "Import từ file JSON"}
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            disabled={!selectedNames.length || isImporting || isBatchImporting}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300"
          >
            Import đã chọn ({selectedNames.length})
          </button>
          <button
            type="button"
            onClick={() => void deleteAll()}
            disabled={loading || !files.length || busyName !== null || isBatchImporting}
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
                <th className="px-4 py-3 font-medium w-12">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả file"
                    checked={allSelected}
                    onChange={toggleAllSelected}
                    disabled={isBatchImporting}
                  />
                </th>
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
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${f.name}`}
                        checked={selectedNames.includes(f.name)}
                        onChange={() => toggleSelected(f.name)}
                        disabled={isBatchImporting}
                      />
                    </td>
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

      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !isBatchImporting && setIsImportModalOpen(false)}
          role="presentation"
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full border border-gray-200 dark:border-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-white/90">
                Import file đã chọn
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Các file sẽ được import trực tiếp từ thư mục server, sau đó xóa nếu import hoàn tất.
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto px-5 py-4 space-y-2">
              {selectedNames.map((name) => (
                <div key={name} className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                  {name}
                </div>
              ))}
              {isBatchImporting && (
                <p className="pt-2 text-sm text-blue-600 dark:text-blue-400">
                  Đang xử lý {batchProgress}/{selectedNames.length} file...
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isBatchImporting}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void importSelectedFiles()}
                disabled={isBatchImporting || !selectedNames.length}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300"
              >
                {isBatchImporting ? "Đang import..." : "Import và xóa file"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
