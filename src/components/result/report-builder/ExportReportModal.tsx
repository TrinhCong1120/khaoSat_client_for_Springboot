"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, Download, FileSpreadsheet, FileText, Lock, ShieldAlert, X } from "lucide-react";
import type {
  CustomDashboardDefinition,
  CustomDashboardOutput,
  FieldRef,
  ReportDefinition,
  ReportOutput,
  SurveyFieldMeta,
} from "@/lib/report-engine";
import {
  buildDetailsCsv,
  buildReportWorkbookBuffer,
  buildSummaryCsv,
  triggerBlobDownload,
  type DetailExportColumn,
} from "@/lib/report-export";
import { buildDashboardWorkbookBuffer } from "@/lib/report-export/excel";
import { recordReportExportLog } from "@/lib/report-views-api";
import type { SurveyResultQuestion } from "@/types/report";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
  surveyTitle: string;
  definition?: ReportDefinition;
  output?: ReportOutput;
  questions: SurveyResultQuestion[];
  fieldMetas: SurveyFieldMeta[];
  canExportData: boolean;
  piiIncluded: boolean;
  dashboardMode?: {
    definition: CustomDashboardDefinition;
    output: CustomDashboardOutput;
  };
};

type ColumnSelectionState = {
  ref: FieldRef;
  selected: boolean;
  maskOnExport: boolean;
};

function toFileSlug(input: string): string {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "bao-cao-khao-sat";
}

export default function ExportReportModal({
  isOpen,
  onClose,
  surveyId,
  surveyTitle,
  definition,
  output,
  questions,
  fieldMetas,
  canExportData,
  piiIncluded,
  dashboardMode,
}: Props) {
  const [format, setFormat] = useState<"EXCEL" | "CSV">("EXCEL");
  const [reportName, setReportName] = useState("");
  const [includeSheets, setIncludeSheets] = useState({
    overview: true,
    summary: true,
    details: true,
  });
  const [csvScope, setCsvScope] = useState<"summary" | "details">("summary");
  const [colStates, setColStates] = useState<ColumnSelectionState[]>([]);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const exportableFields = useMemo(
    () => fieldMetas.filter((m) => m.ref !== "system:submittedAt"),
    [fieldMetas]
  );

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    const initialName =
      dashboardMode?.definition.name?.trim() ||
      definition?.name?.trim() ||
      `Báo cáo - ${surveyTitle}`;
    setReportName(initialName);
    setColStates(
      exportableFields.map((m) => ({
        ref: m.ref,
        selected: true,
        maskOnExport: m.isPii ? !(canExportData && piiIncluded) : false,
      }))
    );
  }, [
    isOpen,
    dashboardMode?.definition.name,
    definition?.name,
    surveyTitle,
    exportableFields,
    canExportData,
    piiIncluded,
  ]);

  if (!isOpen) return null;

  const fieldMap = new Map(exportableFields.map((m) => [m.ref, m]));
  const selectedColumnsCount = colStates.filter((c) => c.selected).length;
  const anyExcelSheetSelected =
    includeSheets.overview || includeSheets.summary || includeSheets.details;

  const toggleAllColumns = (checked: boolean) => {
    setColStates((prev) => prev.map((c) => ({ ...c, selected: checked })));
  };

  const toggleColumn = (ref: string) => {
    setColStates((prev) =>
      prev.map((c) => (c.ref === ref ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleColumnMask = (ref: string) => {
    if (!(canExportData && piiIncluded)) return;
    setColStates((prev) =>
      prev.map((c) => (c.ref === ref ? { ...c, maskOnExport: !c.maskOnExport } : c))
    );
  };

  const handleExport = async () => {
    if (!dashboardMode && format === "EXCEL" && !anyExcelSheetSelected) {
      setErrorMsg("Vui lòng chọn ít nhất 1 sheet để xuất Excel.");
      return;
    }

    const needDetails = dashboardMode
      ? includeSheets.details
      : (format === "EXCEL" && includeSheets.details) ||
        (format === "CSV" && csvScope === "details");

    if (needDetails && selectedColumnsCount === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 cột cho dữ liệu chi tiết.");
      return;
    }

    setExporting(true);
    setErrorMsg(null);

    try {
      const detailColumns: DetailExportColumn[] = colStates
        .filter((c) => c.selected)
        .map((c) => {
          const meta = fieldMap.get(c.ref);
          return {
            id: c.ref,
            label: meta?.label ?? c.ref,
            kind: meta?.kind === "computed" ? "computed" : "field",
            fieldRef: meta?.ref,
            isPii: meta?.isPii,
            maskOnExport: meta?.isPii ? c.maskOnExport || !(canExportData && piiIncluded) : false,
          };
        });

      const includedUnmaskedPii =
        needDetails &&
        canExportData &&
        piiIncluded &&
        detailColumns.some((c) => c.isPii && !c.maskOnExport);

      const safeTitle =
        reportName.trim() ||
        (dashboardMode ? "Báo cáo tổng hợp" : "Báo cáo tổng hợp động");
      const dateStamp = new Date().toISOString().slice(0, 10);
      const baseSlug = toFileSlug(safeTitle);

      if (dashboardMode) {
        const buffer = await buildDashboardWorkbookBuffer({
          surveyTitle,
          dashboardName: safeTitle,
          dashboardDef: dashboardMode.definition,
          dashboardOutput: dashboardMode.output,
          questions,
          fieldMetas,
          piiIncluded: Boolean(includedUnmaskedPii),
          includeRawDetails: includeSheets.details,
        });
        triggerBlobDownload(
          buffer,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          `${baseSlug}-${dateStamp}.xlsx`
        );
      } else if (format === "EXCEL") {
        if (!definition || !output) {
          throw new Error("Thiếu dữ liệu báo cáo để xuất.");
        }
        const buffer = await buildReportWorkbookBuffer({
          surveyTitle,
          reportName: safeTitle,
          definition,
          output,
          questions,
          fieldMetas,
          piiIncluded: includedUnmaskedPii,
          includeSheets,
          detailColumns,
        });
        triggerBlobDownload(
          buffer,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          `${baseSlug}-${dateStamp}.xlsx`
        );
      } else {
        if (!definition || !output) {
          throw new Error("Thiếu dữ liệu báo cáo để xuất.");
        }
        const csvContent =
          csvScope === "summary"
            ? buildSummaryCsv(definition, output)
            : buildDetailsCsv(output, detailColumns, questions);
        triggerBlobDownload(
          csvContent,
          "text/csv;charset=utf-8",
          `${baseSlug}-${csvScope}-${dateStamp}.csv`
        );
      }

      const rowCount = dashboardMode
        ? dashboardMode.output.globalFilteredRecords.length
        : (format === "EXCEL" && includeSheets.details) || (format === "CSV" && csvScope === "details")
        ? output?.filteredRecords.length ?? 0
        : output?.rows.length ?? 0;

      try {
        await recordReportExportLog(surveyId, {
          exportFormat: dashboardMode ? "EXCEL" : format,
          reportName: safeTitle,
          rowCount,
          includedPii: includedUnmaskedPii,
          definition: (dashboardMode ? dashboardMode.definition : definition) as unknown as Record<string, unknown>,
        });
      } catch {
        // Non-blocking audit telemetry if user lacks EXPORT_DATA or offline; export itself succeeded
      }

      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể tạo file báo cáo.");
    } finally {
      setExporting(false);
    }
  };

  const showDetailColumns = dashboardMode
    ? includeSheets.details
    : (format === "EXCEL" && includeSheets.details) ||
      (format === "CSV" && csvScope === "details");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-report-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Download size={18} />
            </div>
            <div>
              <h2 id="export-report-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                {dashboardMode ? "Xuất báo cáo tổng hợp (Dashboard)" : "Xuất báo cáo tùy biến"}
              </h2>
              <p className="text-xs text-slate-500">
                {dashboardMode
                  ? `${dashboardMode.output.globalFilteredRecords.length} phản hồi đã lọc · ${dashboardMode.definition.widgets.length} khối báo cáo`
                  : `${output?.filteredRecords.length ?? 0} phản hồi đã lọc · ${output?.rows.length ?? 0} dòng tổng hợp`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại xuất báo cáo"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Format selector */}
          {dashboardMode ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500 bg-emerald-50/70 p-3.5 ring-1 ring-emerald-500 dark:border-emerald-500 dark:bg-emerald-950/30">
              <FileSpreadsheet size={20} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Excel Dashboard (.xlsx)</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Xuất toàn bộ {dashboardMode.definition.widgets.length} khối báo cáo thành các sheet riêng biệt kèm thông tin tổng quan và dữ liệu chi tiết.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-testid="rb-export-format-excel"
                onClick={() => setFormat("EXCEL")}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  format === "EXCEL"
                    ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500 dark:border-emerald-500 dark:bg-emerald-950/30"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
                }`}
              >
                <FileSpreadsheet size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Excel (.xlsx)</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Đa sheet (Tổng quan, Tổng hợp, Chi tiết) kèm highlight Best/Worst.
                  </p>
                </div>
              </button>

              <button
                type="button"
                data-testid="rb-export-format-csv"
                onClick={() => setFormat("CSV")}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  format === "CSV"
                    ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-950/30"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
                }`}
              >
                <FileText size={20} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">CSV (UTF-8 BOM)</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Chuẩn RFC-4180 mở trực tiếp trong Excel tiếng Việt không lỗi font.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Report Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tên báo cáo
            </label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="Ví dụ: Thống kê tổng hợp theo đơn vị"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Sheet / CSV scope options */}
          {dashboardMode ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Cấu trúc tệp Excel xuất ra
              </p>
              <ul className="list-inside list-disc space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                <li>
                  <b>Sheet 1 (Tong_quan):</b> Thông tin báo cáo &amp; bộ lọc toàn cục.
                </li>
                <li>
                  <b>Sheets khối ({dashboardMode.definition.widgets.length} khối):</b>{" "}
                  {dashboardMode.definition.widgets.map((w) => w.title || "Khối").join(", ")}.
                </li>
              </ul>
              <div className="pt-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeSheets.details}
                    onChange={(e) =>
                      setIncludeSheets((prev) => ({ ...prev, details: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Kèm Sheet Dữ liệu chi tiết ({dashboardMode.output.globalFilteredRecords.length} phản hồi)
                </label>
              </div>
            </div>
          ) : format === "EXCEL" ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chọn các Sheet muốn xuất
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { key: "overview" as const, title: "1. Tong_quan", sub: "Thông tin & bộ lọc" },
                  { key: "summary" as const, title: "2. Bang_tong_hop", sub: "Bảng gom nhóm / Pivot" },
                  {
                    key: "details" as const,
                    title: "3. Du_lieu_chi_tiet",
                    sub: `${output?.filteredRecords.length ?? 0} dòng`,
                  },
                ].map((sheet) => (
                  <label
                    key={sheet.key}
                    className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={includeSheets[sheet.key]}
                      onChange={(e) =>
                        setIncludeSheets((prev) => ({ ...prev, [sheet.key]: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <div>
                      <span className="block font-semibold text-slate-900 dark:text-white">
                        {sheet.title}
                      </span>
                      <span className="text-[11px] text-slate-500">{sheet.sub}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Dữ liệu CSV cần xuất
              </p>
              <div className="flex gap-3">
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                  <input
                    type="radio"
                    name="csv-scope"
                    checked={csvScope === "summary"}
                    onChange={() => setCsvScope("summary")}
                  />
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Bảng tổng hợp ({output?.rows.length ?? 0} dòng)
                  </span>
                </label>
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                  <input
                    type="radio"
                    name="csv-scope"
                    checked={csvScope === "details"}
                    onChange={() => setCsvScope("details")}
                  />
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Dữ liệu chi tiết ({output?.filteredRecords.length ?? 0} phản hồi)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Column selector & PII override */}
          {showDetailColumns && (
            <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Cột trong dữ liệu chi tiết ({selectedColumnsCount}/{colStates.length})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ID Phản hồi và Thời gian nộp được tự động đưa vào đầu bảng.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleAllColumns(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
                  >
                    <CheckSquare size={12} /> Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllColumns(false)}
                    className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-600 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {!canExportData || !piiIncluded ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  <Lock size={13} className="shrink-0" />
                  <span>
                    {!canExportData
                      ? "Tài khoản không có quyền EXPORT_DATA: toàn bộ cột PII sẽ luôn bị che (***) khi xuất."
                      : "Dữ liệu đang ở chế độ che PII mặc định. Mở khóa PII trên thanh công cụ nếu bạn muốn bỏ che từng cột khi xuất."}
                  </span>
                </div>
              ) : null}

              <div className="max-h-52 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {colStates.map((col) => {
                  const meta = fieldMap.get(col.ref);
                  if (!meta) return null;
                  return (
                    <div
                      key={col.ref}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={col.selected}
                          onChange={() => toggleColumn(col.ref)}
                          className="rounded border-slate-300"
                        />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {meta.label}
                        </span>
                        {meta.kind === "computed" && (
                          <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                            Cột tự tạo
                          </span>
                        )}
                      </label>

                      {meta.isPii && (
                        <label
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium ${
                            canExportData && piiIncluded
                              ? "cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950"
                          }`}
                          title={
                            canExportData && piiIncluded
                              ? "Bỏ tick để xuất giá trị gốc không che"
                              : "PII bị khóa che"
                          }
                        >
                          <ShieldAlert size={12} className="text-amber-600" />
                          <input
                            type="checkbox"
                            disabled={!(canExportData && piiIncluded)}
                            checked={col.maskOnExport || !(canExportData && piiIncluded)}
                            onChange={() => toggleColumnMask(col.ref)}
                            className="rounded border-slate-300"
                          />
                          <span>Che PII</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            Hủy
          </button>
          <button
            type="button"
            data-testid="rb-confirm-export"
            disabled={exporting}
            onClick={() => void handleExport()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
          >
            <Download size={14} />
            {exporting ? "Đang tạo file…" : `Tải xuống ${format === "EXCEL" ? ".xlsx" : ".csv"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
