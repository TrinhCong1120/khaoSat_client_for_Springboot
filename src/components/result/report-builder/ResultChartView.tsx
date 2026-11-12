"use client";

import React, { useMemo } from "react";
import { BarChart2, LineChart, PieChart, Sliders } from "lucide-react";
import EChartsContainer, { ECHARTS_PALETTE, type EChartsOption } from "@/components/charts/EChartsContainer";
import type { ChartConfig, ChartType, ReportDefinition, ReportOutput } from "@/lib/report-engine";
import type { DatasetRecord } from "@/types/report";

type Props = {
  definition: ReportDefinition;
  output: ReportOutput;
  recordMap: Map<string, DatasetRecord>;
  onChangeChart?: (next: ChartConfig) => void;
  onDrillDown: (records: DatasetRecord[], title: string, subtitle?: string) => void;
  embedded?: boolean;
  hideToolbar?: boolean;
  chartHeight?: number;
};

export default function ResultChartView({
  definition,
  output,
  recordMap,
  onChangeChart,
  onDrillDown,
  embedded = false,
  hideToolbar = false,
  chartHeight = 300,
}: Props) {
  const { chart, measures } = definition;
  const activeMeasure =
    measures.find((m) => m.id === chart.measureId) ?? measures[0];

  const option = useMemo<EChartsOption>(() => {
    if (!chart.enabled || output.rows.length === 0 || !activeMeasure) return {};

    // Pivot Stacked / Grouped / Horizontal Bar / Multi-line across 2nd dimension
    if (
      output.pivotMatrix &&
      (chart.type === "stackedBar" ||
        chart.type === "groupedBar" ||
        chart.type === "horizontalBar" ||
        chart.type === "line")
    ) {
      const p = output.pivotMatrix;
      if (chart.type === "horizontalBar") {
        return {
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          legend: { top: 0, textStyle: { fontSize: 11 } },
          grid: { top: 36, right: 24, bottom: 20, left: 40, containLabel: true },
          yAxis: {
            type: "category",
            data: p.rowKeys,
            inverse: true,
            axisLabel: { fontSize: 11 },
          },
          xAxis: { type: "value" },
          series: p.colKeys.map((ck, idx) => ({
            name: ck,
            type: "bar",
            itemStyle: { color: ECHARTS_PALETTE[idx % ECHARTS_PALETTE.length], borderRadius: [0, 4, 4, 0] },
            data: p.rowKeys.map((rk) => p.cells[rk]?.[ck]?.value ?? 0),
          })),
        };
      }

      if (chart.type === "line") {
        return {
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { top: 0, textStyle: { fontSize: 11 } },
          grid: { top: 36, right: 16, bottom: 28, left: 40, containLabel: true },
          xAxis: {
            type: "category",
            data: p.rowKeys,
            axisLabel: { fontSize: 11, interval: 0, rotate: p.rowKeys.length > 8 ? 20 : 0 },
          },
          yAxis: { type: "value" },
          series: p.colKeys.map((ck, idx) => ({
            name: ck,
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            itemStyle: { color: ECHARTS_PALETTE[idx % ECHARTS_PALETTE.length] },
            lineStyle: { width: 2.5 },
            data: p.rowKeys.map((rk) => p.cells[rk]?.[ck]?.value ?? 0),
          })),
        };
      }

      return {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { top: 0, textStyle: { fontSize: 11 } },
        grid: { top: 36, right: 16, bottom: 28, left: 40, containLabel: true },
        xAxis: {
          type: "category",
          data: p.rowKeys,
          axisLabel: { fontSize: 11, interval: 0, rotate: p.rowKeys.length > 8 ? 20 : 0 },
        },
        yAxis: { type: "value" },
        series: p.colKeys.map((ck, idx) => ({
          name: ck,
          type: "bar",
          stack: chart.type === "stackedBar" ? "pivot" : undefined,
          itemStyle: { color: ECHARTS_PALETTE[idx % ECHARTS_PALETTE.length], borderRadius: [4, 4, 0, 0] },
          data: p.rowKeys.map((rk) => p.cells[rk]?.[ck]?.value ?? 0),
        })),
      };
    }

    const categories = output.rows.map((r) => r.groupValues.join(" / "));

    if (chart.type === "pie") {
      return {
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        legend: { bottom: 0, textStyle: { fontSize: 11 } },
        series: [
          {
            name: activeMeasure.label || activeMeasure.agg,
            type: "pie",
            radius: ["42%", "70%"],
            center: ["50%", "44%"],
            data: output.rows.map((r, idx) => ({
              name: r.groupValues.join(" / "),
              value: r.cells[activeMeasure.id]?.value ?? 0,
              itemStyle: { color: ECHARTS_PALETTE[idx % ECHARTS_PALETTE.length] },
            })),
          },
        ],
      };
    }

    if (chart.type === "boxRange") {
      const avgMeasure = measures.find((m) => m.agg === "avg") ?? activeMeasure;
      const minMeasure = measures.find((m) => m.agg === "min");
      const maxMeasure = measures.find((m) => m.agg === "max");

      return {
        tooltip: { trigger: "axis" },
        legend: { top: 0, textStyle: { fontSize: 11 } },
        grid: { top: 36, right: 16, bottom: 28, left: 40, containLabel: true },
        xAxis: { type: "category", data: categories, axisLabel: { fontSize: 11 } },
        yAxis: { type: "value" },
        series: [
          ...(minMeasure
            ? [
                {
                  name: minMeasure.label || "Min",
                  type: "line" as const,
                  smooth: true,
                  itemStyle: { color: "#f59e0b" },
                  data: output.rows.map((r) => r.cells[minMeasure.id]?.value ?? null),
                },
              ]
            : []),
          {
            name: avgMeasure.label || "TB",
            type: "bar" as const,
            barMaxWidth: 38,
            itemStyle: { color: "#2563eb", borderRadius: [6, 6, 0, 0] },
            data: output.rows.map((r) => r.cells[avgMeasure.id]?.value ?? 0),
          },
          ...(maxMeasure
            ? [
                {
                  name: maxMeasure.label || "Max",
                  type: "line" as const,
                  smooth: true,
                  itemStyle: { color: "#10b981" },
                  data: output.rows.map((r) => r.cells[maxMeasure.id]?.value ?? null),
                },
              ]
            : []),
        ],
      };
    }

    // Grouped / Stacked / Line across selected numeric measures
    const numericMeasures = measures.filter((m) => m.agg !== "count" && m.agg !== "percentOfTotal");
    const chosenMeasures =
      chart.type === "stackedBar"
        ? numericMeasures.length > 0
          ? numericMeasures
          : [activeMeasure]
        : [activeMeasure, ...numericMeasures.filter((m) => m.id !== activeMeasure.id)].slice(0, 3);

    if (chart.type === "horizontalBar") {
      return {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { top: 0, textStyle: { fontSize: 11 } },
        grid: { top: 36, right: 24, bottom: 20, left: 40, containLabel: true },
        yAxis: {
          type: "category",
          data: categories,
          inverse: true,
          axisLabel: { fontSize: 11 },
        },
        xAxis: { type: "value" },
        series: chosenMeasures.map((m, idx) => ({
          name: m.label || m.agg,
          type: "bar",
          barMaxWidth: 28,
          itemStyle: {
            color: ECHARTS_PALETTE[idx % ECHARTS_PALETTE.length],
            borderRadius: [0, 6, 6, 0],
          },
          data: output.rows.map((r) => r.cells[m.id]?.value ?? 0),
        })),
      };
    }

    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      grid: { top: 36, right: 16, bottom: 28, left: 40, containLabel: true },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: { fontSize: 11, interval: 0, rotate: categories.length > 8 ? 20 : 0 },
      },
      yAxis: { type: "value" },
      series: chosenMeasures.map((m, idx) => ({
        name: m.label || m.agg,
        type: chart.type === "line" ? "line" : "bar",
        smooth: chart.type === "line",
        stack: chart.type === "stackedBar" ? "total" : undefined,
        barMaxWidth: 42,
        itemStyle: {
          color: ECHARTS_PALETTE[idx % ECHARTS_PALETTE.length],
          borderRadius: chart.type === "line" ? 0 : [6, 6, 0, 0],
        },
        data: output.rows.map((r) => r.cells[m.id]?.value ?? 0),
      })),
    };
  }, [activeMeasure, chart.enabled, chart.type, measures, output.pivotMatrix, output.rows]);

  if (!chart.enabled || output.rows.length === 0) return null;

  const chartButtons: Array<{ type: ChartType; label: string; Icon: React.ElementType }> = [
    { type: "groupedBar", label: "Cột nhóm", Icon: BarChart2 },
    { type: "horizontalBar", label: "Thanh ngang", Icon: BarChart2 },
    { type: "stackedBar", label: "Cột chồng", Icon: BarChart2 },
    { type: "line", label: "Đường xu hướng", Icon: LineChart },
    { type: "pie", label: "Tỷ lệ Donut", Icon: PieChart },
    { type: "boxRange", label: "Biên độ Min/TB/Max", Icon: Sliders },
  ];

  return (
    <section
      className={
        embedded
          ? "w-full"
          : "rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      }
    >
      {!hideToolbar && onChangeChart && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {chartButtons.map(({ type, label, Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => onChangeChart({ ...chart, type })}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  chart.type === type
                    ? "bg-white text-blue-700 shadow-xs dark:bg-slate-700 dark:text-blue-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Chỉ số trục chính:</span>
            <select
              aria-label="Chỉ số biểu đồ"
              value={activeMeasure?.id ?? ""}
              onChange={(e) => onChangeChart({ ...chart, measureId: e.target.value })}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              {measures.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label || m.agg}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <EChartsContainer
        option={option}
        height={chartHeight}
        onEvents={{
          click: (params: { dataIndex?: number; seriesName?: string }) => {
            if (params?.dataIndex == null) return;
            if (output.pivotMatrix) {
              const p = output.pivotMatrix;
              const rk = p.rowKeys[params.dataIndex];
              const ck = params.seriesName;
              if (rk && ck && p.cells[rk]?.[ck]) {
                const cell = p.cells[rk][ck];
                const recs = cell.recordIds
                  .map((id) => recordMap.get(id))
                  .filter((r): r is DatasetRecord => Boolean(r));
                onDrillDown(
                  recs,
                  `Biểu đồ · ${rk} / ${ck}`,
                  `${recs.length} phản hồi trong nhóm này`
                );
                return;
              }
            }
            const row = output.rows[params.dataIndex];
            if (!row) return;
            const recs = row.groupRecordIds
              .map((id) => recordMap.get(id))
              .filter((r): r is DatasetRecord => Boolean(r));
            onDrillDown(
              recs,
              `Biểu đồ · Nhóm ${row.groupValues.join(" / ")}`,
              `${recs.length} phản hồi trong nhóm này`
            );
          },
        }}
      />
    </section>
  );
}

