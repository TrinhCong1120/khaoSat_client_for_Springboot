"use client";

import React, { useMemo, useState } from "react";
import {
  RefreshCw,
  Filter,
  Layers,
  PieChart,
  Activity,
  ShieldCheck,
  Compass,
  Clock,
  Calendar,
  Smartphone,
  Globe,
  Share2,
  Eye,
  CheckCircle2,
  TrendingUp,
  Target,
} from "lucide-react";
import EChartsContainer, { type EChartsOption } from "@/components/charts/EChartsContainer";
import DateWheelPicker from "@/components/admin/DateWheelPicker";
import type { Trend } from "@/lib/dashboard-report";
import type { SurveyDashboard } from "@/types/survey-dashboard";

const panel = "min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow duration-200 dark:border-slate-800/90 dark:bg-slate-900";
const muted = "text-xs text-slate-500 dark:text-slate-400";
const integer = new Intl.NumberFormat("vi-VN");
const decimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const num = (value: number | null | undefined) => (value == null ? "—" : integer.format(value));
const fmt = (value: number | null | undefined, suffix = "") => (value == null ? "—" : decimal.format(value) + suffix);
const duration = (value: number | null | undefined) => (value == null ? "—" : fmt(value / 1000, " giây"));

function MetricCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  note,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${iconBg} ${iconColor}`}>
          <Icon size={16} />
        </div>
      </div>
      <strong className="mt-2 block text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
        {value}
      </strong>
      {note && (
        <p className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {note}
        </p>
      )}
    </div>
  );
}

function TrendLabel({ value }: { value: Trend | null }) {
  if (!value) return <span>Chưa ghi nhận</span>;
  if (value.label) return <span>{value.label}{value.delta > 0 ? ` (+${num(value.delta)})` : ""}</span>;
  return (
    <span>
      {value.delta >= 0 ? "Tăng" : "Giảm"} {fmt(Math.abs(value.percent ?? 0), "%")} ({value.delta > 0 ? "+" : ""}{num(value.delta)})
    </span>
  );
}

type Props = {
  data: SurveyDashboard | null;
  loading: boolean;
  error: string;
  fromDate: string;
  toDate: string;
  maxDate: string;
  valid: boolean;
  onFromDate: (value: string) => void;
  onToDate: (value: string) => void;
  onRefresh: () => void;
};

export default function SurveyDashboardTab({
  data,
  loading,
  error,
  fromDate,
  toDate,
  maxDate,
  valid,
  onFromDate,
  onToDate,
  onRefresh,
}: Props) {

  const scope = fromDate && toDate ? `${fromDate} – ${toDate}` : fromDate ? `Từ ${fromDate}` : toDate ? `Đến ${toDate}` : "Toàn thời gian";
  const observed = data?.activity.trackingStatus !== "NO_TRACKING";
  const percent = (value: number | null) => fmt(value, "%");
  const bucketLabel = data?.period.bucket === "HOUR" ? "giờ" : data?.period.bucket === "DAY" ? "ngày" : data?.period.bucket === "MONTH" ? "tháng" : "năm";

  // 1. TIMELINE AREA CHART (Lượt xem & Phản hồi) - Tối ưu lề và khoảng cách hiển thị
  const timelineOption = useMemo<EChartsOption>(() => {
    if (!data?.activity.timeline.length) return {};
    const timeline = data.activity.timeline;
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", crossStyle: { color: "#94a3b8" } },
      },
      legend: {
        data: ["Lượt xem", "Phản hồi"],
        top: 8,
        left: 20,
        icon: "roundRect",
        textStyle: { fontSize: 12 },
      },
      toolbox: {
        right: 15,
        top: 8,
        itemSize: 14,
        feature: {
          saveAsImage: { title: "Tải ảnh" },
          dataZoom: { title: { zoom: "Phóng to", back: "Khôi phục" } },
          restore: { title: "Đặt lại" },
        },
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: 50,
        top: 55,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: timeline.map((p) => p.label),
        axisLabel: { fontSize: 11, margin: 12 },
        axisLine: { lineStyle: { color: "#cbd5e1" } },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { fontSize: 11 },
        splitLine: { lineStyle: { type: "dashed", color: "rgba(148, 163, 184, 0.2)" } },
      },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", height: 16, bottom: 8, start: 0, end: 100 },
      ],
      series: [
        {
          name: "Lượt xem",
          type: "line",
          smooth: true,
          showSymbol: timeline.length <= 25,
          symbolSize: 6,
          itemStyle: { color: "#2563eb" },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(37, 99, 235, 0.3)" },
                { offset: 1, color: "rgba(37, 99, 235, 0.01)" },
              ],
            },
          },
          data: timeline.map((p) => p.views ?? 0),
        },
        {
          name: "Phản hồi",
          type: "line",
          smooth: true,
          showSymbol: timeline.length <= 25,
          symbolSize: 6,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(16, 185, 129, 0.3)" },
                { offset: 1, color: "rgba(16, 185, 129, 0.01)" },
              ],
            },
          },
          data: timeline.map((p) => p.submissions ?? 0),
        },
      ],
    };
  }, [data?.activity.timeline]);

  // 2. THAY THẾ PHỄU: BIỂU ĐỒ CỘT TIẾN TRÌNH CHUYỂN ĐỔI ĐA TẦNG (MULTI-STAGE PROGRESS BAR CHART)
  const conversionOption = useMemo<EChartsOption>(() => {
    if (!data?.funnel) return {};
    const f = data.funnel;
    const maxVal = Math.max(f.viewed || 1, f.started, f.submitted, 1);

    const stages = [
      { name: "3. Nộp bài thành công", value: f.submitted, rate: f.viewToSubmitRate, color: "#10b981" },
      { name: "2. Bắt đầu điền câu hỏi", value: f.started, rate: f.viewToStartRate, color: "#06b6d4" },
      { name: "1. Đã xem khảo sát", value: f.viewed, rate: 100, color: "#3b82f6" },
    ];

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const item = params[0];
          return `<b>${item.name}</b><br/>Số lượng: <b>${integer.format(item.value)}</b> lượt`;
        },
      },
      toolbox: {
        feature: { saveAsImage: { title: "Tải ảnh" } },
        right: 10,
        top: 0,
      },
      grid: {
        left: "3%",
        right: "12%",
        top: "10%",
        bottom: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        max: maxVal,
        splitLine: { show: false },
        axisLabel: { show: false },
      },
      yAxis: {
        type: "category",
        data: stages.map((s) => s.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 12,
          fontWeight: "bold",
        },
      },
      series: [
        {
          name: "Số lượng",
          type: "bar",
          data: stages.map((s) => ({
            value: s.value,
            itemStyle: {
              color: s.color,
              borderRadius: [0, 8, 8, 0],
            },
          })),
          barWidth: 26,
          showBackground: true,
          backgroundStyle: {
            color: "rgba(148, 163, 184, 0.12)",
            borderRadius: [0, 8, 8, 0],
          },
          label: {
            show: true,
            position: "right",
            formatter: (params: any) => {
              const val = params.value;
              const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
              return `${integer.format(val)} (${pct}%)`;
            },
            fontWeight: "bold",
            fontSize: 12,
          },
        },
      ],
    };
  }, [data?.funnel]);

  // 3. THIẾT BỊ (DONUT CHART GỌN GÀNG CHO THẺ RIÊNG BIỆT)
  const devicesOption = useMemo<EChartsOption>(() => {
    const list = data?.acquisition.devices ?? [];
    if (!list.length) return {};
    return {
      tooltip: {
        trigger: "item",
        formatter: "{b}: <b>{c}</b> ({d}%)",
      },
      legend: {
        orient: "horizontal",
        bottom: 0,
        icon: "circle",
        textStyle: { fontSize: 10 },
      },
      toolbox: {
        feature: { saveAsImage: { title: "Tải ảnh" } },
        right: 12,
        top: 4,
      },
      series: [
        {
          name: "Thiết bị",
          type: "pie",
          radius: ["40%", "68%"],
          center: ["50%", "48%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
          },
          label: {
            show: true,
            position: "inside",
            formatter: (params: any) => (params.percent >= 6 ? `${params.percent}%` : ""),
            fontSize: 11,
            fontWeight: "bold",
            color: "#ffffff",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: "bold",
            },
          },
          data: list.map((item) => ({
            name: item.label === "UNKNOWN" ? "Khác / Không rõ" : item.label,
            value: item.count,
          })),
        },
      ],
    };
  }, [data?.acquisition.devices]);

  // 4. NGUỒN TRUY CẬP (DONUT CHART GỌN GÀNG CHO THẺ RIÊNG BIỆT)
  const sourcesOption = useMemo<EChartsOption>(() => {
    const list = data?.acquisition.sources ?? [];
    if (!list.length) return {};
    return {
      tooltip: {
        trigger: "item",
        formatter: "{b}: <b>{c}</b> ({d}%)",
      },
      legend: {
        orient: "horizontal",
        bottom: 0,
        icon: "circle",
        textStyle: { fontSize: 10 },
      },
      toolbox: {
        feature: { saveAsImage: { title: "Tải ảnh" } },
        right: 12,
        top: 4,
      },
      series: [
        {
          name: "Nguồn truy cập",
          type: "pie",
          radius: ["40%", "68%"],
          center: ["50%", "48%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
          },
          label: {
            show: true,
            position: "inside",
            formatter: (params: any) => (params.percent >= 6 ? `${params.percent}%` : ""),
            fontSize: 11,
            fontWeight: "bold",
            color: "#ffffff",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: "bold",
            },
          },
          data: list.map((item) => ({
            name: item.label === "UNKNOWN" ? "Trực tiếp / Không rõ" : item.label,
            value: item.count,
          })),
        },
      ],
    };
  }, [data?.acquisition.sources]);

  // 5. UTM MEDIUMS (HORIZONTAL BAR CHART GỌN GÀNG CHO THẺ RIÊNG BIỆT)
  const mediumsOption = useMemo<EChartsOption>(() => {
    const list = data?.acquisition.mediums ?? [];
    if (!list.length) return {};
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      toolbox: { feature: { saveAsImage: { title: "Tải ảnh" } }, right: 12, top: 4 },
      grid: { left: "3%", right: "12%", bottom: "5%", top: 36, containLabel: true },
      xAxis: { type: "value", minInterval: 1 },
      yAxis: {
        type: "category",
        data: list.map((item) => (item.label === "UNKNOWN" ? "Trực tiếp" : item.label)),
        axisLabel: { width: 85, overflow: "truncate", fontSize: 10 },
      },
      series: [
        {
          name: "Lượt truy cập",
          type: "bar",
          data: list.map((item) => item.count),
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: "#6366f1",
          },
          label: { show: true, position: "right", fontSize: 10 },
        },
      ],
    };
  }, [data?.acquisition.mediums]);

  // 6. BIỂU ĐỒ MẠNG NHỆN THEO THỨ TRONG TUẦN (WEEKDAY RADAR CHART)
  const weekdayOption = useMemo<EChartsOption>(() => {
    const weekdays = data?.engagement.byWeekday ?? [];
    const daysMap = new Map(weekdays.map((item) => [item.day, item.submissions]));
    const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
    const values = [
      daysMap.get(1) ?? 0,
      daysMap.get(2) ?? 0,
      daysMap.get(3) ?? 0,
      daysMap.get(4) ?? 0,
      daysMap.get(5) ?? 0,
      daysMap.get(6) ?? 0,
      daysMap.get(7) ?? 0,
    ];
    const maxVal = Math.max(...values, 5);

    const indicators = dayNames.map((name) => ({
      name,
      max: Math.ceil(maxVal * 1.15),
    }));

    return {
      tooltip: {
        trigger: "item",
        formatter: () => {
          const lines = dayNames.map((d, i) => `${d}: <b>${values[i]}</b> phản hồi`);
          return `<b>Phân bố theo thứ trong tuần</b><br/>${lines.join("<br/>")}`;
        },
      },
      toolbox: {
        feature: { saveAsImage: { title: "Tải ảnh" } },
        right: 12,
        top: 4,
      },
      radar: {
        indicator: indicators,
        shape: "polygon",
        radius: "60%",
        center: ["50%", "54%"],
        splitNumber: 4,
        axisName: {
          color: "#64748b",
          fontWeight: 600,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.3)",
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ["rgba(148, 163, 184, 0.03)", "rgba(148, 163, 184, 0.08)"],
          },
        },
        axisLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.3)",
          },
        },
      },
      series: [
        {
          name: "Phản hồi theo thứ",
          type: "radar",
          data: [
            {
              value: values,
              name: "Số phản hồi",
              symbol: "circle",
              symbolSize: 6,
              lineStyle: {
                width: 2.5,
                color: "#7c3aed",
              },
              itemStyle: {
                color: "#7c3aed",
              },
              areaStyle: {
                color: {
                  type: "radial",
                  x: 0.5,
                  y: 0.5,
                  r: 0.5,
                  colorStops: [
                    { offset: 0, color: "rgba(124, 58, 237, 0.45)" },
                    { offset: 1, color: "rgba(124, 58, 237, 0.1)" },
                  ],
                },
              },
            },
          ],
        },
      ],
    };
  }, [data?.engagement.byWeekday]);

  // 7. KHUNG GIỜ VÀNG 24H (PEAK HOURS BAR CHART)
  const hoursOption = useMemo<EChartsOption>(() => {
    const hours = data?.engagement.byHour ?? [];
    const hourMap = new Map(hours.map((item) => [item.hour, item.submissions]));
    const labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
    const values = Array.from({ length: 24 }, (_, i) => hourMap.get(i) ?? 0);
    const maxVal = Math.max(...values, 1);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: "{b}: <b>{c}</b> phản hồi",
      },
      toolbox: { feature: { saveAsImage: { title: "Tải ảnh" } }, right: 12, top: 4 },
      grid: { left: "3%", right: "3%", bottom: "8%", top: 36, containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { interval: 1, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: "rgba(148, 163, 184, 0.2)" } },
      },
      series: [
        {
          name: "Phản hồi",
          type: "bar",
          data: values.map((val) => ({
            value: val,
            itemStyle: {
              color: val === maxVal && val > 0 ? "#059669" : "#34d399",
              borderRadius: [4, 4, 0, 0],
            },
          })),
          markPoint: {
            data: [{ type: "max", name: "Giờ cao điểm" }],
          },
        },
      ],
    };
  }, [data?.engagement.byHour]);

  // 8. THƯỚC ĐO BÁN NGUYỆT TINH TẾ (SEMI-CIRCLE CLEAN GAUGES)
  const compRate = Math.round(data?.completeness.completionRate ?? 0);
  const viewToSubmitRate = Math.round(data?.funnel.viewToSubmitRate ?? 0);

  return (
    <div className="space-y-6">
      {/* FILTER CONTROLS */}
      <section className={`${panel} flex flex-wrap items-end gap-3`} aria-label="Phạm vi dashboard">
        <div className="mr-auto min-w-[280px]">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Filter size={15} />
            </span>
            Bộ lọc thời gian thống kê
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Chọn khoảng thời gian để phân tích các biểu đồ tương tác bên dưới · Giờ Việt Nam
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <DateWheelPicker label="Từ ngày" max={maxDate} value={fromDate} onChange={onFromDate} />
        </div>
        <div className="w-full sm:w-auto">
          <DateWheelPicker label="Đến ngày" max={maxDate} value={toDate} onChange={onToDate} />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={!valid || loading}
          className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
        {!valid && <p role="alert" className="w-full text-xs font-medium text-rose-600">Khoảng ngày không hợp lệ.</p>}
        {data && (
          <div className="flex w-full flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Phạm vi:</span>
            <span className="rounded-md bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              {scope}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>
              Cập nhật lúc: {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(data.generatedAt))}
            </span>
          </div>
        )}
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      {loading && <p role="status" className="text-xs font-medium text-blue-600 animate-pulse">Đang nạp và tính toán số liệu biểu đồ…</p>}

      {!data ? (
        !loading && !error && <p className={muted}>Chưa có dữ liệu báo cáo cho khảo sát này.</p>
      ) : (
        <>
          {/* TOP METRIC CARDS (HIGH CONTRAST & SOLID BACKGROUND) */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Chỉ số chính">
            <MetricCard
              icon={Eye}
              iconColor="text-blue-600 dark:text-blue-400"
              iconBg="bg-blue-50 dark:bg-blue-950/60"
              label="Lượt xem khảo sát"
              value={num(data.activity.views)}
              note={data.activity.trackingStatus === "PARTIAL" ? "Ghi nhận một phần" : observed ? "Số lần người dùng mở bài" : "Chưa ghi nhận"}
            />
            <MetricCard
              icon={CheckCircle2}
              iconColor="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-50 dark:bg-emerald-950/60"
              label="Phản hồi đã gửi"
              value={num(data.activity.submissions)}
              note="Số bài nộp thành công"
            />
            <MetricCard
              icon={TrendingUp}
              iconColor="text-indigo-600 dark:text-indigo-400"
              iconBg="bg-indigo-50 dark:bg-indigo-950/60"
              label={`Trung bình mỗi ${bucketLabel}`}
              value={fmt(data.averageSubmissionsPerBucket)}
              note={`Số phản hồi trung bình / ${bucketLabel}`}
            />
            <MetricCard
              icon={Target}
              iconColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-50 dark:bg-amber-950/60"
              label="Tỷ lệ xem rồi gửi"
              value={percent(data.funnel.viewToSubmitRate)}
              note="Tỷ lệ nộp bài trên lượt xem"
            />
            <MetricCard
              icon={ShieldCheck}
              iconColor="text-cyan-600 dark:text-cyan-400"
              iconBg="bg-cyan-50 dark:bg-cyan-950/60"
              label="Tỷ lệ câu đã trả lời"
              value={percent(data.completeness.completionRate)}
              note="Mức độ hoàn thành câu hỏi"
            />
          </section>

          {/* SƠ ĐỒ 1: TIMELINE MIỀN THỜI GIAN (AREA CHART) */}
          <section className={panel} aria-label="Lượt xem và phản hồi theo thời gian">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Activity size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Diễn biến Lượt xem & Phản hồi theo thời gian
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Dữ liệu theo {data.period.bucket === "HOUR" ? "giờ" : data.period.bucket === "DAY" ? "ngày" : data.period.bucket === "MONTH" ? "tháng" : "năm"} · Phóng to thu nhỏ bằng chuột hoặc thanh trượt bên dưới
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  Lượt xem: <TrendLabel value={data.viewsTrend} />
                </span>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Phản hồi: <TrendLabel value={data.submissionsTrend} />
                </span>
              </div>
            </div>

            {data.activity.timeline.length ? (
              <div className="mt-3">
                <EChartsContainer option={timelineOption} height={320} />
              </div>
            ) : (
              <p className={`${muted} py-12 text-center`}>Chưa có mốc thời gian trong khoảng lọc này.</p>
            )}

            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Xem bảng số liệu chi tiết
              </summary>
              <div className="mt-2 max-h-52 overflow-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                    <tr>
                      <th className="p-2.5 font-semibold">Thời gian</th>
                      <th className="p-2.5 font-semibold">Lượt xem</th>
                      <th className="p-2.5 font-semibold">Phản hồi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.activity.timeline.map((point) => (
                      <tr key={point.start}>
                        <td className="p-2.5">{point.label}</td>
                        <td className="p-2.5 font-semibold text-blue-600">{num(point.views)}</td>
                        <td className="p-2.5 font-semibold text-emerald-600">{num(point.submissions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          {/* SƠ ĐỒ 2: TIẾN TRÌNH CHUYỂN ĐỔI (THAY CHO PHỄU) & THƯỚC ĐO CHẤT LƯỢNG */}
          <section className="grid gap-6 lg:grid-cols-2" aria-label="Hành trình chuyển đổi và Thước đo">
            {/* THAY THẾ PHỄU: TIẾN TRÌNH PHÂN TẦNG */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Layers size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Hành trình chuyển đổi qua từng chặng
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Tỷ lệ chuyển tiếp từ lúc mở trang đến khi nộp bài thành công
                  </p>
                </div>
              </div>

              {observed ? (
                <div className="mt-2">
                  <EChartsContainer option={conversionOption} height={240} />
                </div>
              ) : (
                <p className={`${muted} py-12 text-center`}>Chưa có đủ dữ liệu hành trình chuyển đổi.</p>
              )}

              {/* CHỈ SỐ RƠI RỤNG CHI TIẾT */}
              <div className="mt-3.5 grid grid-cols-3 gap-3 border-t border-slate-100/80 pt-3.5 text-center dark:border-slate-800/80">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Xem → Bắt đầu</span>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-800 dark:text-slate-200">{percent(data.funnel.viewToStartRate)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Rời đi: {num(data.funnel.onlyViewed)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Bắt đầu → Gửi</span>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-cyan-600 dark:text-cyan-400">{percent(data.funnel.startToSubmitRate)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Bỏ dở: {num(data.funnel.abandoned)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Chuyển đổi chung</span>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{percent(data.funnel.viewToSubmitRate)}</p>
                  <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">Thành công: {num(data.funnel.submitted)}</p>
                </div>
              </div>
            </article>

            {/* THƯỚC ĐO TIẾN ĐỘ BÁN NGUYỆT SẠCH SẼ, KHÔNG ĐÈ CHỮ */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Hiệu suất hoàn thành & Chất lượng dữ liệu
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Đánh giá mức độ trả lời đầy đủ và thời gian hoàn thành
                  </p>
                </div>
              </div>

              {/* 2 VÒNG TIẾN ĐỘ TÁCH BIỆT RÕ RÀNG */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20 text-center">
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">Hoàn thành câu hỏi</div>
                  <div className="mt-2 text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                    {compRate}%
                  </div>
                  <div className="mt-2 h-2 w-full max-w-[130px] rounded-full bg-blue-200 dark:bg-blue-900/60 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${compRate}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {num(data.completeness.answeredQuestions)} / {num(data.completeness.applicableQuestions)} câu
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20 text-center">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Tỷ lệ xem rồi gửi</div>
                  <div className="mt-2 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {viewToSubmitRate}%
                  </div>
                  <div className="mt-2 h-2 w-full max-w-[130px] rounded-full bg-emerald-200 dark:bg-emerald-900/60 overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${viewToSubmitRate}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {num(data.funnel.submitted)} / {num(data.funnel.viewed)} lượt
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> Thời gian làm bài trung bình:</span>
                  <strong className="font-semibold text-slate-900 dark:text-white">{duration(data.engagement.medianActiveDurationMs)}</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5"><Layers size={13} className="text-slate-400" /> Số trang xem trung bình:</span>
                  <strong className="font-semibold text-slate-900 dark:text-white">{fmt(data.engagement.averagePagesViewed)} trang</strong>
                </div>
              </div>
            </article>
          </section>

          {/* SƠ ĐỒ 3: 3 THẺ HIỂN THỊ NGANG HÀNG: THIẾT BỊ, NGUỒN TRUY CẬP & UTM */}
          <section className="grid gap-6 lg:grid-cols-3" aria-label="Thiết bị, Nguồn truy cập và Kênh UTM">
            {/* THẺ 1: THIẾT BỊ */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Smartphone size={16} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Cơ cấu Thiết bị
                  </h3>
                  <p className={muted}>Phân bố Mobile, Desktop và Tablet</p>
                </div>
              </div>
              <div className="mt-2">
                {data.acquisition.devices.length ? (
                  <EChartsContainer option={devicesOption} height={250} />
                ) : (
                  <p className={`${muted} py-12 text-center`}>Chưa có dữ liệu thiết bị.</p>
                )}
              </div>
            </article>

            {/* THẺ 2: NGUỒN TRUY CẬP */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Globe size={16} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Nguồn giới thiệu
                  </h3>
                  <p className={muted}>Trực tiếp, MXH, Search...</p>
                </div>
              </div>
              <div className="mt-2">
                {data.acquisition.sources.length ? (
                  <EChartsContainer option={sourcesOption} height={250} />
                ) : (
                  <p className={`${muted} py-12 text-center`}>Chưa có dữ liệu nguồn truy cập.</p>
                )}
              </div>
            </article>

            {/* THẺ 3: KÊNH TIẾP THỊ UTM */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Share2 size={16} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Kênh tiếp thị UTM
                  </h3>
                  <p className={muted}>UTM Medium (Email, CPC, QR...)</p>
                </div>
              </div>
              <div className="mt-2">
                {data.acquisition.mediums.length ? (
                  <EChartsContainer option={mediumsOption} height={250} />
                ) : (
                  <p className={`${muted} py-12 text-center`}>Chưa có dữ liệu UTM Medium.</p>
                )}
              </div>
            </article>
          </section>

          {/* SƠ ĐỒ 4: PHÂN BỐ PHẢN HỒI THEO THỨ (MẠNG NHỆN) & KHUNG GIỜ VÀNG (24H) */}
          <section className="grid gap-6 lg:grid-cols-2" aria-label="Khung giờ và Thứ trong tuần">
            {/* SƠ ĐỒ MẠNG NHỆN THEO THỨ TRONG TUẦN */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <Compass size={16} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Phân bố phản hồi theo Ngày trong tuần
                  </h3>
                  <p className={muted}>Biểu đồ mạng nhện thể hiện tần suất gửi phản hồi từ Thứ 2 đến Chủ Nhật</p>
                </div>
              </div>

              <div className="mt-2">
                <EChartsContainer option={weekdayOption} height={270} />
              </div>
            </article>

            {/* CỘT 24 GIỜ */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Clock size={16} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Khung giờ vàng nhận bài nộp (0h - 23h)
                  </h3>
                  <p className={muted}>Xác định khung thời gian người dùng tập trung làm khảo sát trong ngày</p>
                </div>
              </div>

              <div className="mt-2">
                <EChartsContainer option={hoursOption} height={270} />
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
