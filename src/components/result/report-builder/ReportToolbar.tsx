"use client";

import React from "react";
import {
  BarChart3,
  Bookmark,
  CopyPlus,
  Download,
  FunctionSquare,
  Lock,
  Printer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { ReportDefinition, SystemReportPreset } from "@/lib/report-engine";
import type { ReportViewItem } from "@/types/report";

type Props = {
  definition: ReportDefinition;
  onChangeMode?: (mode: "overview" | "custom") => void;
  onReset: () => void;
  onOpenComputedDrawer: () => void;
  onOpenExportModal: () => void;
  onOpenSaveModal: (mode: "create" | "update" | "clone") => void;
  onDeleteActiveView?: (viewId: string) => void;
  systemPresets: SystemReportPreset[];
  savedViews: ReportViewItem[];
  activeViewId: string | null;
  onSelectPresetOrView: (id: string, kind: "system" | "saved") => void;
  canExportData: boolean;
  piiIncluded: boolean;
  piiCount: number;
  onTogglePii: (include: boolean) => void;
  piiLoading?: boolean;
  isComputing?: boolean;
  durationMs?: number;
};

export default function ReportToolbar({
  definition,
  onReset,
  onOpenComputedDrawer,
  onOpenExportModal,
  onOpenSaveModal,
  onDeleteActiveView,
  systemPresets,
  savedViews,
  activeViewId,
  onSelectPresetOrView,
  canExportData,
  piiIncluded,
  piiCount,
  onTogglePii,
  piiLoading = false,
  isComputing = false,
  durationMs = 0,
}: Props) {
  const activeSavedView = savedViews.find((v) => v.id === activeViewId);
  const selectValue = activeViewId
    ? `saved:${activeViewId}`
    : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* LEFT: SAVED VIEWS & SYSTEM TEMPLATES SELECTOR */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Bookmark size={14} className="text-slate-400" />
            <select
              aria-label="Chọn mẫu báo cáo"
              data-testid="rb-view-selector"
              value={selectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                if (v.startsWith("system:")) {
                  onSelectPresetOrView(v.slice(7), "system");
                } else if (v.startsWith("saved:")) {
                  onSelectPresetOrView(v.slice(6), "saved");
                }
              }}
              className="h-9 max-w-[240px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">-- Mẫu báo cáo dựng sẵn / Đã lưu --</option>
              {systemPresets.length > 0 && (
                <optgroup label="Mẫu tự động theo khảo sát (Hệ thống)">
                  {systemPresets.map((p) => (
                    <option key={p.id} value={`system:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {savedViews.filter((v) => v.scope === "PRIVATE").length > 0 && (
                <optgroup label="Mẫu cá nhân của tôi">
                  {savedViews
                    .filter((v) => v.scope === "PRIVATE")
                    .map((v) => (
                      <option key={v.id} value={`saved:${v.id}`}>
                        {v.name} {v.isDefault ? "★" : ""}
                      </option>
                    ))}
                </optgroup>
              )}
              {savedViews.filter((v) => v.scope === "SHARED").length > 0 && (
                <optgroup label="Mẫu chia sẻ trong nhóm">
                  {savedViews
                    .filter((v) => v.scope === "SHARED")
                    .map((v) => (
                      <option key={v.id} value={`saved:${v.id}`}>
                        {v.name} {v.isDefault ? "★" : ""}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>

            {activeSavedView && activeSavedView.canEdit ? (
              <>
                <button
                  type="button"
                  data-testid="rb-update-view-btn"
                  onClick={() => onOpenSaveModal("update")}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Cập nhật mẫu đang mở"
                >
                  Lưu thay đổi
                </button>
                <button
                  type="button"
                  data-testid="rb-clone-view-btn"
                  onClick={() => onOpenSaveModal("clone")}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Lưu thành bản sao mới"
                >
                  <CopyPlus size={13} />
                </button>
                {onDeleteActiveView && (
                  <button
                    type="button"
                    data-testid="rb-delete-view-btn"
                    onClick={() => onDeleteActiveView(activeSavedView.id)}
                    className="inline-flex h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                    title="Xóa mẫu đã lưu"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                data-testid="rb-save-view-btn"
                onClick={() => onOpenSaveModal(activeSavedView ? "clone" : "create")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <CopyPlus size={13} />
                {activeSavedView ? "Lưu bản sao" : "Lưu mẫu"}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: COMPUTED FIELDS + PII TOGGLE + EXPORT + RESET */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="rb-open-computed-btn"
            onClick={onOpenComputedDrawer}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            <FunctionSquare size={14} />
            Cột tự tạo / Công thức
            {definition.computedFields.length > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {definition.computedFields.length}
              </span>
            )}
          </button>

          {piiCount > 0 && (
            canExportData ? (
              <button
                type="button"
                disabled={piiLoading}
                data-testid="rb-toggle-pii-btn"
                onClick={() => onTogglePii(!piiIncluded)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                  piiIncluded
                    ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                }`}
                title={
                  piiIncluded
                    ? "Đang hiển thị đầy đủ dữ liệu nhạy cảm (SĐT, Email, Họ tên...). Bấm để che lại."
                    : "Đang tự động che PII. Bấm để mở khóa dữ liệu thật (yêu cầu quyền EXPORT_DATA)."
                }
              >
                {piiIncluded ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                {piiLoading ? "Đang tải..." : piiIncluded ? "Đang hiện PII" : `Đang che ${piiCount} cột PII`}
              </button>
            ) : (
              <span
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                title="Tài khoản chưa có quyền EXPORT_DATA nên thông tin nhạy cảm (PII) luôn được che."
              >
                <Lock size={13} />
                Đã che {piiCount} cột PII
              </span>
            )
          )}

          <button
            type="button"
            data-testid="rb-export-btn"
            onClick={onOpenExportModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
          >
            <Download size={14} />
            Xuất Excel / CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 print:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="In hoặc lưu PDF qua trình duyệt"
          >
            <Printer size={14} />
          </button>

          <button
            type="button"
            data-testid="rb-reset-btn"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Khôi phục cấu hình mặc định"
          >
            <RotateCcw size={13} />
            Đặt lại
          </button>
        </div>
      </div>

      {/* SUBTLE PERF / COMPUTING INDICATOR */}
      {(isComputing || durationMs > 50) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <BarChart3 size={12} />
          {isComputing ? "Đang tổng hợp dữ liệu lớn trên Web Worker…" : `Xử lý xong trong ${durationMs} ms`}
        </div>
      )}
    </div>
  );
}

