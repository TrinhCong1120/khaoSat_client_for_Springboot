"use client";

import React from "react";
import { AlertTriangle, Download, FunctionSquare, Save } from "lucide-react";
import type {
  ReportDefinition,
  ReportOutput,
  SurveyFieldMeta,
} from "@/lib/report-engine";
import { createEmptyFilterTree } from "@/lib/report-engine";
import type { DatasetRecord } from "@/types/report";
import BuilderConfigPanel from "./BuilderConfigPanel";
import ResultChartView from "./ResultChartView";
import ResultTable from "./ResultTable";

type Props = {
  definition: ReportDefinition;
  onChangeDefinition: (next: ReportDefinition) => void;
  output: ReportOutput;
  fieldMetas: SurveyFieldMeta[];
  recordMap: Map<string, DatasetRecord>;
  onDrillDown: (
    records: DatasetRecord[],
    title: string,
    subtitle?: string,
    targetQuestionId?: string
  ) => void;
  onOpenComputedDrawer?: () => void;
  onOpenExportModal?: () => void;
  onOpenSaveModal?: () => void;
};

export default function DynamicReportBuilder({
  definition,
  onChangeDefinition,
  output,
  fieldMetas,
  recordMap,
  onDrillDown,
  onOpenComputedDrawer,
  onOpenExportModal,
  onOpenSaveModal,
}: Props) {
  const errorStatuses = output.computedStatuses.filter(
    (s) => Boolean(s.syntaxError) || s.runtimeErrorCount > 0
  );

  return (
    <div className="space-y-4">
      {/* Header strip for custom mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-linear-to-r from-blue-50/80 via-white to-slate-50 px-4 py-3 dark:border-blue-900/50 dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Trình thiết kế báo cáo tổng hợp động
          </h3>
          <p className="text-xs text-slate-500">
            Tùy chọn bất kỳ câu hỏi/công thức để gom nhóm (tối đa 3 cấp), tính nhiều chỉ số hoặc xoay bảng Pivot 2 chiều. Bấm vào số liệu để mở danh sách bài nộp gốc.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenComputedDrawer && (
            <button
              type="button"
              onClick={onOpenComputedDrawer}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300"
            >
              <FunctionSquare size={13} />
              Cột tự tạo ({definition.computedFields.length})
            </button>
          )}
          {onOpenSaveModal && (
            <button
              type="button"
              onClick={onOpenSaveModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Save size={13} />
              Lưu mẫu
            </button>
          )}
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Download size={13} />
              Xuất Excel / CSV
            </button>
          )}
        </div>
      </div>

      {/* Formula / Computed Field Error Notice */}
      {errorStatuses.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Có lỗi ở cột tự tạo / công thức: </span>
              {errorStatuses
                .map((s) =>
                  s.syntaxError
                    ? `${s.fieldName} (${s.syntaxError})`
                    : `${s.fieldName} (${s.runtimeErrorCount} dòng: ${s.sampleErrors[0] ?? "Lỗi tính toán"})`
                )
                .join(" · ")}
            </div>
          </div>
          {onOpenComputedDrawer && (
            <button
              type="button"
              onClick={onOpenComputedDrawer}
              className="rounded-lg bg-amber-200/70 px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200"
            >
              Kiểm tra công thức
            </button>
          )}
        </div>
      )}

      {/* Dimension & Measure Builder Panel */}
      <BuilderConfigPanel
        definition={definition}
        onChange={onChangeDefinition}
        fieldMetas={fieldMetas}
      />

      {/* Synchronized Interactive Chart */}
      <ResultChartView
        definition={definition}
        output={output}
        recordMap={recordMap}
        onChangeChart={(chart) => onChangeDefinition({ ...definition, chart })}
        onDrillDown={onDrillDown}
      />

      {/* Interactive Drill-Down Aggregation / Pivot Table */}
      <ResultTable
        definition={definition}
        output={output}
        recordMap={recordMap}
        onChangeSort={(sortBy, sortDir) =>
          onChangeDefinition({
            ...definition,
            viewOptions: { ...definition.viewOptions, sortBy, sortDir },
          })
        }
        onDrillDown={onDrillDown}
        onClearFilters={() =>
          onChangeDefinition({
            ...definition,
            filterTree: createEmptyFilterTree(),
          })
        }
      />
    </div>
  );
}

