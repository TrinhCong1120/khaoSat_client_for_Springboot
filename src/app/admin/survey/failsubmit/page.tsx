"use client";

import { ChangeEvent, useRef, useState } from "react";
import Link from "next/link";

import FailedSurveysPanel from "@/components/result/FailedSurveysPanel";

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

export default function SurveyFailSubmitPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
  const [isImportingFailed, setIsImportingFailed] = useState(false);
  const [failedFilesRefreshVersion, setFailedFilesRefreshVersion] = useState(0);
  const failedImportInputRef = useRef<HTMLInputElement | null>(null);

  const importFailedSubmissions = async (file: File) => {
    if (isImportingFailed) return;
    setIsImportingFailed(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/survey/admin/import-failed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (!res.ok) {
        const message = await res.text();
        window.alert(message || `Import thất bại (${res.status})`);
        return;
      }

      const result = await res.json();
      window.alert(
        `Import xong: tổng ${result.total}, thành công ${result.imported}, trùng ${result.skippedDuplicate}, còn lỗi ${result.failedRemain}`
      );
      setFailedFilesRefreshVersion((v) => v + 1);
    } catch {
      window.alert("Lỗi mạng khi import failed submissions");
    } finally {
      setIsImportingFailed(false);
    }
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
            apiUrl={API_URL}
            onImportClick={() => failedImportInputRef.current?.click()}
            isImporting={isImportingFailed}
            refreshVersion={failedFilesRefreshVersion}
          />
        </div>
      </div>
    </div>
  );
}
