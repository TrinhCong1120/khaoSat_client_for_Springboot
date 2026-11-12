"use client";

import React, { useState, useMemo } from "react";
import { Grid, BarChart2, Star } from "lucide-react";
import EChartsContainer, { type EChartsOption } from "@/components/charts/EChartsContainer";
import type { SurveyQuestionStatistic, MatrixRowStatistic, MatrixCellStatistic } from "@/types/report";
import type { MatrixConfig, MatrixRow, MatrixColumn } from "@/components/surveys/builder/BuilderMatrixConfig";

interface MatrixSummaryProps {
  question: SurveyQuestionStatistic;
  config?: string | MatrixConfig | null;
}

const PALETTE = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#14b8a6", // teal
];

export default function MatrixSummary({ question, config }: MatrixSummaryProps) {
  const [viewMode, setViewMode] = useState<"heatmap" | "stacked">("heatmap");

  const parsedConfig: MatrixConfig = useMemo(() => {
    if (!config) return {};
    if (typeof config === "string") {
      try {
        return JSON.parse(config);
      } catch {
        return {};
      }
    }
    return config;
  }, [config]);

  const stats = question.matrixStatistics;
  const isDynamicTable = question.questionTypeCode === "DYNAMIC_TABLE";

  // Rows and Columns either from stats or fallback to config
  const rows = useMemo<MatrixRowStatistic[]>(() => {
    if (stats?.rows?.length) return stats.rows;
    return (parsedConfig.rows || []).map((r: MatrixRow) => ({
      rowId: r.id,
      rowLabel: r.label,
      totalCount: 0,
      averageScore: null,
      cells: (parsedConfig.columns || []).map((c: MatrixColumn) => ({
        columnId: c.id,
        columnLabel: c.label,
        count: 0,
        percentage: 0,
      })),
    }));
  }, [stats?.rows, parsedConfig]);

  const columns = useMemo<{ id: string; label: string; type?: string }[]>(() => {
    if (stats?.rows?.[0]?.cells?.length) {
      return stats.rows[0].cells.map((c: MatrixCellStatistic) => ({ id: c.columnId, label: c.columnLabel }));
    }
    if (stats?.columns?.length) {
      return stats.columns.map((c) => ({ id: c.columnId, label: c.columnLabel, type: c.type }));
    }
    return (parsedConfig.columns || []).map((c: MatrixColumn) => ({ id: c.id, label: c.label, type: c.type }));
  }, [stats, parsedConfig]);

  const hasScore = useMemo(() => {
    return rows.some((r: MatrixRowStatistic) => r.averageScore != null && r.averageScore > 0);
  }, [rows]);

  // STACKED BAR CHART OPTION
  const stackedChartOption = useMemo<EChartsOption>(() => {
    if (!rows.length || !columns.length) return {};

    const categoryLabels = rows.map((r: MatrixRowStatistic) => r.rowLabel);

    const series = columns.map((col, cIdx: number) => {
      const data = rows.map((r: MatrixRowStatistic) => {
        const cell = r.cells.find((c: MatrixCellStatistic) => c.columnId === col.id);
        return cell ? cell.percentage : 0;
      });

      return {
        name: col.label,
        type: "bar" as const,
        stack: "total",
        itemStyle: {
          color: PALETTE[cIdx % PALETTE.length],
        },
        label: {
          show: true,
          formatter: (params: { value?: unknown }) => {
            const v = Number(params.value);
            return v > 5 ? `${v}%` : "";
          },
          fontSize: 10,
          color: "#fff",
        },
        data,
      };
    });

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          if (!Array.isArray(params)) return "";
          const rowName = params[0]?.name;
          const matchingRow = rows.find((r: MatrixRowStatistic) => r.rowLabel === rowName);
          let html = `<div class="font-bold text-xs mb-1.5 pb-1 border-b border-gray-200">${rowName}</div>`;
          params.forEach((p: { seriesName: string; value: number; color: string }) => {
            const cell = matchingRow?.cells.find((c: MatrixCellStatistic) => c.columnLabel === p.seriesName);
            const count = cell ? cell.count : 0;
            html += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${p.color}"></span>
                ${p.seriesName}
              </span>
              <b>${count} lượt (${p.value}%)</b>
            </div>`;
          });
          if (matchingRow?.averageScore != null) {
            html += `<div class="mt-1.5 pt-1 border-t border-gray-200 text-xs text-amber-600 font-bold flex justify-between">
              <span>Điểm trung bình:</span> <span>★ ${matchingRow.averageScore}</span>
            </div>`;
          }
          return html;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      grid: {
        left: "3%",
        right: "6%",
        bottom: "12%",
        top: "4%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: categoryLabels,
        axisLabel: {
          width: 140,
          overflow: "truncate",
          fontSize: 11,
        },
      },
      series,
    };
  }, [rows, columns]);

  // 1. DYNAMIC TABLE COLUMN SUMMARY
  if (isDynamicTable) {
    const colList = stats?.columns || [];
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Thống kê dữ liệu Bảng động ({columns.length} cột)
          </span>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
            {stats?.totalResponses || 0} bài nộp có dữ liệu
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((col) => {
            const stat = colList.find((c) => c.columnId === col.id);
            const isNumber = col.type === "number" || stat?.averageValue != null;

            return (
              <div
                key={col.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate" title={col.label}>
                    {col.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {col.type || "text"}
                  </span>
                </div>

                {isNumber && stat ? (
                  <dl className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-200 dark:border-slate-800 text-center">
                    <div>
                      <dt className="text-[10px] text-slate-400">TB</dt>
                      <dd className="text-xs font-bold text-blue-600 dark:text-blue-400">{stat.averageValue ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-slate-400">Min</dt>
                      <dd className="text-xs font-bold text-slate-700 dark:text-slate-300">{stat.minValue ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-slate-400">Max</dt>
                      <dd className="text-xs font-bold text-amber-600 dark:text-amber-400">{stat.maxValue ?? "-"}</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="text-xs text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                    <span>Số ô đã điền:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{stat?.filledCount ?? 0} ô</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {/* VIEW SWITCHER */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Hình thức hiển thị Ma trận ({rows.length} hàng × {columns.length} cột)
        </span>

        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode("heatmap")}
            title="Bảng nhiệt phân phối"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              viewMode === "heatmap"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300 font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Grid size={13} /> Bảng nhiệt (%)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("stacked")}
            title="Biểu đồ thanh ngang xếp chồng"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              viewMode === "stacked"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300 font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <BarChart2 size={13} /> Biểu đồ cột chồng
          </button>
        </div>
      </div>

      {/* 2. STACKED BAR CHART VIEW */}
      {viewMode === "stacked" && (
        <div className="min-h-[290px] pt-1">
          <EChartsContainer option={stackedChartOption} height={Math.max(280, rows.length * 48 + 80)} />
        </div>
      )}

      {/* 3. HEATMAP TABLE VIEW */}
      {viewMode === "heatmap" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 min-w-[150px] bg-slate-100/70 dark:bg-slate-800 sticky left-0 z-10">
                  Tiêu chí
                </th>
                {columns.map((col) => (
                  <th key={col.id} className="px-3 py-3 text-center min-w-[100px]">
                    {col.label}
                  </th>
                ))}
                {hasScore && (
                  <th className="px-3 py-3 text-center min-w-[90px] text-amber-700 dark:text-amber-400">
                    Điểm TB
                  </th>
                )}
                <th className="px-3 py-3 text-center min-w-[80px]">Tổng lượt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {rows.map((row: MatrixRowStatistic) => (
                <tr key={row.rowId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 sticky left-0 z-10 shadow-r">
                    {row.rowLabel}
                  </td>
                  {columns.map((col) => {
                    const cell = row.cells.find((c: MatrixCellStatistic) => c.columnId === col.id);
                    const pct = cell?.percentage ?? 0;
                    const count = cell?.count ?? 0;
                    const intensity = Math.min(1, Math.max(0.04, pct / 100));

                    return (
                      <td
                        key={col.id}
                        className="px-2 py-2 text-center"
                        style={{
                          backgroundColor:
                            count > 0 ? `rgba(37, 99, 235, ${intensity * 0.22})` : undefined,
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-bold tabular-nums ${
                              pct > 30 ? "text-blue-700 dark:text-blue-300 text-sm" : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {pct}%
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            {count} lượt
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  {hasScore && (
                    <td className="px-3 py-3 text-center">
                      {row.averageScore != null ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          {row.averageScore}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                    {row.totalCount}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + (hasScore ? 2 : 1) + 1}
                    className="px-4 py-8 text-center text-xs text-slate-400 italic"
                  >
                    Chưa có cấu hình tiêu chí ma trận nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
