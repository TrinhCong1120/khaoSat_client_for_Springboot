"use client";

import React, { useEffect, useState } from "react";
import { Bookmark, Globe, Lock, Save, X } from "lucide-react";
import type { ReportViewItem, ReportViewScope } from "@/types/report";

type Props = {
  isOpen: boolean;
  mode: "create" | "update" | "clone";
  activeView?: ReportViewItem | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    scope: ReportViewScope;
    isDefault: boolean;
    mode: "create" | "update" | "clone";
  }) => Promise<void>;
};

export default function SaveViewModal({
  isOpen,
  mode,
  activeView,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<ReportViewScope>("PRIVATE");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (mode === "update" && activeView) {
      setName(activeView.name);
      setDescription(activeView.description ?? "");
      setScope(activeView.scope);
      setIsDefault(activeView.isDefault);
    } else if (mode === "clone" && activeView) {
      setName(`${activeView.name} (Bản sao)`);
      setDescription(activeView.description ?? "");
      setScope("PRIVATE");
      setIsDefault(false);
    } else {
      setName("");
      setDescription("");
      setScope("PRIVATE");
      setIsDefault(false);
    }
  }, [isOpen, mode, activeView]);

  if (!isOpen) return null;

  const title =
    mode === "update"
      ? "Cập nhật mẫu báo cáo"
      : mode === "clone"
        ? "Nhân bản mẫu báo cáo"
        : "Lưu mẫu báo cáo mới";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Vui lòng nhập tên mẫu báo cáo.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        name: trimmed,
        description: description.trim(),
        scope,
        isDefault,
        mode,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể lưu mẫu báo cáo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-view-modal-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <Bookmark size={18} />
            </div>
            <div>
              <h2 id="save-view-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="text-[11px] text-slate-500">
                Lưu bộ lọc, cột tự tạo, nhóm & chỉ số hiện tại vào máy chủ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại lưu mẫu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tên mẫu báo cáo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              data-testid="rb-save-view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={150}
              placeholder="Ví dụ: Tổng hợp theo nhóm A/B"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mô tả ngắn (tùy chọn)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú mục đích sử dụng mẫu báo cáo này…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Phạm vi hiển thị
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setScope("PRIVATE")}
                className={`flex items-start gap-2 rounded-xl border p-3 text-left text-xs transition ${
                  scope === "PRIVATE"
                    ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-950/30"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
                }`}
              >
                <Lock size={15} className="mt-0.5 shrink-0 text-slate-600 dark:text-slate-300" />
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white">Cá nhân</span>
                  <span className="text-[11px] text-slate-500">Chỉ mình bạn thấy</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope("SHARED")}
                className={`flex items-start gap-2 rounded-xl border p-3 text-left text-xs transition ${
                  scope === "SHARED"
                    ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-950/30"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
                }`}
              >
                <Globe size={15} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white">Chia sẻ nhóm</span>
                  <span className="text-[11px] text-slate-500">Thành viên xem kết quả</span>
                </div>
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/50">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Đặt làm mẫu mặc định khi mở kết quả khảo sát
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              data-testid="rb-confirm-save-view"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Đang lưu…" : mode === "update" ? "Cập nhật" : "Lưu mẫu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

