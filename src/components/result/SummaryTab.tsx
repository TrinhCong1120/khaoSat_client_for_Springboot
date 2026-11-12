"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ListChecks,
  BarChart2,
  PieChart,
  Disc,
  MapPin,
  Hash,
  Calendar,
  FileText,
  ArrowUpRight,
  ListFilter,
  FunctionSquare,
} from "lucide-react";
import EChartsContainer, { type EChartsOption } from "@/components/charts/EChartsContainer";
import MatrixSummary from "@/components/result/MatrixSummary";
import DrillDownResponseDrawer from "@/components/result/DrillDownResponseDrawer";
import ScoreRangeHistogram from "@/components/result/ScoreRangeHistogram";
import {
  flattenSurveyPagesQuestions,
  parseSmartNumber,
  type ComputedField,
  type OverviewQuestionSummary,
  type ReportDefinition,
  type ReportOutput,
  type SurveyFieldMeta,
} from "@/lib/report-engine";
import { formatSurveyLocal } from "@/lib/report";
import type {
  ChoiceOptionStatistic,
  DatasetRecord,
  ReportFilter,
  ResponseTimelinePoint,
  SurveyDataset,
  SurveyPageStatistics,
  SurveyQuestionStatistic,
  SurveyResultDetail,
  SurveyResultQuestion,
  SurveyStatistics,
  SurveyTraffic,
} from "@/types/report";

type Props = {
  data: SurveyStatistics | null;
  traffic: SurveyTraffic | null;
  pages: SurveyPageStatistics | null;
  timeline: ResponseTimelinePoint[];
  loading: boolean;
  filtered: boolean;
  mode?: "overview" | "questions";
  surveyPages?: NonNullable<SurveyResultDetail["pages"]>;
  dataset?: SurveyDataset | null;
  surveyId?: string;
  filter?: ReportFilter;
  definition?: ReportDefinition;
  onChangeDefinition?: (next: ReportDefinition) => void;
  output?: ReportOutput;
  fieldMetas?: SurveyFieldMeta[];
  recordMap?: Map<string, DatasetRecord>;
  onOpenComputedDrawer?: () => void;
  onOpenExportModal?: () => void;
  onOpenSaveModal?: () => void;
};

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

function valueOrPending(value: number | null | undefined, suffix = "") {
  return value == null ? "Chưa đủ dữ liệu" : `${number.format(value)}${suffix}`;
}

function questionCount(question: SurveyQuestionStatistic) {
  return (
    question.matrixStatistics?.totalResponses ??
    question.numberStatistics?.count ??
    question.dateStatistics?.count ??
    question.addressStatistics?.count ??
    question.textStatistics?.count ??
    question.choiceStatistics?.options.reduce((sum, option) => sum + option.count, 0) ??
    0
  );
}

// INTERACTIVE CHOICE SUMMARY WITH CHART SWITCHER & DRILL-DOWN
function ChoiceSummary({
  question,
  records = [],
  onDrillDown,
  computedValues,
  computedFields,
}: {
  question: SurveyQuestionStatistic;
  records?: DatasetRecord[];
  onDrillDown?: (
    records: DatasetRecord[],
    title: string,
    subtitle?: string,
    targetQuestionId?: string
  ) => void;
  computedValues?: Map<string, Record<string, unknown>>;
  computedFields?: ComputedField[];
}) {
  const options = question.choiceStatistics?.options ?? [];
  const defaultChart = options.length <= 5 ? "donut" : "bar";
  const [chartType, setChartType] = useState<"donut" | "bar" | "rose">(defaultChart);

  const handleOptionClick = (option: ChoiceOptionStatistic) => {
    if (!onDrillDown || !records.length) return;
    const qId = question.questionId;
    const isComputed =
      qId.startsWith("computed:") ||
      (computedFields && computedFields.some((cf) => cf.id === qId));
    const cfId = qId.startsWith("computed:") ? qId.slice("computed:".length) : qId;
    const targetQId = isComputed
      ? qId.startsWith("computed:")
        ? qId
        : `computed:${qId}`
      : qId;

    const optSummary = question as OverviewQuestionSummary;
    let matched: DatasetRecord[];

    const recordIdsForOpt =
      optSummary.recordIdsByOption?.[option.optionId] ||
      optSummary.recordIdsByOption?.[option.optionText];

    if (recordIdsForOpt && recordIdsForOpt.length > 0) {
      const ids = new Set(recordIdsForOpt);
      matched = records.filter((r) => ids.has(r.id));
    } else {
      matched = records.filter((rec) => {
        if (isComputed && computedValues) {
          const comp = computedValues.get(rec.id);
          const v = comp ? comp[cfId] ?? comp[qId] : undefined;
          if (v != null) {
            const vStr = String(v);
            if (vStr === option.optionText || vStr === option.optionId) return true;
          }
        }
        const ans = rec.answers[qId];
        if (!ans) return false;
        if (ans.optionIds && ans.optionIds.includes(option.optionId)) return true;
        if (ans.optionTexts && ans.optionTexts.includes(option.optionText)) return true;
        if (ans.formatted && ans.formatted.includes(option.optionText)) return true;
        return false;
      });
    }

    onDrillDown(
      matched,
      `${question.questionText}: Lựa chọn "${option.optionText}"`,
      `Có ${matched.length} bài làm chọn đáp án này (${option.percentage.toFixed(1)}%)`,
      targetQId
    );
  };

  const chartOption = useMemo<EChartsOption>(() => {
    if (!options.length) return {};

    const dataPoints = options.map((opt) => ({
      name: opt.optionText,
      value: opt.count,
    }));

    if (chartType === "donut") {
      return {
        tooltip: {
          trigger: "item",
          formatter: "{b}: <b>{c}</b> ({d}%)<br/><span style='font-size:11px;color:#94a3b8'>👉 Nhấp để xem danh sách bài</span>",
        },
        legend: { orient: "horizontal", bottom: 0, textStyle: { fontSize: 11 } },
        toolbox: { feature: { saveAsImage: { title: "Tải ảnh" } }, right: 10, top: 0 },
        series: [
          {
            name: "Lượt chọn",
            type: "pie",
            radius: ["40%", "70%"],
            center: ["50%", "45%"],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 6 },
            label: { show: true, formatter: "{b}: {d}%", fontSize: 11 },
            data: dataPoints,
          },
        ],
      };
    }

    if (chartType === "rose") {
      return {
        tooltip: {
          trigger: "item",
          formatter: "{b}: <b>{c}</b> ({d}%)<br/><span style='font-size:11px;color:#94a3b8'>👉 Nhấp để xem danh sách bài</span>",
        },
        legend: { orient: "horizontal", bottom: 0, textStyle: { fontSize: 11 } },
        toolbox: { feature: { saveAsImage: { title: "Tải ảnh" } }, right: 10, top: 0 },
        series: [
          {
            name: "Lượt chọn",
            type: "pie",
            radius: ["25%", "72%"],
            center: ["50%", "45%"],
            roseType: "area",
            itemStyle: { borderRadius: 6 },
            label: { show: true, formatter: "{b}: {c}" },
            data: dataPoints,
          },
        ],
      };
    }

    // Default: Horizontal Bar Chart
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return "";
          const p = params[0];
          return `${p.name}: <b>${p.value}</b> bài<br/><span style='font-size:11px;color:#94a3b8'>👉 Nhấp cột để xem danh sách bài</span>`;
        },
      },
      toolbox: { feature: { saveAsImage: { title: "Tải ảnh" } }, right: 10, top: 0 },
      grid: { left: "3%", right: "8%", bottom: "5%", top: "8%", containLabel: true },
      xAxis: { type: "value", minInterval: 1 },
      yAxis: {
        type: "category",
        data: options.map((opt) => opt.optionText),
        axisLabel: {
          width: 130,
          overflow: "truncate",
          fontSize: 11,
        },
      },
      series: [
        {
          name: "Lượt chọn",
          type: "bar",
          data: options.map((opt) => opt.count),
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: "#2563eb",
          },
          label: {
            show: true,
            position: "right",
            formatter: "{c}",
            fontSize: 11,
          },
        },
      ],
    };
  }, [options, chartType]);

  const handleChartClick = (params: any) => {
    if (params && params.dataIndex != null) {
      const opt = options[params.dataIndex];
      if (opt) handleOptionClick(opt);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {/* CHART TYPE SWITCHER */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Dạng sơ đồ hiển thị
        </span>

        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setChartType("bar")}
            title="Biểu đồ cột"
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
              chartType === "bar"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <BarChart2 size={13} /> Cột
          </button>
          <button
            type="button"
            onClick={() => setChartType("donut")}
            title="Biểu đồ vành khăn"
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
              chartType === "donut"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <PieChart size={13} /> Vành khăn
          </button>
          <button
            type="button"
            onClick={() => setChartType("rose")}
            title="Biểu đồ hoa hồng"
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
              chartType === "rose"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Disc size={13} /> Hoa hồng
          </button>
        </div>
      </div>

      {/* ECHARTS CONTAINER */}
      <div className="min-h-[260px]">
        <EChartsContainer
          option={chartOption}
          height={270}
          onEvents={{
            click: handleChartClick,
          }}
        />
      </div>

      {/* DETAIL PERCENTAGE LIST */}
      <ul className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-2 dark:border-slate-800">
        {options.map((option) => (
          <li
            key={option.optionId}
            onClick={() => handleOptionClick(option)}
            className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 transition-all hover:bg-blue-50/70 hover:shadow-xs dark:bg-slate-800/40 dark:hover:bg-blue-950/40"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="truncate font-medium text-slate-700 group-hover:text-blue-600 dark:text-slate-300 dark:group-hover:text-blue-400"
                title={option.optionText}
              >
                {option.optionText}
              </span>
              <ArrowUpRight
                size={12}
                className="shrink-0 text-blue-500 opacity-0 transition group-hover:opacity-100"
              />
            </div>
            <strong className="shrink-0 tabular-nums text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              {number.format(option.count)} ({number.format(option.percentage)}%)
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ADDRESS QUESTIONS WITH TOP PROVINCES RANKING CHART
function AddressSummary({ question }: { question: SurveyQuestionStatistic }) {
  const addressStats = question.addressStatistics;
  const topProvinces = addressStats?.topProvinces ?? [];

  const provinceChartOption = useMemo<EChartsOption>(() => {
    if (!topProvinces.length) return {};
    const sorted = [...topProvinces].sort((a, b) => a.count - b.count).slice(-10);

    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      toolbox: { feature: { saveAsImage: { title: "Tải ảnh" } }, right: 10, top: 0 },
      grid: { left: "3%", right: "8%", bottom: "5%", top: "8%", containLabel: true },
      xAxis: { type: "value", minInterval: 1 },
      yAxis: {
        type: "category",
        data: sorted.map((p) => p.name),
        axisLabel: {
          width: 120,
          overflow: "truncate",
          fontSize: 11,
        },
      },
      series: [
        {
          name: "Lượt phản hồi",
          type: "bar",
          data: sorted.map((p) => p.count),
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: "#10b981", // emerald
          },
          label: {
            show: true,
            position: "right",
            formatter: "{c}",
            fontSize: 11,
          },
        },
      ],
    };
  }, [topProvinces]);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <MapPin size={14} className="text-emerald-500" />
        <span>Thống kê theo Tỉnh / Thành phố ({addressStats?.count ?? 0} phản hồi)</span>
      </div>

      <div className="min-h-[220px]">
        <EChartsContainer option={provinceChartOption} height={240} />
      </div>

      <div className="rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
        <ol className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
          {topProvinces.slice(0, 6).map((row, idx) => {
            const pct = addressStats?.count ? (row.count / addressStats.count) * 100 : 0;
            return (
              <li key={row.name} className="flex justify-between py-1.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {idx + 1}. {row.name}
                </span>
                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {row.count} ({pct.toFixed(1)}%)
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// NUMBER & RATING QUESTIONS SUMMARY WITH DRILL-DOWN & HISTOGRAM
function NumberSummary({
  question,
  records = [],
  onDrillDown,
  computedValues,
  computedFields,
}: {
  question: SurveyQuestionStatistic;
  records?: DatasetRecord[];
  onDrillDown?: (
    records: DatasetRecord[],
    title: string,
    subtitle?: string,
    targetQuestionId?: string
  ) => void;
  computedValues?: Map<string, Record<string, unknown>>;
  computedFields?: ComputedField[];
}) {
  const stats = question.numberStatistics;
  if (!stats) return null;

  const qId = question.questionId;
  const isComputed =
    qId.startsWith("computed:") ||
    (computedFields && computedFields.some((cf) => cf.id === qId));
  const cfId = qId.startsWith("computed:") ? qId.slice("computed:".length) : qId;
  const targetQId = isComputed
    ? qId.startsWith("computed:")
      ? qId
      : `computed:${qId}`
    : qId;

  // Handle click on stat cards: Min, Max, Median, Average
  const handleStatCardClick = (kind: "average" | "median" | "min" | "max") => {
    if (!onDrillDown || !records.length) return;

    const getNum = (rec: DatasetRecord) => {
      if (isComputed && computedValues) {
        const comp = computedValues.get(rec.id);
        const v = comp ? comp[cfId] ?? comp[qId] : undefined;
        if (typeof v === "number" && !Number.isNaN(v)) return v;
        if (v != null) return parseSmartNumber(String(v));
      }
      const ans = rec.answers[qId];
      if (!ans) return null;
      return ans.number != null ? ans.number : parseSmartNumber(ans.text);
    };

    if (kind === "min") {
      const minVal = stats.min;
      if (minVal == null) return;
      const matched = records.filter((rec) => {
        const n = getNum(rec);
        return n != null && Math.abs(n - minVal) < 0.001;
      });
      onDrillDown(
        matched,
        `${question.questionText}: Giá trị nhỏ nhất (${minVal})`,
        `Tìm thấy ${matched.length} phản hồi đạt giá trị nhỏ nhất`,
        targetQId
      );
    } else if (kind === "max") {
      const maxVal = stats.max;
      if (maxVal == null) return;
      const matched = records.filter((rec) => {
        const n = getNum(rec);
        return n != null && Math.abs(n - maxVal) < 0.001;
      });
      onDrillDown(
        matched,
        `${question.questionText}: Giá trị lớn nhất (${maxVal})`,
        `Tìm thấy ${matched.length} phản hồi đạt giá trị lớn nhất`,
        targetQId
      );
    } else if (kind === "median") {
      const medianVal = stats.median;
      if (medianVal == null) return;
      const matched = records.filter((rec) => {
        const n = getNum(rec);
        return n != null && Math.abs(n - medianVal) <= 0.51;
      });
      onDrillDown(
        matched,
        `${question.questionText}: Gần giá trị Trung vị (${medianVal})`,
        `Tìm thấy ${matched.length} phản hồi trong khoảng trung vị (±0.5)`,
        targetQId
      );
    } else if (kind === "average") {
      const matched = records.filter((rec) => {
        const n = getNum(rec);
        return n != null && !Number.isNaN(n);
      });
      onDrillDown(
        matched,
        `${question.questionText}: Tất cả phản hồi có số (${stats.count})`,
        `Giá trị trung bình: ${stats.average != null ? stats.average.toFixed(2) : "-"}`,
        targetQId
      );
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {/* 4 STAT CARDS */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Trung bình", stats.average, "text-blue-600 dark:text-blue-400", "average"],
          ["Trung vị", stats.median, "text-emerald-600 dark:text-emerald-400", "median"],
          ["Thấp nhất", stats.min, "text-slate-700 dark:text-slate-300", "min"],
          ["Cao nhất", stats.max, "text-amber-600 dark:text-amber-400", "max"],
        ].map(([label, value, colorClass, kind]) => (
          <div
            key={String(label)}
            onClick={() => handleStatCardClick(kind as any)}
            className="group relative cursor-pointer rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-blue-700"
          >
            <div className="flex items-center justify-between">
              <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
                Bấm xem ↗
              </span>
            </div>
            <dd className={`mt-1 text-xl font-bold tabular-nums ${colorClass}`}>
              {valueOrPending(value as number | null)}
            </dd>
          </div>
        ))}
      </dl>

      {/* SCORE RANGE HISTOGRAM */}
      <ScoreRangeHistogram
        question={question}
        records={records}
        onSelectBucket={(bucketRecs, title, subtitle) => {
          if (onDrillDown) {
            onDrillDown(bucketRecs, title, subtitle, targetQId);
          }
        }}
      />
    </div>
  );
}

function QuestionBody({
  question,
  matrixConfig,
  records,
  onDrillDown,
  computedValues,
  computedFields,
}: {
  question: SurveyQuestionStatistic;
  matrixConfig?: string | null;
  records?: DatasetRecord[];
  onDrillDown?: (
    records: DatasetRecord[],
    title: string,
    subtitle?: string,
    targetQuestionId?: string
  ) => void;
  computedValues?: Map<string, Record<string, unknown>>;
  computedFields?: ComputedField[];
}) {
  const isMatrixType = [
    "MATRIX_SINGLE",
    "MATRIX_MULTI",
    "MATRIX_INPUT",
    "DYNAMIC_TABLE",
  ].includes(question.questionTypeCode);

  if (question.matrixStatistics || isMatrixType) {
    return <MatrixSummary question={question} config={matrixConfig} />;
  }

  if (question.choiceStatistics?.options?.length) {
    return (
      <ChoiceSummary
        question={question}
        records={records}
        onDrillDown={onDrillDown}
        computedValues={computedValues}
        computedFields={computedFields}
      />
    );
  }

  if (question.addressStatistics?.topProvinces?.length) {
    return <AddressSummary question={question} />;
  }

  if (question.numberStatistics) {
    return (
      <NumberSummary
        question={question}
        records={records}
        onDrillDown={onDrillDown}
        computedValues={computedValues}
        computedFields={computedFields}
      />
    );
  }

  if (question.dateStatistics) {
    return (
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <dt className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Calendar size={13} className="text-emerald-500" /> Ngày sớm nhất
          </dt>
          <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
            {formatSurveyLocal(question.dateStatistics.min)}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <dt className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Calendar size={13} className="text-rose-500" /> Ngày muộn nhất
          </dt>
          <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
            {formatSurveyLocal(question.dateStatistics.max)}
          </dd>
        </div>
      </dl>
    );
  }

  const textRows = question.textStatistics?.topAnswers ?? [];
  if (textRows.length) {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <FileText size={13} /> Các câu trả lời phổ biến nhất ({textRows.length})
        </p>
        <ol className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/30">
          {textRows.slice(0, 7).map((row, index) => (
            <li key={`${row.text}-${index}`} className="flex justify-between gap-4 py-2 text-xs">
              <span className="line-clamp-2 text-slate-700 dark:text-slate-300 font-medium">{row.text}</span>
              <span className="shrink-0 font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {row.count} lượt
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return <p className="mt-4 text-xs text-slate-400 italic">Câu hỏi này chưa có dữ liệu tổng hợp để hiển thị.</p>;
}

export default function SummaryTab({
  data,
  traffic,
  pages,
  timeline,
  loading,
  filtered,
  mode = "overview",
  surveyPages = [],
  dataset,
  surveyId,
  filter: _legacyFilter,
  definition,
  onChangeDefinition,
  output,
  fieldMetas,
  recordMap,
  onOpenComputedDrawer,
  onOpenExportModal,
  onOpenSaveModal,
}: Props) {
  void _legacyFilter;
  // Drawer state for drill-down responses
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerSubtitle, setDrawerSubtitle] = useState("");
  const [drawerRecords, setDrawerRecords] = useState<DatasetRecord[]>([]);
  const [drawerTargetQuestionId, setDrawerTargetQuestionId] = useState<string | undefined>(undefined);

  const handleDrillDown = useCallback(
    (
      records: DatasetRecord[],
      title: string,
      subtitle?: string,
      targetQuestionId?: string
    ) => {
      setDrawerRecords(records);
      setDrawerTitle(title);
      setDrawerSubtitle(subtitle || "");
      setDrawerTargetQuestionId(targetQuestionId);
      setDrawerOpen(true);
    },
    []
  );

  // Flatten questions from surveyPages or construct from data.questions
  const flatQuestions = useMemo<SurveyResultQuestion[]>(() => {
    if (surveyPages && surveyPages.length > 0) {
      return flattenSurveyPagesQuestions(surveyPages);
    }
    return (data?.questions || []).map((q) => ({
      id: q.questionId,
      questionText: q.questionText,
      questionTypeCode: q.questionTypeCode,
      required: false,
      options: (q.choiceStatistics?.options || []).map((o) => ({
        id: o.optionId,
        optionText: o.optionText,
      })),
    })) as SurveyResultQuestion[];
  }, [surveyPages, data?.questions]);

  const activeDatasetRecords = useMemo(() => {
    if (output) return output.filteredRecords;
    return dataset?.records ?? [];
  }, [output, dataset?.records]);

  const questionConfigMap = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    for (const page of surveyPages) {
      for (const q of page.questions || []) {
        map.set(q.id, q.matrixConfig);
      }
    }
    return map;
  }, [surveyPages]);

  const fallbackRecordMap = useMemo(
    () => new Map(activeDatasetRecords.map((r) => [r.id, r])),
    [activeDatasetRecords]
  );

  if (loading && !data && !output) {
    return <div className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" aria-label="Đang tải báo cáo" />;
  }

  const computedFieldIds = useMemo(() => {
    const ids = new Set<string>();
    if (definition?.computedFields) {
      definition.computedFields.forEach((cf) => {
        ids.add(cf.id);
        ids.add(`computed:${cf.id}`);
      });
    }
    return ids;
  }, [definition?.computedFields]);

  const computedOverviewQuestions = useMemo<SurveyQuestionStatistic[]>(() => {
    if (output?.computedOverviewQuestions && output.computedOverviewQuestions.length > 0) {
      return output.computedOverviewQuestions;
    }
    if (output?.overviewQuestions) {
      return output.overviewQuestions.filter((q) => q.questionId.startsWith("computed:"));
    }
    return [];
  }, [output?.computedOverviewQuestions, output?.overviewQuestions]);

  const standardQuestions: SurveyQuestionStatistic[] = useMemo(() => {
    const base =
      mode === "questions" && output && dataset && output.overviewQuestions.length > 0
        ? output.overviewQuestions
        : (data?.questions ?? []);
    return base.filter(
      (q) => !q.questionId.startsWith("computed:") && !computedFieldIds.has(q.questionId)
    );
  }, [mode, output, dataset, data?.questions, computedFieldIds]);

  if (mode === "questions") {
    const byId = new Map(standardQuestions.map((question) => [question.questionId, question]));
    const assigned = new Set<string>();

    const groups = surveyPages
      .map((page, pageIndex) => {
        const pageQuestions = (page.questions ?? [])
          .map((question) => byId.get(question.id))
          .filter((question): question is SurveyQuestionStatistic => Boolean(question));
        pageQuestions.forEach((question) => assigned.add(question.questionId));
        return {
          id: page.id,
          pageNumber: pageIndex + 1,
          title: page.title || `Trang ${pageIndex + 1}`,
          questions: pageQuestions,
        };
      })
      .filter((group) => group.questions.length);

    const remaining = standardQuestions.filter((question) => !assigned.has(question.questionId));
    if (remaining.length) {
      groups.push({
        id: "other",
        pageNumber: groups.length + 1,
        title: surveyPages.length ? "Câu hỏi khác" : "Nội dung khảo sát",
        questions: remaining,
      });
    }

    const order = new Map(standardQuestions.map((question, index) => [question.questionId, index + 1]));
    const hasAnyQuestions = standardQuestions.length > 0 || computedOverviewQuestions.length > 0;

    return (
      <section className="space-y-8">
        {hasAnyQuestions ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <section
                key={group.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <header className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Trang {group.pageNumber}
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{group.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{group.questions.length} câu hỏi được phân tích</p>
                </header>

                <div className="grid gap-6 p-5 xl:grid-cols-2">
                  {group.questions.map((question) => (
                    <article
                      key={question.questionId}
                      className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          Câu {order.get(question.questionId)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {number.format(questionCount(question))} lượt trả lời
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                        {question.questionText}
                      </h3>

                      <QuestionBody
                        question={question}
                        matrixConfig={questionConfigMap.get(question.questionId)}
                        records={activeDatasetRecords}
                        onDrillDown={handleDrillDown}
                        computedValues={output?.computedValues}
                        computedFields={definition?.computedFields}
                      />
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {/* DEDICATED COMPUTED FIELDS & FORMULAS SECTION */}
            {computedOverviewQuestions.length > 0 && (
              <section
                data-testid="summary-computed-fields-section"
                className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm dark:border-indigo-950 dark:bg-slate-900"
              >
                <header className="border-b border-indigo-100 bg-linear-to-r from-indigo-50/80 via-white to-slate-50 px-6 py-4 dark:border-indigo-950 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                          <FunctionSquare size={14} />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                          Cột tự tạo & Công thức
                        </p>
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        Phân tích số liệu từ trường tính toán
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {computedOverviewQuestions.length} trường tính toán đã được tổng hợp số liệu
                      </p>
                    </div>
                    {onOpenComputedDrawer && (
                      <button
                        type="button"
                        onClick={onOpenComputedDrawer}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        <FunctionSquare size={13} />
                        Quản lý công thức
                      </button>
                    )}
                  </div>
                </header>

                <div className="grid gap-6 p-5 xl:grid-cols-2">
                  {computedOverviewQuestions.map((question, idx) => (
                    <article
                      key={question.questionId}
                      className="min-w-0 rounded-2xl border border-indigo-50 bg-white p-5 shadow-sm dark:border-indigo-950/50 dark:bg-slate-950/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          fx #{idx + 1}
                        </span>
                        <span className="text-xs text-slate-400">
                          {number.format(questionCount(question))} lượt tính
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                        {question.questionText}
                      </h3>

                      <QuestionBody
                        question={question}
                        records={activeDatasetRecords}
                        onDrillDown={(records, title, subtitle, targetId) => {
                          const target =
                            targetId ??
                            (question.questionId.startsWith("computed:")
                              ? question.questionId
                              : `computed:${question.questionId}`);
                          handleDrillDown(records, title, subtitle, target);
                        }}
                        computedValues={output?.computedValues}
                        computedFields={definition?.computedFields}
                      />
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <ListChecks className="mx-auto text-slate-400" size={32} />
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Chưa có thống kê câu hỏi</h3>
            <p className="mt-1 text-xs text-slate-500">Khảo sát này chưa nhận được câu trả lời nào để tổng hợp số liệu.</p>
          </div>
        )}

        {/* DRILL DOWN RESPONSE DRAWER */}
        <DrillDownResponseDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={drawerTitle}
          subtitle={drawerSubtitle}
          records={drawerRecords}
          questions={flatQuestions}
          targetQuestionId={drawerTargetQuestionId}
          surveyId={surveyId || ""}
          computedFields={definition?.computedFields}
          computedValues={output?.computedValues}
        />
      </section>
    );
  }

  // OVERVIEW MODE FALLBACK
  const points = timeline;
  const max = Math.max(1, ...points.map((point) => point.responses));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-xl font-semibold">Dữ liệu đã ghi nhận</h2>
        <p className="mt-2 text-sm text-gray-500">
          {filtered ? "Phản hồi theo bộ lọc đang áp dụng" : "Toàn bộ phản hồi khảo sát"}
        </p>
        <p className="mt-4 text-4xl font-semibold text-brand-600">
          {number.format(data?.totalResponses ?? 0)} <span className="text-sm font-medium text-gray-500">phản hồi</span>
        </p>
      </section>
    </div>
  );
}
