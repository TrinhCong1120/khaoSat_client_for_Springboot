"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApexOptions } from "apexcharts";
import {
  FiClipboard,
  FiUsers,
  FiTrendingUp,
  FiCheckCircle,
} from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import {
  type DashboardApiResponse,
  fetchDashboard,
  formatViDecimal,
  formatViInt,
  trendSigned,
} from "@/lib/dashboard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/50">
      <span className="text-sm text-gray-500 dark:text-gray-400">Đang tải biểu đồ…</span>
    </div>
  ),
});

const BRAND = "#465fff";
const BRAND_LIGHT = "#9cb9ff";

const DONUT_COLORS = [BRAND, "#12b76a", "#fd853a", "#9cb9ff", "#7592ff", "#c2d6ff"];

const getToken = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("token") || sessionStorage.getItem("token")
    : null;

type KpiCard = {
  label: string;
  value: string;
  hint: string;
  trend: string;
  positive: boolean;
  icon: React.ReactNode;
  accent: string;
};

function buildKpiCards(d: DashboardApiResponse): KpiCard[] {
  const { kpis } = d;
  const tOpen = trendSigned(kpis.openSurveysTrendDelta, "int");
  const tResp = trendSigned(kpis.responsesTrendPercent, "percent");
  const tComp = trendSigned(kpis.completionTrendDeltaPercent, "percent");
  const tSat = trendSigned(kpis.satisfactionTrendDelta, "decimal");

  const satValue =
    kpis.satisfactionScore == null
      ? "—"
      : formatViDecimal(kpis.satisfactionScore, 1);

  return [
    {
      label: "Khảo sát đang mở",
      value: formatViInt(kpis.openSurveys),
      hint: "so với kỳ trước (cùng độ dài)",
      trend: tOpen.text,
      positive: tOpen.positive,
      icon: <FiClipboard className="size-5" />,
      accent:
        "from-brand-500/15 to-brand-600/5 text-brand-600 dark:text-brand-400",
    },
    {
      label: "Phản hồi (30 ngày)",
      value: formatViInt(kpis.responsesLast30Days),
      hint: "tổng lượt gửi",
      trend: tResp.text,
      positive: tResp.positive,
      icon: <FiUsers className="size-5" />,
      accent:
        "from-blue-light-500/15 to-blue-light-600/5 text-blue-light-600 dark:text-blue-light-400",
    },
    {
      label: "Tỷ lệ hoàn thành",
      value: `${formatViDecimal(kpis.averageCompletionRatePercent, 0)}%`,
      hint: "trung bình toàn hệ thống",
      trend: tComp.text,
      positive: tComp.positive,
      icon: <FiCheckCircle className="size-5" />,
      accent:
        "from-success-500/15 to-success-600/5 text-success-600 dark:text-success-400",
    },
    {
      label: "Điểm hài lòng",
      value: satValue,
      hint:
        kpis.satisfactionScore == null
          ? "chưa thu thập / không áp dụng"
          : "thang 5 sao (nếu có)",
      trend: kpis.satisfactionScore == null ? "—" : tSat.text,
      positive: kpis.satisfactionScore == null ? true : tSat.positive,
      icon: <FiTrendingUp className="size-5" />,
      accent:
        "from-orange-500/15 to-orange-600/5 text-orange-600 dark:text-orange-400",
    },
  ];
}

/** Pad 7 ngày: thiếu label thì dùng chỉ số */
function padActivity7(
  days: DashboardApiResponse["activityLast7Days"]
): { label: string; responses: number; views: number }[] {
  const out: { label: string; responses: number; views: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const row = days[i];
    out.push({
      label: row?.label || `D${i + 1}`,
      responses: row?.responses ?? 0,
      views: row?.views ?? 0,
    });
  }
  return out;
}

export default function AdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoadError(null);
    const token = getToken();
    if (!token) {
      setLoadError("Không có token. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetchDashboard(token);
      setData(res);
    } catch (e) {
      setData(null);
      setLoadError(e instanceof Error ? e.message : "Không tải được dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const muted = isDark ? "#98a2b3" : "#667085";
  const border = isDark ? "#344054" : "#e4e7ec";

  const activity = useMemo(
    () => (data ? padActivity7(data.activityLast7Days) : padActivity7([])),
    [data]
  );

  const areaSeries = useMemo(
    () => [
      { name: "Phản hồi mới", data: activity.map((d) => d.responses) },
      { name: "Lượt xem", data: activity.map((d) => d.views) },
    ],
    [activity]
  );

  const areaOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "area",
        height: 280,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: [BRAND, BRAND_LIGHT],
      stroke: { curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: border,
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
      },
      xaxis: {
        categories: activity.map((d) => d.label),
        labels: { style: { colors: muted } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: muted } },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        labels: { colors: muted },
      },
      tooltip: {
        theme: isDark ? "dark" : "light",
      },
    }),
    [isDark, muted, border, activity]
  );

  const statusSlices = data?.statusDistribution ?? [];
  const donutSeries = useMemo(
    () => statusSlices.map((s) => s.count),
    [statusSlices]
  );
  const donutLabels = useMemo(
    () => statusSlices.map((s) => s.label),
    [statusSlices]
  );
  const donutTotal = useMemo(
    () => donutSeries.reduce((a, b) => a + b, 0),
    [donutSeries]
  );

  const donutOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "donut",
        height: 320,
      },
      labels: donutLabels.length ? donutLabels : ["—"],
      colors: DONUT_COLORS.slice(0, Math.max(donutLabels.length, 1)),
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { color: muted },
              value: {
                fontSize: "28px",
                fontWeight: 700,
                color: isDark ? "#f9fafb" : "#101828",
              },
              total: {
                show: true,
                label: "Tổng khảo sát",
                color: muted,
                formatter: () => formatViInt(donutTotal),
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      legend: {
        position: "bottom",
        labels: { colors: muted },
      },
      stroke: { width: 0 },
      tooltip: { theme: isDark ? "dark" : "light" },
    }),
    [isDark, muted, donutLabels, donutTotal]
  );

  const topList = data?.topSurveysByCompletion ?? [];
  const barSeriesData = topList.map((s) => s.completionPercent);
  const barCategories = topList.map((s) => s.title);

  const barOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "bar",
        height: Math.max(220, topList.length * 48),
        toolbar: { show: false },
        sparkline: { enabled: false },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: "68%",
          distributed: true,
        },
      },
      colors: DONUT_COLORS.slice(0, Math.max(topList.length, 1)),
      dataLabels: {
        enabled: topList.length > 0,
        formatter: (val: number) => `${formatViDecimal(val, 0)}%`,
        style: { colors: [isDark ? "#f9fafb" : "#101828"] },
      },
      xaxis: {
        categories: barCategories.length ? barCategories : ["—"],
        max: 100,
        labels: { style: { colors: muted } },
      },
      yaxis: { labels: { style: { colors: muted } } },
      grid: { borderColor: border, strokeDashArray: 4 },
      legend: { show: false },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: { formatter: (val: number) => `${formatViDecimal(val, 0)}% hoàn thành` },
      },
    }),
    [isDark, muted, border, topList.length, barCategories]
  );

  const barSeries = useMemo(
    () => [{ data: barSeriesData.length ? barSeriesData : [0] }],
    [barSeriesData]
  );

  const kpiCards = useMemo(
    () => (data ? buildKpiCards(data) : buildKpiCards({
      kpis: {
        openSurveys: 0,
        responsesLast30Days: 0,
        averageCompletionRatePercent: 0,
      },
      activityLast7Days: [],
      statusDistribution: [],
      topSurveysByCompletion: [],
    })),
    [data]
  );

  const chartKey = `${donutSeries.join(",")}-${areaSeries[0].data.join(",")}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">
            Tổng quan
          </h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Thống kê từ API <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">GET /survey/dashboard</code>
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-theme-xs font-medium text-gray-600 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {loading ? "Đang tải…" : "Làm mới"}
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-theme-xs font-medium text-gray-600 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            <span
              className={`size-2 rounded-full ${loadError ? "bg-error-500" : "bg-success-500"}`}
              aria-hidden
            />
            {loadError ? "Lỗi tải dữ liệu" : "Đã đồng bộ"}
          </div>
        </div>
      </header>

      {loadError && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-theme-sm text-error-800 dark:border-error-900/50 dark:bg-error-500/10 dark:text-error-200">
          <p className="font-semibold">Chưa có dữ liệu hoặc API chưa sẵn sàng</p>
          <p className="mt-1 text-theme-xs opacity-90">{loadError}</p>
          <p className="mt-2 text-theme-xs text-error-700/90 dark:text-error-300/90">
            Backend cần endpoint <strong>GET /survey/dashboard</strong> (Bearer). Xem cấu trúc JSON trong{" "}
            <code className="rounded bg-white/60 px-1 dark:bg-black/30">client/src/lib/dashboard.ts</code>.
          </p>
        </div>
      )}

      {loading && !data && !loadError && (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
          Đang tải thống kê…
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((k) => (
          <article
            key={k.label}
            className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              className={`absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${k.accent} opacity-40 blur-2xl`}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {k.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {k.value}
                </p>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-500">
                  {k.hint}
                </p>
              </div>
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${k.accent}`}
              >
                {k.icon}
              </div>
            </div>
            <div className="relative mt-4 flex items-center gap-2">
              <span
                className={
                  k.trend === "—"
                    ? "text-theme-xs font-semibold text-gray-400"
                    : k.positive
                      ? "text-theme-xs font-semibold text-success-600 dark:text-success-400"
                      : "text-theme-xs font-semibold text-error-500"
                }
              >
                {k.trend}
              </span>
              <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                xu hướng
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white">
              Hoạt động 7 ngày
            </h2>
            <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-theme-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              Phản hồi &amp; lượt xem
            </span>
          </div>
          {data && activity.every((d) => d.responses === 0 && d.views === 0) ? (
            <p className="flex h-[280px] items-center justify-center text-theme-sm text-gray-500">
              Chưa có dữ liệu hoạt động 7 ngày (mảng <code className="mx-1 rounded bg-gray-100 px-1 dark:bg-gray-800">activityLast7Days</code> rỗng hoặc toàn 0).
            </p>
          ) : (
            <ReactApexChart
              key={`area-${chartKey}`}
              options={areaOptions}
              series={areaSeries}
              type="area"
              height={280}
            />
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-1 text-theme-sm font-semibold text-gray-800 dark:text-white">
            Trạng thái khảo sát
          </h2>
          <p className="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">
            Phân bổ theo giai đoạn vòng đời
          </p>
          {!donutTotal ? (
            <p className="flex h-[320px] items-center justify-center text-center text-theme-sm text-gray-500">
              Chưa có phân bổ trạng thái (<code className="rounded bg-gray-100 px-1 dark:bg-gray-800">statusDistribution</code>).
            </p>
          ) : (
            <ReactApexChart
              key={`donut-${chartKey}`}
              options={donutOptions}
              series={donutSeries.length ? donutSeries : [0]}
              type="donut"
              height={320}
            />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white">
              Mức hoàn thành — khảo sát nổi bật
            </h2>
            <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              Theo <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">topSurveysByCompletion</code>
            </p>
          </div>
        </div>
        {!topList.length ? (
          <p className="py-8 text-center text-theme-sm text-gray-500">
            Chưa có khảo sát nào để xếp hạng.
          </p>
        ) : (
          <>
            <ReactApexChart
              key={`bar-${chartKey}`}
              options={barOptions}
              series={barSeries}
              type="bar"
              height={Math.max(220, topList.length * 48)}
            />
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {topList.map((s, idx) => (
                <li
                  key={`${idx}-${s.title}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40"
                >
                  <span className="truncate text-theme-sm font-medium text-gray-700 dark:text-gray-200">
                    {s.title}
                  </span>
                  <span className="shrink-0 text-theme-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {formatViInt(s.responseCount)} phản hồi
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
