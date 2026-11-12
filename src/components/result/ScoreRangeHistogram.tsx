"use client";

import React, { useMemo, useState } from "react";
import { FiBarChart2, FiList, FiSearch, FiSliders } from "react-icons/fi";
import EChartsContainer, { ECHARTS_PALETTE, type EChartsOption } from "@/components/charts/EChartsContainer";
import { buildDynamicEqualWidthRanges } from "@/lib/report-engine";
import type { DatasetRecord, SurveyQuestionStatistic } from "@/types/report";

interface ScoreRangeHistogramProps {
  question: SurveyQuestionStatistic;
  records: DatasetRecord[];
  onSelectBucket?: (records: DatasetRecord[], title: string, subtitle?: string) => void;
}

type RangeStrategy = "auto5" | "auto10" | "custom";

interface BucketResult {
  key: string;
  label: string;
  min: number;
  max: number;
  inclusiveMax: boolean;
  color: string;
  records: DatasetRecord[];
  count: number;
  percentage: number;
}

export default function ScoreRangeHistogram({
  question,
  records,
  onSelectBucket,
}: ScoreRangeHistogramProps) {
  const [strategy, setStrategy] = useState<RangeStrategy>("auto5");
  const qId = question.questionId || (question as unknown as { id?: string }).id || "";

  const validData = useMemo(() => {
    const list: { record: DatasetRecord; value: number }[] = [];
    for (const rec of records) {
      const ans = rec.answers[qId];
      if (ans && ans.number != null && Number.isFinite(ans.number)) {
        list.push({ record: rec, value: ans.number });
      }
    }
    return list;
  }, [records, qId]);

  const { minVal, maxVal } = useMemo(() => {
    if (validData.length === 0) return { minVal: 0, maxVal: 0 };
    const nums = validData.map((d) => d.value);
    return {
      minVal: Math.min(...nums),
      maxVal: Math.max(...nums),
    };
  }, [validData]);

  const [customMinOverride, setCustomMinOverride] = useState<string | null>(null);
  const [customMaxOverride, setCustomMaxOverride] = useState<string | null>(null);

  const customMin = customMinOverride ?? String(minVal);
  const customMax = customMaxOverride ?? String(maxVal);

  const bucketResults = useMemo<BucketResult[]>(() => {
    if (validData.length === 0) return [];
    const nums = validData.map((d) => d.value);
    const binCount = strategy === "auto10" ? 10 : 5;
    const defs = buildDynamicEqualWidthRanges(nums, undefined, binCount);

    return defs.map((def, idx) => {
      const matched = validData.filter((d) =>
        def.min === def.max
          ? d.value === def.min
          : def.inclusiveMax
            ? d.value >= def.min && d.value <= def.max
            : d.value >= def.min && d.value < def.max
      );
      return {
        key: `bin_${idx}_${def.label}`,
        label: def.label,
        min: def.min,
        max: def.max,
        inclusiveMax: def.inclusiveMax,
        color: ECHARTS_PALETTE[idx % ECHARTS_PALETTE.length],
        records: matched.map((m) => m.record),
        count: matched.length,
        percentage: validData.length > 0 ? (matched.length / validData.length) * 100 : 0,
      };
    });
  }, [validData, strategy]);

  const customResult = useMemo(() => {
    const lo = Number.parseFloat(customMin);
    const hi = Number.parseFloat(customMax);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) {
      return { count: 0, percentage: 0, records: [] as DatasetRecord[], valid: false };
    }
    const matched = validData.filter((item) => item.value >= lo && item.value <= hi);
    return {
      count: matched.length,
      percentage: validData.length > 0 ? (matched.length / validData.length) * 100 : 0,
      records: matched.map((m) => m.record),
      valid: true,
    };
  }, [customMin, customMax, validData]);

  const chartOption = useMemo<EChartsOption>(() => {
    if (bucketResults.length === 0) return {};

    const categories = bucketResults.map((b) => b.label);
    const dataValues = bucketResults.map((b) => ({
      value: b.count,
      itemStyle: { color: b.color },
    }));

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const first = arr[0] as { dataIndex?: number } | undefined;
          if (!first || first.dataIndex == null) return "";
          const b = bucketResults[first.dataIndex];
          if (!b) return "";
          return `
            <div style="font-weight: 600; margin-bottom: 4px; color: #1e293b;">
              Khoảng ${b.label}
            </div>
            <div style="font-size: 13px; color: #475569; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <span>Số phản hồi:</span>
              <b style="color: #2563eb;">${b.count}</b>
            </div>
            <div style="font-size: 13px; color: #475569; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <span>Tỷ lệ:</span>
              <b>${b.percentage.toFixed(1)}%</b>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
              Nhấp vào cột để xem danh sách phản hồi
            </div>
          `;
        },
      },
      grid: {
        top: 25,
        right: 15,
        bottom: 30,
        left: 45,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: categories,
        axisLine: { lineStyle: { color: "#cbd5e1" } },
        axisLabel: {
          color: "#64748b",
          fontSize: 11,
          interval: 0,
          rotate: categories.length > 7 ? 20 : 0,
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
        axisLabel: { color: "#64748b", fontSize: 11 },
        minInterval: 1,
      },
      series: [
        {
          name: "Số phản hồi",
          type: "bar",
          barWidth: "48%",
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: "#3b82f6",
          },
          data: dataValues,
        },
      ],
    };
  }, [bucketResults]);

  const handleChartClick = (params: { dataIndex?: number }) => {
    if (params && params.dataIndex != null) {
      const b = bucketResults[params.dataIndex];
      if (b && onSelectBucket) {
        onSelectBucket(
          b.records,
          `${question.questionText}: Khoảng ${b.label}`,
          `Bao gồm ${b.count} phản hồi (${b.percentage.toFixed(1)}% tổng số)`
        );
      }
    }
  };

  if (validData.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-800">
        Chưa có phản hồi số học hợp lệ cho câu hỏi này.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <FiBarChart2 size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Phân bố khoảng giá trị (Dynamic Histogram)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {validData.length} phản hồi hợp lệ (Từ {minVal} đến {maxVal}) · Nhấp vào khoảng để xem danh sách
            </p>
          </div>
        </div>

        {/* Dynamic Strategy Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setStrategy("auto5")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              strategy === "auto5"
                ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            5 khoảng tự động
          </button>
          <button
            type="button"
            onClick={() => setStrategy("auto10")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              strategy === "auto10"
                ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            10 khoảng tự động
          </button>
          <button
            type="button"
            onClick={() => setStrategy("custom")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
              strategy === "custom"
                ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <FiSliders size={12} />
            Tùy biến khoảng
          </button>
        </div>
      </div>

      {strategy !== "custom" ? (
        <div className="mt-3">
          <div className="h-[220px]">
            <EChartsContainer
              option={chartOption}
              height={220}
              onEvents={{ click: handleChartClick }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {bucketResults.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => {
                  if (onSelectBucket) {
                    onSelectBucket(
                      b.records,
                      `${question.questionText}: Khoảng ${b.label}`,
                      `Bao gồm ${b.count} phản hồi (${b.percentage.toFixed(1)}% tổng số)`
                    );
                  }
                }}
                disabled={b.count === 0}
                className={`group flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                  b.count > 0
                    ? "border-slate-200/80 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-blue-700"
                    : "cursor-not-allowed border-slate-100 bg-slate-50/30 opacity-50 dark:border-slate-800/40 dark:bg-slate-900/30"
                }`}
              >
                <div className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="truncate">{b.label}</span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                </div>
                <div className="mt-1 flex w-full items-baseline justify-between">
                  <span className="text-base font-bold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                    {b.count}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {b.percentage.toFixed(0)}%
                  </span>
                </div>
                {b.count > 0 && (
                  <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-blue-600 opacity-0 transition group-hover:opacity-100 dark:text-blue-400">
                    <FiList size={10} /> Xem phản hồi
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Từ giá trị:
              </span>
              <input
                type="number"
                step="any"
                value={customMin}
                onChange={(e) => setCustomMinOverride(e.target.value)}
                className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Đến giá trị:
              </span>
              <input
                type="number"
                step="any"
                value={customMax}
                onChange={(e) => setCustomMaxOverride(e.target.value)}
                className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <button
              type="button"
              disabled={!customResult.valid || customResult.count === 0}
              onClick={() => {
                if (onSelectBucket && customResult.valid) {
                  onSelectBucket(
                    customResult.records,
                    `${question.questionText}: Khoảng ${customMin} đến ${customMax}`,
                    `Tìm thấy ${customResult.count} phản hồi (${customResult.percentage.toFixed(1)}% tổng số)`
                  );
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSearch size={13} />
              Xem {customResult.count} phản hồi ({customResult.percentage.toFixed(1)}%)
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Giá trị nhỏ nhất ghi nhận là <b>{minVal}</b>, lớn nhất là <b>{maxVal}</b>.
          </p>
        </div>
      )}
    </div>
  );
}
