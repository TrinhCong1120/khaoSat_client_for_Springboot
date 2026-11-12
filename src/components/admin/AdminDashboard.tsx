"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  FolderOpen,
  Globe,
  HelpCircle,
  Layers,
  MessageSquare,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Tv,
  Users,
} from "lucide-react";
import EChartsContainer, { type EChartsOption } from "@/components/charts/EChartsContainer";
import DateWheelPicker from "@/components/admin/DateWheelPicker";
import DashboardPresentationModal from "@/components/admin/DashboardPresentationModal";
import { API_DASHBOARD } from "@/lib/api";
import { getToken, getUser, isUserAdmin } from "@/lib/auth";
import { fetchReport, reportParams, type Report, type SurveyPage, type Trend } from "@/lib/dashboard-report";
import { formatViDecimal as dec, formatViInt as num } from "@/lib/dashboard";

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string; color: string }> = {
  OPEN: { label: "Đang mở", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", color: "#10b981" },
  CLOSED: { label: "Đã đóng", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500", color: "#f43f5e" },
  DRAFT: { label: "Bản nháp", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-400", color: "#64748b" },
  SCHEDULED: { label: "Lên lịch", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", color: "#f59e0b" },
};

const panel = "min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow duration-200 dark:border-slate-800/90 dark:bg-slate-900";
const muted = "text-xs text-slate-500 dark:text-slate-400";
const fmt = (value: number | null | undefined, suffix = "") => (value == null ? "—" : dec(value) + suffix);
const count = (value: number | null | undefined) => (value == null ? "0" : num(value));
const duration = (value: number | null | undefined) => (value == null ? "—" : dec(value / 1000) + "s");

const vnToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const dateStart = (date: string) => new Date(date + "T00:00:00+07:00").toISOString();
const dateEnd = (date: string, now: number) =>
  date === vnToday() ? new Date(now).toISOString() : new Date(Date.parse(date + "T00:00:00+07:00") + 86400000).toISOString();
const dateLabel = (date: string) => date.slice(8, 10) + "/" + date.slice(5, 7) + "/" + date.slice(0, 4);

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
  note?: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${iconBg} ${iconColor}`}>
          <Icon size={18} />
        </div>
      </div>
      <strong className="mt-3 block text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white sm:text-3xl">
        {value}
      </strong>
      {note && (
        <div className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {note}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [username, setUsername] = useState("");
  const [scope, setScope] = useState<"all" | "my">(() => (typeof window !== "undefined" && isUserAdmin() ? "all" : "my"));
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  // Filters
  const [preset, setPreset] = useState<"all" | "today" | "7d" | "30d" | "custom">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [asOf, setAsOf] = useState(Date.now());

  // Data states
  const [report, setReport] = useState<Report | null>(null);
  const [surveys, setSurveys] = useState<SurveyPage | null>(null);
  const [topFive, setTopFive] = useState<SurveyPage | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("submissions");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status flags
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize User & Permissions
  useEffect(() => {
    const user = getUser();
    if (user) {
      setUsername(user.username || "");
      const admin = isUserAdmin();
      setIsAdminUser(admin);
      setScope(admin ? "all" : "my");
    }
  }, []);

  // Handle Preset Changes
  const handlePresetChange = (selected: "all" | "today" | "7d" | "30d" | "custom") => {
    setPreset(selected);
    setPage(1);
    const today = vnToday();
    if (selected === "all") {
      setFromDate("");
      setToDate("");
      setShowDatePicker(false);
    } else if (selected === "today") {
      setFromDate(today);
      setToDate(today);
      setShowDatePicker(false);
    } else if (selected === "7d") {
      const past = new Date(Date.now() + 7 * 3600000 - 6 * 86400000).toISOString().slice(0, 10);
      setFromDate(past);
      setToDate(today);
      setShowDatePicker(false);
    } else if (selected === "30d") {
      const past = new Date(Date.now() + 7 * 3600000 - 29 * 86400000).toISOString().slice(0, 10);
      setFromDate(past);
      setToDate(today);
      setShowDatePicker(false);
    } else {
      setShowDatePicker(true);
    }
  };

  const valid = (!fromDate || fromDate <= vnToday()) && (!toDate || toDate <= vnToday()) && (!fromDate || !toDate || fromDate <= toDate);
  const period = useMemo(() => ({ from: fromDate ? dateStart(fromDate) : undefined, to: toDate ? dateEnd(toDate, asOf) : undefined }), [fromDate, toDate, asOf]);
  const params = useMemo(() => reportParams(period.from, period.to, "AUTO", scope), [period, scope]);

  const scopeLabel = useMemo(() => {
    if (!fromDate && !toDate) return "Toàn thời gian";
    if (fromDate && toDate) return fromDate === toDate ? dateLabel(fromDate) : `${dateLabel(fromDate)} – ${dateLabel(toDate)}`;
    if (fromDate) return `Từ ${dateLabel(fromDate)}`;
    return `Đến ${dateLabel(toDate)}`;
  }, [fromDate, toDate]);

  // Load Report
  useEffect(() => {
    if (!valid) return;
    const token = getToken();
    if (!token) {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setError("");
    void fetchReport<Report>(token, "/report", params)
      .then((data) => {
        if (live) setReport(data);
      })
      .catch((e) => {
        if (live) {
          setError(
            e instanceof Error && e.message.includes("403")
              ? "Bạn không có quyền truy cập báo cáo này."
              : "Không tải được dữ liệu báo cáo. Hãy thử bấm Làm mới."
          );
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [params, valid, asOf]);

  // Load Table Surveys
  useEffect(() => {
    if (!valid) return;
    const token = getToken();
    if (!token) {
      setTableLoading(false);
      return;
    }
    let live = true;
    const query = new URLSearchParams(params);
    query.set("search", search);
    query.set("status", status);
    query.set("sort", sort);
    query.set("page", String(page));
    query.set("size", "15");
    setTableLoading(true);
    setTableError("");
    void fetchReport<SurveyPage>(token, "/surveys", query)
      .then((data) => {
        if (live) setSurveys(data);
      })
      .catch(() => {
        if (live) setTableError("Không tải được danh sách khảo sát.");
      })
      .finally(() => {
        if (live) setTableLoading(false);
      });
    return () => {
      live = false;
    };
  }, [params, valid, search, status, sort, page, asOf]);

  // Load Top 5 Surveys
  useEffect(() => {
    if (!valid) return;
    const token = getToken();
    if (!token) return;
    let live = true;
    const query = new URLSearchParams(params);
    query.set("sort", "submissions");
    query.set("size", "5");
    void fetchReport<SurveyPage>(token, "/surveys", query)
      .then((data) => {
        if (live) setTopFive(data);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [params, valid, asOf]);

  // Export XLSX
  const exportXlsx = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const query = new URLSearchParams(params);
    query.set("search", search);
    query.set("status", status);
    query.set("sort", sort);
    try {
      const response = await fetch(`${API_DASHBOARD}/surveys.xlsx?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bao-cao-khao-sat-${scope === "all" ? "he-thong" : "ca-nhan"}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setTableError("Không xuất được file Excel. Vui lòng thử lại.");
    }
  }, [params, search, status, sort, scope]);

  // Copy Public Survey Link
  const copySurveyLink = (surveyId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const url = `${origin}/survey/${surveyId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(surveyId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // 1. TIMELINE AREA CHART (LƯỢT XEM VÀ PHẢN HỒI)
  const timelineOption = useMemo<EChartsOption>(() => {
    const timeline = report?.activity.timeline ?? [];
    if (!timeline.length) return {};
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
  }, [report?.activity.timeline]);

  // 2. PHÂN BỔ TRẠNG THÁI (DONUT CHART)
  const statusesData = useMemo(() => {
    if (!report?.portfolio.statuses) return [];
    return Object.entries(report.portfolio.statuses).map(([key, value]) => ({
      name: statusConfig[key]?.label || key,
      value,
      itemStyle: { color: statusConfig[key]?.color || "#94a3b8" },
    }));
  }, [report?.portfolio.statuses]);

  const statusOption = useMemo<EChartsOption>(() => {
    if (!statusesData.length) return {};
    return {
      tooltip: {
        trigger: "item",
        formatter: "{b}: <b>{c}</b> bài ({d}%)",
      },
      legend: {
        orient: "horizontal",
        bottom: 0,
        icon: "circle",
        textStyle: { fontSize: 11 },
      },
      toolbox: {
        feature: { saveAsImage: { title: "Tải ảnh" } },
        right: 12,
        top: 4,
      },
      series: [
        {
          name: "Trạng thái",
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
          data: statusesData,
        },
      ],
    };
  }, [statusesData]);

  // 3. TOP KHẢO SÁT NHẬN NHIỀU PHẢN HỒI NHẤT (HORIZONTAL BAR CHART)
  const topSurveysData = useMemo(() => {
    return (
      topFive?.rows.map((x) => ({
        id: x.surveyId,
        title: x.title,
        submissions: x.submissions,
        views: x.views ?? 0,
      })) ?? []
    );
  }, [topFive]);

  const topSurveysOption = useMemo<EChartsOption>(() => {
    if (!topSurveysData.length) return {};
    const reversed = [...topSurveysData].reverse();
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const item = params[0];
          return `<b>${item.name}</b><br/>Phản hồi: <b>${num(item.value)}</b> lượt`;
        },
      },
      toolbox: {
        feature: { saveAsImage: { title: "Tải ảnh" } },
        right: 12,
        top: 4,
      },
      grid: {
        left: "3%",
        right: "12%",
        bottom: "5%",
        top: 36,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: "rgba(148, 163, 184, 0.2)" } },
      },
      yAxis: {
        type: "category",
        data: reversed.map((s) => s.title),
        axisLabel: {
          width: 140,
          overflow: "truncate",
          fontSize: 11,
          fontWeight: 500,
        },
      },
      series: [
        {
          name: "Phản hồi",
          type: "bar",
          data: reversed.map((s) => s.submissions),
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#6366f1" },
                { offset: 1, color: "#8b5cf6" },
              ],
            },
          },
          label: {
            show: true,
            position: "right",
            fontSize: 11,
            fontWeight: "bold",
          },
        },
      ],
    };
  }, [topSurveysData]);

  // 4. TIẾN TRÌNH HÀNH TRÌNH CHUYỂN ĐỔI TOÀN HỆ THỐNG
  const conversionOption = useMemo<EChartsOption>(() => {
    if (!report?.funnel) return {};
    const f = report.funnel;
    const maxVal = Math.max(f.viewed || 1, f.started, f.submitted, 1);
    const stages = [
      { name: "3. Nộp bài thành công", value: f.submitted, color: "#10b981" },
      { name: "2. Bắt đầu điền câu hỏi", value: f.started, color: "#06b6d4" },
      { name: "1. Đã xem khảo sát", value: f.viewed, color: "#3b82f6" },
    ];

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const item = params[0];
          return `<b>${item.name}</b><br/>Số lượng: <b>${num(item.value)}</b> lượt`;
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
        axisLabel: { fontSize: 11, fontWeight: "bold" },
      },
      series: [
        {
          name: "Số lượng",
          type: "bar",
          data: stages.map((s) => ({
            value: s.value,
            itemStyle: { color: s.color, borderRadius: [0, 8, 8, 0] },
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
              return `${num(val)} (${pct}%)`;
            },
            fontWeight: "bold",
            fontSize: 11,
          },
        },
      ],
    };
  }, [report?.funnel]);

  // 5. CƠ CẤU THIẾT BỊ, NGUỒN TRUY CẬP & UTM
  const devicesOption = useMemo<EChartsOption>(() => {
    const list = report?.acquisition.devices ?? [];
    if (!list.length) return {};
    return {
      tooltip: { trigger: "item", formatter: "{b}: <b>{c}</b> ({d}%)" },
      legend: { orient: "horizontal", bottom: 0, icon: "circle", textStyle: { fontSize: 10 } },
      toolbox: { feature: { saveAsImage: { title: "Tải ảnh" } }, right: 12, top: 4 },
      series: [
        {
          name: "Thiết bị",
          type: "pie",
          radius: ["40%", "68%"],
          center: ["50%", "48%"],
          itemStyle: { borderRadius: 6 },
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
  }, [report?.acquisition.devices]);

  const sourcesOption = useMemo<EChartsOption>(() => {
    const list = report?.acquisition.sources ?? [];
    if (!list.length) return {};
    return {
      tooltip: { trigger: "item", formatter: "{b}: <b>{c}</b> ({d}%)" },
      legend: { orient: "horizontal", bottom: 0, icon: "circle", textStyle: { fontSize: 10 } },
      toolbox: { feature: { saveAsImage: { title: "Tải ảnh" } }, right: 12, top: 4 },
      series: [
        {
          name: "Nguồn truy cập",
          type: "pie",
          radius: ["40%", "68%"],
          center: ["50%", "48%"],
          itemStyle: { borderRadius: 6 },
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
  }, [report?.acquisition.sources]);

  const mediumsOption = useMemo<EChartsOption>(() => {
    const list = report?.acquisition.mediums ?? [];
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
          itemStyle: { borderRadius: [0, 6, 6, 0], color: "#6366f1" },
          label: { show: true, position: "right", fontSize: 10 },
        },
      ],
    };
  }, [report?.acquisition.mediums]);

  // 6. PHÂN BỐ THEO THỨ (RADAR MẠNG NHỆN) & KHUNG GIỜ VÀNG (24H)
  const weekdayOption = useMemo<EChartsOption>(() => {
    const weekdays = report?.engagement.byWeekday ?? [];
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
      toolbox: { feature: { saveAsImage: { title: "Tải ảnh" } }, right: 12, top: 4 },
      radar: {
        indicator: indicators,
        shape: "polygon",
        radius: "60%",
        center: ["50%", "54%"],
        splitNumber: 4,
        axisName: { color: "#64748b", fontWeight: 600, fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.3)" } },
        splitArea: { show: true, areaStyle: { color: ["rgba(148, 163, 184, 0.03)", "rgba(148, 163, 184, 0.08)"] } },
        axisLine: { lineStyle: { color: "rgba(148, 163, 184, 0.3)" } },
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
              lineStyle: { width: 2.5, color: "#7c3aed" },
              itemStyle: { color: "#7c3aed" },
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
  }, [report?.engagement.byWeekday]);

  const hoursOption = useMemo<EChartsOption>(() => {
    const hours = report?.engagement.byHour ?? [];
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
  }, [report?.engagement.byHour]);

  const totalSurveysCount = report?.portfolio.totalSurveys ?? 0;
  const openSurveysCount = report?.portfolio.statuses?.OPEN ?? 0;
  const draftSurveysCount = report?.portfolio.statuses?.DRAFT ?? 0;
  const totalSubmissions = report?.activity.submissions ?? 0;
  const totalViews = report?.activity.views ?? 0;
  const completionRate = report?.completeness.completionRate;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 text-slate-900 transition-colors duration-200 dark:bg-[#0b1220] dark:text-slate-100">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* ================= HEADER & GREETING ================= */}
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow duration-200 dark:border-slate-800/80 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {/* Left: Greeting & Role */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  Xin chào, {username || "bạn"} 👋
                </h1>
                {isAdminUser ? (
                  <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40">
                    <Shield size={13} /> Quản trị viên
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40">
                    <Sparkles size={13} /> Người tạo khảo sát
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAdminUser && scope === "all"
                  ? "Theo dõi tổng thể dữ liệu toàn hệ thống, hành trình chuyển đổi và hiệu quả khảo sát"
                  : "Theo dõi dữ liệu và kết quả các bài khảo sát bạn được cấp quyền quản lý"}
              </p>
            </div>

            {/* Right: Controls arranged in clean, responsive groups */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Scope Switcher for Admin Only */}
              {isAdminUser && (
                <div className="inline-flex items-center rounded-xl border border-slate-200/90 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-950/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setScope("all")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                      scope === "all"
                        ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-800 dark:text-indigo-300"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <Globe size={13} /> Toàn hệ thống
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("my")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                      scope === "my"
                        ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-800 dark:text-indigo-300"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <FolderOpen size={13} /> Khảo sát của tôi
                  </button>
                </div>
              )}

              {/* Action Buttons Group */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Fullscreen Presentation Button */}
                <button
                  type="button"
                  onClick={() => setIsPresentationOpen(true)}
                  className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-3.5 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:bg-indigo-100 hover:border-indigo-300 active:scale-[0.98] dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/70 whitespace-nowrap"
                  title="Mở màn hình trình chiếu toàn màn hình các biểu đồ (TV / Projector Mode)"
                >
                  <Tv size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Trình chiếu</span>
                </button>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={() => setAsOf(Date.now())}
                  disabled={loading}
                  className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
                  <span>Làm mới</span>
                </button>

                {/* Create Survey CTA */}
                <Link
                  href="/admin/survey"
                  className="inline-flex h-9.5 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] whitespace-nowrap"
                >
                  <Plus size={15} /> Tạo khảo sát
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ================= TIME FILTER BAR ================= */}
        <section aria-label="Bộ lọc thời gian" className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar size={14} /> Thời gian:
            </span>
            {(
              [
                { id: "all", label: "Tất cả" },
                { id: "today", label: "Hôm nay" },
                { id: "7d", label: "7 ngày qua" },
                { id: "30d", label: "30 ngày qua" },
                { id: "custom", label: "Tùy chọn" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePresetChange(item.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  preset === item.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {scopeLabel}
            </span>
          </div>

          {showDatePicker && (
            <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-end gap-2">
              <DateWheelPicker label="Từ ngày" max={vnToday()} value={fromDate} onChange={(v) => { setFromDate(v); setPage(1); }} />
              <DateWheelPicker label="Đến ngày" max={vnToday()} value={toDate} onChange={(v) => { setToDate(v); setPage(1); }} />
            </div>
          )}
        </section>

        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* ================= 4 MAIN KPI METRICS ================= */}
        <section aria-label="Chỉ số chính" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={FolderOpen}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-50 dark:bg-blue-950/60"
            label={scope === "all" ? "Tổng khảo sát hệ thống" : "Khảo sát của bạn"}
            value={num(totalSurveysCount)}
            note={
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {num(openSurveysCount)} đang mở
                </span>
                <span>•</span>
                <span>{num(draftSurveysCount)} bản nháp</span>
              </div>
            }
          />

          <MetricCard
            icon={MessageSquare}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 dark:bg-emerald-950/60"
            label="Phản hồi đã nhận"
            value={num(totalSubmissions)}
            note={
              <div className="flex items-center gap-1.5">
                {report?.submissionsTrend ? (
                  <span className={`inline-flex items-center gap-0.5 font-bold ${report.submissionsTrend.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {report.submissionsTrend.delta >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {fmt(Math.abs(report.submissionsTrend.percent ?? 0), "%")}
                  </span>
                ) : (
                  <span className="text-slate-400">0%</span>
                )}
                <span>so với kỳ trước</span>
              </div>
            }
          />

          <MetricCard
            icon={Eye}
            iconColor="text-indigo-600 dark:text-indigo-400"
            iconBg="bg-indigo-50 dark:bg-indigo-950/60"
            label="Lượt tiếp cận (Xem)"
            value={count(totalViews)}
            note={
              <span>
                Tỷ lệ gửi: <strong className="font-bold text-slate-800 dark:text-slate-200">{fmt(report?.funnel.viewToSubmitRate, "%")}</strong> trên phiên xem
              </span>
            }
          />

          <MetricCard
            icon={TrendingUp}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 dark:bg-amber-950/60"
            label="Tỷ lệ hoàn thành câu hỏi"
            value={fmt(completionRate, "%")}
            note={
              <span>
                Thời gian làm bài: <strong className="font-bold text-slate-800 dark:text-slate-200">{duration(report?.engagement.medianActiveDurationMs)}</strong>
              </span>
            }
          />
        </section>

        {/* ================= ADMIN SYSTEM SCALE OVERVIEW (ADMIN ONLY) ================= */}
        {isAdminUser && scope === "all" && report?.system && (
          <section aria-label="Quy mô hệ thống toàn diện" className={`${panel} border-indigo-100 dark:border-slate-800`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Shield size={16} />
                </span>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Quy mô quản trị hệ thống</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dữ liệu tài khoản người dùng và quy mô vận hành toàn hệ thống</p>
                </div>
              </div>
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                Toàn hệ thống
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tài khoản người dùng</p>
                <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">{num(report.system.accounts)}</p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{num(report.system.activeAccounts)} đang hoạt động</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Vai trò phân quyền</p>
                <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">{num(report.system.roles)}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{num(report.system.surveyCreators)} người đã tạo bài</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Khách website hôm nay</p>
                <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">{count(report.website?.visitorsToday)}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Trình duyệt duy nhất</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Khảo sát chưa có phản hồi</p>
                <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">{num(report.portfolio.withoutResponses)}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Cần chia sẻ tiếp</p>
              </div>
            </div>
          </section>
        )}

        {/* ================= SECTION 1: TIMELINE & STATUS DONUT ================= */}
        {totalSurveysCount > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Timeline Line/Area Chart */}
            <article className={`${panel} lg:col-span-2`}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <Activity size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                      Xu hướng tương tác theo thời gian
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Lượt xem và lượt gửi phản hồi ({scopeLabel})
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold">
                    Lượt xem ({count(report?.activity.views)})
                  </span>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold">
                    Phản hồi ({count(report?.activity?.submissions)})
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <EChartsContainer option={timelineOption} height={280} />
              </div>
            </article>

            {/* Status Distribution Donut Chart */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <PieChart size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Phân bổ trạng thái khảo sát
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Tổng số {num(totalSurveysCount)} bài khảo sát
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <EChartsContainer option={statusOption} height={240} />
              </div>

              <ul className="mt-2 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-slate-800">
                {statusesData.map((item) => (
                  <li key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: (item.itemStyle as any)?.color }} />
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name}</span>
                    </span>
                    <strong className="font-bold tabular-nums text-slate-900 dark:text-white">{num(item.value)}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        ) : (
          /* Empty State for New Users */
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Sparkles size={28} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              Chào mừng bạn đến với hệ thống khảo sát!
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
              Hiện tại bạn chưa có khảo sát nào hoặc chưa được chia sẻ quyền. Hãy bắt đầu bằng cách tạo khảo sát đầu tiên của bạn để thu thập câu trả lời và xem số liệu phân tích.
            </p>
            <div className="mt-5">
              <Link
                href="/admin/survey"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <Plus size={16} /> Tạo bài khảo sát ngay
              </Link>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: TOP SURVEYS & CONVERSION FUNNEL ================= */}
        {totalSurveysCount > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top 5 Surveys Horizontal Bar Chart */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Top Khảo sát nhận nhiều phản hồi nhất
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Xếp hạng các bài khảo sát thu hút người tham gia cao nhất
                  </p>
                </div>
              </div>

              <div className="mt-2">
                {topSurveysData.length ? (
                  <EChartsContainer option={topSurveysOption} height={250} />
                ) : (
                  <p className={`${muted} py-12 text-center`}>Chưa có dữ liệu xếp hạng khảo sát.</p>
                )}
              </div>
            </article>

            {/* System Conversion Funnel Step Progress */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
                  <Layers size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Hành trình chuyển đổi toàn hệ thống
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Tỷ lệ người dùng chuyển tiếp từ lúc mở bài đến nộp bài thành công
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <EChartsContainer option={conversionOption} height={220} />
              </div>

              {/* Drop-off Stats */}
              {report?.funnel && (
                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-center dark:border-slate-800">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800/60 dark:bg-slate-800/40">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Xem → Bắt đầu</span>
                    <p className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">{fmt(report.funnel.viewToStartRate, "%")}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Rời đi: {num(report.funnel.onlyViewed)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800/60 dark:bg-slate-800/40">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Bắt đầu → Gửi</span>
                    <p className="mt-1 text-base font-bold text-cyan-600 dark:text-cyan-400">{fmt(report.funnel.startToSubmitRate, "%")}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Bỏ dở: {num(report.funnel.abandoned)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800/60 dark:bg-slate-800/40">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Chuyển đổi chung</span>
                    <p className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">{fmt(report.funnel.viewToSubmitRate, "%")}</p>
                    <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">Thành công: {num(report.funnel.submitted)}</p>
                  </div>
                </div>
              )}
            </article>
          </div>
        )}

        {/* ================= SECTION 3: DEVICES, SOURCES, MEDIUMS (3 CARDS SIDE BY SIDE) ================= */}
        {totalSurveysCount > 0 && report && (
          <section className="grid gap-6 lg:grid-cols-3" aria-label="Thiết bị, Nguồn truy cập và Kênh UTM">
            {/* Card 1: Devices */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Smartphone size={16} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Cơ cấu Thiết bị</h3>
                  <p className={muted}>Phân bố Mobile, Desktop và Tablet</p>
                </div>
              </div>
              <div className="mt-2">
                {report.acquisition.devices.length ? (
                  <EChartsContainer option={devicesOption} height={240} />
                ) : (
                  <p className={`${muted} py-12 text-center`}>Chưa có dữ liệu thiết bị.</p>
                )}
              </div>
            </article>

            {/* Card 2: Sources */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Globe size={16} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Nguồn giới thiệu</h3>
                  <p className={muted}>Trực tiếp, Mạng xã hội, Search...</p>
                </div>
              </div>
              <div className="mt-2">
                {report.acquisition.sources.length ? (
                  <EChartsContainer option={sourcesOption} height={240} />
                ) : (
                  <p className={`${muted} py-12 text-center`}>Chưa có dữ liệu nguồn truy cập.</p>
                )}
              </div>
            </article>

            {/* Card 3: UTM Mediums */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Share2 size={16} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Kênh tiếp thị UTM</h3>
                  <p className={muted}>UTM Medium (Email, CPC, QR...)</p>
                </div>
              </div>
              <div className="mt-2">
                {report.acquisition.mediums.length ? (
                  <EChartsContainer option={mediumsOption} height={240} />
                ) : (
                  <p className={`${muted} py-12 text-center`}>Chưa có dữ liệu UTM Medium.</p>
                )}
              </div>
            </article>
          </section>
        )}

        {/* ================= SECTION 4: WEEKDAY RADAR & 24H PEAK HOURS ================= */}
        {totalSurveysCount > 0 && report && (
          <section className="grid gap-6 lg:grid-cols-2" aria-label="Khung giờ và Thứ trong tuần">
            {/* Weekday Radar Chart */}
            <article className={panel}>
              <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3.5 dark:border-slate-800/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <Compass size={16} />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Phân bố phản hồi theo Ngày trong tuần
                  </h3>
                  <p className={muted}>Biểu đồ mạng nhện thể hiện tần suất gửi bài từ Thứ 2 đến Chủ Nhật</p>
                </div>
              </div>
              <div className="mt-2">
                <EChartsContainer option={weekdayOption} height={270} />
              </div>
            </article>

            {/* 24-Hour Peak Hours Column Chart */}
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
        )}

        {/* ================= SECTION 5: SURVEYS TABLE WITH SEARCH, FILTER & ACTIONS ================= */}
        <section aria-label="Danh sách khảo sát" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Danh sách khảo sát & Hiệu quả</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tìm kiếm, xem báo cáo chi tiết hoặc sao chép link chia sẻ nhanh
              </p>
            </div>
            <button
              type="button"
              onClick={() => void exportXlsx()}
              disabled={tableLoading || (surveys?.total ?? 0) === 0}
              className="inline-flex h-9.5 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download size={14} className="text-emerald-600 dark:text-emerald-400" /> Xuất Excel (.xlsx)
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên khảo sát..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="OPEN">Đang mở</option>
              <option value="CLOSED">Đã đóng</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="SCHEDULED">Lên lịch</option>
            </select>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="submissions">Nhiều phản hồi nhất</option>
              <option value="views">Nhiều lượt xem nhất</option>
              <option value="completion">Tỷ lệ hoàn thành cao nhất</option>
              <option value="title">Tên bài khảo sát (A–Z)</option>
            </select>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {tableError && <p className="p-4 text-xs font-medium text-rose-600">{tableError}</p>}
            {tableLoading && <p className="p-4 text-xs text-slate-500 animate-pulse">Đang tải dữ liệu khảo sát...</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">Tên khảo sát</th>
                    <th scope="col" className="px-4 py-3.5">Trạng thái</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Lượt xem</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Phản hồi</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Tỷ lệ hoàn thành</th>
                    <th scope="col" className="px-4 py-3.5 text-center">Thao tác nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {surveys?.rows.map((row) => {
                    const statusInfo = statusConfig[row.status] || {
                      label: row.status,
                      bg: "bg-slate-100",
                      text: "text-slate-700",
                      dot: "bg-slate-400",
                    };
                    const isCopied = copiedId === row.surveyId;

                    return (
                      <tr key={row.surveyId} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5 font-medium max-w-[320px]">
                          <Link
                            href={`/admin/survey/${row.surveyId}/detail`}
                            className="truncate block font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition"
                            title={row.title}
                          >
                            {row.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                            <span className={`size-1.5 rounded-full ${statusInfo.dot}`} />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums text-slate-600 dark:text-slate-300">
                          {count(row.views)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {num(row.submissions)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums text-slate-600 dark:text-slate-300">
                          {fmt(row.completionRate, "%")}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copySurveyLink(row.surveyId)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                              title="Sao chép link làm bài khảo sát"
                            >
                              {isCopied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                            </button>
                            <Link
                              href={`/admin/survey/${row.surveyId}/result`}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                              title="Xem báo cáo kết quả chi tiết"
                            >
                              <BarChart3 size={15} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {surveys && surveys.rows.length === 0 && (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  Không tìm thấy bài khảo sát nào phù hợp với bộ lọc.
                </div>
              )}
            </div>

            {/* Pagination */}
            {surveys && surveys.total > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
                <span>Tổng số {num(surveys.total)} khảo sát</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                  >
                    Trước
                  </button>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Trang {page}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * 15 >= surveys.total}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================= FULLSCREEN PRESENTATION MODAL ================= */}
        <DashboardPresentationModal
          isOpen={isPresentationOpen}
          onClose={() => setIsPresentationOpen(false)}
          report={report}
          topFive={topFive}
          scopeLabel={scopeLabel}
          scope={scope}
          timelineOption={timelineOption}
          statusOption={statusOption}
          topSurveysOption={topSurveysOption}
          conversionOption={conversionOption}
          devicesOption={devicesOption}
          sourcesOption={sourcesOption}
          mediumsOption={mediumsOption}
          weekdayOption={weekdayOption}
          hoursOption={hoursOption}
          totalViews={totalViews}
          totalSubmissions={totalSubmissions}
          completionRate={completionRate}
          avgTimeMs={report?.engagement.avgDurationMs}
          loading={loading}
          onRefresh={() => setAsOf(Date.now())}
        />
      </div>
    </div>
  );
}
