"use client";

import React from "react";
import { ArrowUpRight, Award, Hash, Percent, TrendingUp, Users } from "lucide-react";
import type { DashboardWidgetSpec, MeasureAgg, ReportOutput, ResultCell } from "@/lib/report-engine";
import type { DatasetRecord } from "@/types/report";

type Props = {
  widget: DashboardWidgetSpec;
  output: ReportOutput;
  onDrillDown: (records: DatasetRecord[], title: string, subtitle?: string) => void;
  recordMap: Map<string, DatasetRecord>;
};

const viNumberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

function formatKpiValue(cell?: ResultCell, agg?: MeasureAgg): string {
  if (!cell || cell.value == null) {
    return cell?.displayValue && cell.displayValue !== "—" ? cell.displayValue : "0";
  }
  if (agg === "percentOfTotal") {
    return `${viNumberFormatter.format(cell.value)}%`;
  }
  return viNumberFormatter.format(cell.value);
}

function getAggMeta(agg: MeasureAgg): { label: string; Icon: React.ElementType; color: string } {
  switch (agg) {
    case "count":
      return {
        label: "Số lượng (N)",
        Icon: Users,
        color: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
      };
    case "avg":
      return {
        label: "Trung bình (TB)",
        Icon: TrendingUp,
        color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
      };
    case "sum":
      return {
        label: "Tổng cộng",
        Icon: Hash,
        color: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
      };
    case "max":
      return {
        label: "Cao nhất (Max)",
        Icon: Award,
        color: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
      };
    case "min":
      return {
        label: "Thấp nhất (Min)",
        Icon: ArrowUpRight,
        color: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
      };
    case "percentOfTotal":
      return {
        label: "Tỷ lệ %",
        Icon: Percent,
        color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400",
      };
    default:
      return {
        label: String(agg).toUpperCase(),
        Icon: Hash,
        color: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      };
  }
}

export default function KpiWidgetCard({
  widget,
  output,
  onDrillDown,
  recordMap,
}: Props) {
  const measures = widget.measures.length > 0 ? widget.measures : [];

  if (measures.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
        Chưa có chỉ số (Measure) nào được cấu hình cho KPI này.
      </div>
    );
  }

  const gridColsClass =
    measures.length === 1
      ? "grid-cols-1"
      : measures.length === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : measures.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid gap-3 ${gridColsClass}`}>
      {measures.map((m) => {
        const cell =
          output.grandTotalRow?.cells[m.id] ??
          output.rows[0]?.cells[m.id];

        const formatted = formatKpiValue(cell, m.agg);
        const aggMeta = getAggMeta(m.agg);
        const Icon = aggMeta.Icon;
        const measureLabel = m.label || aggMeta.label;

        const handleClick = () => {
          let recs: DatasetRecord[] = [];
          if (cell?.recordIds && cell.recordIds.length > 0) {
            recs = cell.recordIds
              .map((id) => recordMap.get(id))
              .filter((r): r is DatasetRecord => Boolean(r));
          }
          if (recs.length === 0) {
            recs = output.filteredRecords;
          }

          onDrillDown(
            recs,
            `${widget.title} · ${measureLabel}`,
            `${recs.length} phản hồi tương ứng`
          );
        };

        return (
          <button
            key={m.id}
            type="button"
            onClick={handleClick}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
            title="Bấm để xem danh sách phản hồi chi tiết"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                {measureLabel}
              </span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${aggMeta.color}`}>
                <Icon size={14} />
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 sm:text-3xl">
                {formatted}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>{aggMeta.label}</span>
              <span className="font-medium text-blue-600 opacity-0 transition group-hover:opacity-100 dark:text-blue-400">
                Khoan sâu →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

