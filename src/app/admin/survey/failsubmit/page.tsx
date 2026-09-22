"use client";

import { ChangeEvent, useRef, useState } from "react";

import FailedSurveysPanel from "@/components/result/FailedSurveysPanel";
import { API_FAILED_SURVEYS } from "@/lib/api";
import { getFailedSurveyFileContent } from "@/lib/failedSurveyStorage";

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

export default function SurveyFailSubmitPage() {
  const [isImportingFailed, setIsImportingFailed] = useState(false);
  const [failedFilesRefreshVersion, setFailedFilesRefreshVersion] = useState(0);
  const failedImportInputRef = useRef<HTMLInputElement | null>(null);

  const importFileToBackend = async (file: File): Promise<{
    ok: boolean;
    failedRemain: number;
    message?: string;
  }> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_FAILED_SURVEYS}/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (!res.ok) {
        return {
          ok: false,
          failedRemain: 0,
          message: (await res.text()) || `Import thất bại (${res.status})`,
        };
      }

      const raw = await res.text();
      let result: { failedRemain?: number } = {};
      try {
        result = raw ? JSON.parse(raw) : {};
      } catch {
        result = {};
      }

      const failedRemain = Number(result.failedRemain ?? 0);
      return { ok: failedRemain === 0, failedRemain };
    } catch {
      return {
        ok: false,
        failedRemain: 0,
        message: "Lỗi mạng khi import failed submissions",
      };
    }
  };

  const importFailedSubmissions = async (file: File) => {
    if (isImportingFailed) return;
    setIsImportingFailed(true);
    try {
      const result = await importFileToBackend(file);
      if (!result.ok) {
        window.alert(result.message || "Import chưa hoàn tất, file được giữ lại.");
        return;
      }

      window.alert(
        "Import xong. File gốc được chọn từ máy sẽ không bị xóa tự động."
      );
      setFailedFilesRefreshVersion((v) => v + 1);
    } catch {
      window.alert("Lỗi mạng khi import failed submissions");
    } finally {
      setIsImportingFailed(false);
    }
  };

  const importStoredFile = async (fileName: string) => {
    const content = await getFailedSurveyFileContent(fileName);
    if (!content) return false;

    const result = await importFileToBackend(
      new File([content], fileName, { type: "application/json" })
    );

    if (!result.ok && result.message) {
      window.alert(`${fileName}: ${result.message}`);
    }

    return result.ok;
  };

  const onSelectFailedImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      window.alert("Vui lòng chọn file .json");
      return;
    }

    await importFailedSubmissions(file);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Phản hồi gửi lỗi 
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Xem, tải, xóa file JSON lưu khi gửi khảo sát thất bại; import lại vào
              cơ sở dữ liệu.
            </p>
          </div>
        </div>

        <input
          ref={failedImportInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onSelectFailedImportFile}
        />

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5">
          <FailedSurveysPanel
            onImportClick={() => failedImportInputRef.current?.click()}
            onImportStoredFile={importStoredFile}
            isImporting={isImportingFailed}
            refreshVersion={failedFilesRefreshVersion}
          />
        </div>
      </div>
    </div>
  );
}
