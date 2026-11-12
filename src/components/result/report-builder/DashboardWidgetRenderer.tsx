"use client";

import React, { useMemo } from "react";
import { Filter, FilterX, Pencil } from "lucide-react";
import type {
  DashboardWidgetSpec,
  ReportDefinition,
  ReportOutput,
} from "@/lib/report-engine";
import type { DatasetRecord } from "@/types/report";
import ResultChartView from "./ResultChartView";
import ResultTable from "./ResultTable";
import KpiWidgetCard from "./KpiWidgetCard";

type Props = {
  widget: DashboardWidgetSpec;
  output?: ReportOutput;
  recordMap: Map<string, DatasetRecord>;
  onDrillDown: (
    records: DatasetRecord[],
    title: string,
    subtitle?: string,
    targetQuestionId?: string
  ) => void;
  isSetupMode?: boolean;
  onEditWidget?: () => void;
};

export default function DashboardWidgetRenderer({
  widget,
  output,
  recordMap,
  onDrillDown,
  isSetupMode = false,
  onEditWidget,
}: Props) {
  const definition = useMemo<ReportDefinition>(() => {
    return {
      version: 1,
      mode: "custom",
      name: widget.title,
      filterTree: widget.filterTree,
      computedFields: [],
      groupBy: widget.groupBy || [],
      measures: widget.measures || [],
      chart: widget.chart || { enabled: true, type: "groupedBar" },
      viewOptions: widget.viewOptions || {
        showEmptyGroups: false,
        sortBy: "group",
        sortDir: "asc",
        maxGroups: 15,
        includeGrandTotal: true,
        pivot: false,
      },
    };
  }, [
    widget.title,
    widget.filterTree,
    widget.groupBy,
    widget.measures,
    widget.chart,
    widget.viewOptions,
  ]);

  const hasFilterTree = Boolean(
    widget.filterTree &&
      widget.filterTree.children &&
      widget.filterTree.children.length > 0
  );

  return (
    <div
      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition dark:border-slate-800 dark:bg-slate-900"
      data-testid={`widget-${widget.id}`}
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {widget.title || "Khối báo cáo"}
            </h3>

            {hasFilterTree && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                title="Khối này đang có điều kiện lọc riêng"
              >
                <Filter size={10} /> Lọc riêng
              </span>
            )}

            {widget.ignoreGlobalFilter && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                title="Khối này bỏ qua bộ lọc chung của báo cáo"
              >
                <FilterX size={10} /> Không lọc chung
              </span>
            )}
          </div>

          {widget.subtitle && (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {widget.subtitle}
            </p>
          )}
        </div>

        {isSetupMode && onEditWidget && (
          <button
            type="button"
            onClick={onEditWidget}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <Pencil size={12} /> Sửa
          </button>
        )}
      </div>

      {/* Body */}
      <div className="w-full flex-1">
        {!output ? (
          <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-xs text-slate-400 dark:border-slate-800">
            Đang tính toán số liệu khối...
          </div>
        ) : widget.displayMode === "kpi" ? (
          <KpiWidgetCard
            widget={widget}
            output={output}
            recordMap={recordMap}
            onDrillDown={(recs, t, st) => onDrillDown(recs, t, st)}
          />
        ) : widget.displayMode === "chart" ? (
          <ResultChartView
            definition={definition}
            output={output}
            recordMap={recordMap}
            embedded
            hideToolbar={!isSetupMode}
            chartHeight={260}
            onDrillDown={(recs, t, st) => onDrillDown(recs, t, st)}
          />
        ) : widget.displayMode === "table" ? (
          <ResultTable
            definition={definition}
            output={output}
            recordMap={recordMap}
            embedded
            onDrillDown={onDrillDown}
          />
        ) : (
          /* chartAndTable */
          <div className="flex flex-col gap-4">
            <ResultChartView
              definition={definition}
              output={output}
              recordMap={recordMap}
              embedded
              hideToolbar={!isSetupMode}
              chartHeight={260}
              onDrillDown={(recs, t, st) => onDrillDown(recs, t, st)}
            />
            <ResultTable
              definition={definition}
              output={output}
              recordMap={recordMap}
              embedded
              onDrillDown={onDrillDown}
            />
          </div>
        )}
      </div>
    </div>
  );
}

