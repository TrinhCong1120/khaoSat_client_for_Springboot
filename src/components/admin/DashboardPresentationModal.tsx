"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Globe,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Monitor,
  Pause,
  PieChart,
  Play,
  RefreshCw,
  Share2,
  Shield,
  Smartphone,
  Tv,
  Users,
  X,
} from "lucide-react";
import EChartsContainer, { type EChartsOption } from "@/components/charts/EChartsContainer";
import { formatViDecimal as dec, formatViInt as num } from "@/lib/dashboard";
import type { Report, SurveyPage } from "@/lib/dashboard-report";

interface DashboardPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  topFive: SurveyPage | null;
  scopeLabel: string;
  scope: "all" | "my";
  timelineOption: EChartsOption;
  statusOption: EChartsOption;
  topSurveysOption: EChartsOption;
  conversionOption: EChartsOption;
  devicesOption: EChartsOption;
  sourcesOption: EChartsOption;
  mediumsOption: EChartsOption;
  weekdayOption: EChartsOption;
  hoursOption: EChartsOption;
  totalViews: number;
  totalSubmissions: number;
  completionRate: number | null | undefined;
  avgTimeMs: number | null | undefined;
  loading: boolean;
  onRefresh: () => void;
}

const SLIDE_DURATION_SEC = 8;

export default function DashboardPresentationModal({
  isOpen,
  onClose,
  report,
  topFive,
  scopeLabel,
  scope,
  timelineOption,
  statusOption,
  topSurveysOption,
  conversionOption,
  devicesOption,
  sourcesOption,
  mediumsOption,
  weekdayOption,
  hoursOption,
  totalViews,
  totalSubmissions,
  completionRate,
  avgTimeMs,
  loading,
  onRefresh,
}: DashboardPresentationModalProps) {
  const [viewMode, setViewMode] = useState<"slideshow" | "grid">("slideshow");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  const totalSlides = 5;

  // Realtime clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const date = now.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      setCurrentTimeStr(`${time} • ${date}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleNativeFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Slideshow timer
  useEffect(() => {
    if (!isOpen || viewMode !== "slideshow" || !isPlaying) return;

    setProgress(0);
    const intervalMs = 100;
    const step = 100 / ((SLIDE_DURATION_SEC * 1000) / intervalMs);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((s) => (s + 1) % totalSlides);
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, viewMode, isPlaying, currentSlide, totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        onClose();
      } else if (e.key === "ArrowRight") {
        setCurrentSlide((s) => (s + 1) % totalSlides);
        setProgress(0);
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((s) => (s - 1 + totalSlides) % totalSlides);
        setProgress(0);
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === "f") {
        toggleNativeFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, totalSlides, onClose, toggleNativeFullscreen]);

  if (!isOpen) return null;

  const slides = [
    { id: 0, title: "Xu hướng & Chỉ số cốt lõi", desc: "Tổng quan các chỉ số điều hành và dòng thời gian tương tác" },
    { id: 1, title: "Trạng thái & Top Khảo sát", desc: "Phân bổ khảo sát và các bài nhận được phản hồi cao nhất" },
    { id: 2, title: "Hành trình chuyển đổi", desc: "Tỷ lệ chuyển đổi từ mở xem đến nộp bài thành công" },
    { id: 3, title: "Thiết bị & Nguồn tiếp thị", desc: "Cơ cấu nền tảng truy cập, kênh giới thiệu và chiến dịch UTM" },
    { id: 4, title: "Thời điểm vàng tương tác", desc: "Phân bố theo thứ trong tuần và 24 khung giờ hoạt động" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col bg-[#080d1a] text-slate-100 select-none overflow-hidden"
    >
      {/* ================= TOP COMMAND BAR ================= */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#0c1322]/95 px-5 backdrop-blur-md">
        {/* Left: Branding & Realtime Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Tv size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-wider text-white uppercase">
                  Màn hình trình chiếu
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {scopeLabel} • {currentTimeStr}
              </p>
            </div>
          </div>
        </div>

        {/* Center: View Mode Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          <button
            type="button"
            onClick={() => setViewMode("slideshow")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              viewMode === "slideshow"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Monitor size={14} />
            <span>Trình chiếu Slide</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              viewMode === "grid"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <LayoutGrid size={14} />
            <span>Lưới toàn cảnh</span>
          </button>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2">
          {viewMode === "slideshow" && (
            <div className="mr-2 flex items-center gap-1 rounded-lg bg-slate-900/80 px-2 py-1 border border-slate-800 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:text-white transition"
                title={isPlaying ? "Tạm dừng (Space)" : "Phát tự động (Space)"}
              >
                {isPlaying ? <Pause size={13} className="text-amber-400" /> : <Play size={13} className="text-emerald-400" />}
                <span className="text-[11px] font-semibold">{isPlaying ? "Đang chạy" : "Tạm dừng"}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Làm mới dữ liệu ngay"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-blue-400" : ""} />
          </button>

          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title={isNativeFullscreen ? "Thoát toàn màn hình (F)" : "Toàn màn hình trình chiếu (F)"}
          >
            {isNativeFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition"
            title="Đóng trình chiếu (Esc)"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* Progress Bar for Slideshow Mode */}
      {viewMode === "slideshow" && (
        <div className="h-1 w-full bg-slate-800/80">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* ================= MAIN PRESENTATION CONTENT ================= */}
      <main className="flex-1 overflow-y-auto p-5 lg:p-6">
        {/* ===================== MODE 1: SLIDESHOW ===================== */}
        {viewMode === "slideshow" ? (
          <div className="mx-auto flex h-full max-w-[1600px] flex-col justify-between">
            {/* Slide Header */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  Slide {currentSlide + 1} / {totalSlides}
                </span>
                <h2 className="text-xl font-extrabold text-white sm:text-2xl">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-xs text-slate-400">{slides[currentSlide].desc}</p>
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSlide((s) => (s - 1 + totalSlides) % totalSlides);
                    setProgress(0);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-blue-600 hover:text-white transition"
                  title="Slide trước (←)"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSlide((s) => (s + 1) % totalSlides);
                    setProgress(0);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-blue-600 hover:text-white transition"
                  title="Slide tiếp theo (→)"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Slide Body */}
            <div className="flex-1">
              {/* SLIDE 0: KPIs & TIMELINE */}
              {currentSlide === 0 && (
                <div className="space-y-5">
                  {/* Big KPI Cards */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-4 shadow-lg backdrop-blur-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Tổng Lượt Xem</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                          <Eye size={18} />
                        </div>
                      </div>
                      <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-white">{num(totalViews)}</p>
                      <p className="mt-1 text-[11px] text-blue-400 font-medium">Toàn bộ khảo sát</p>
                    </div>

                    <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-4 shadow-lg backdrop-blur-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Phản Hồi Đã Nộp</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                      <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-emerald-400">{num(totalSubmissions)}</p>
                      <p className="mt-1 text-[11px] text-emerald-400/80 font-medium">Lượt gửi thành công</p>
                    </div>

                    <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-4 shadow-lg backdrop-blur-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Tỷ Lệ Hoàn Thành</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                          <Activity size={18} />
                        </div>
                      </div>
                      <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-indigo-400">
                        {completionRate != null ? `${dec(completionRate)}%` : "—"}
                      </p>
                      <p className="mt-1 text-[11px] text-indigo-400/80 font-medium">Chất lượng phản hồi</p>
                    </div>

                    <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-4 shadow-lg backdrop-blur-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Thời Gian Trung Bình</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                          <Clock size={18} />
                        </div>
                      </div>
                      <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-amber-400">
                        {avgTimeMs != null ? `${dec(avgTimeMs / 1000)}s` : "—"}
                      </p>
                      <p className="mt-1 text-[11px] text-amber-400/80 font-medium">Thời gian trả lời bài</p>
                    </div>
                  </div>

                  {/* Main Timeline Chart */}
                  <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-5 shadow-lg">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity size={16} className="text-blue-400" />
                        Biểu đồ xu hướng tương tác theo thời gian
                      </h3>
                      <span className="text-xs font-semibold text-blue-400">Diện tích dồn tích & từng mốc</span>
                    </div>
                    <EChartsContainer option={timelineOption} height={420} theme="dark" />
                  </div>
                </div>
              )}

              {/* SLIDE 1: STATUS & TOP SURVEYS */}
              {currentSlide === 1 && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-5 shadow-lg">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <PieChart size={16} className="text-indigo-400" />
                        Cơ cấu phân bổ trạng thái khảo sát
                      </h3>
                      <span className="text-xs text-slate-400 font-semibold">Tỷ lệ %</span>
                    </div>
                    <EChartsContainer option={statusOption} height={440} theme="dark" />
                  </div>

                  <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-5 shadow-lg">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <BarChart3 size={16} className="text-purple-400" />
                        Top khảo sát nhận nhiều phản hồi nhất
                      </h3>
                      <span className="text-xs text-slate-400 font-semibold">Lượt nộp</span>
                    </div>
                    <EChartsContainer option={topSurveysOption} height={440} theme="dark" />
                  </div>
                </div>
              )}

              {/* SLIDE 2: CONVERSION FUNNEL */}
              {currentSlide === 2 && (
                <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-6 shadow-lg">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers size={18} className="text-cyan-400" />
                      Hành trình chuyển đổi từ xem bài đến nộp phản hồi thành công
                    </h3>
                    <span className="text-xs text-slate-400">Phễu chuyển đổi toàn hệ thống</span>
                  </div>

                  <div className="py-2">
                    <EChartsContainer option={conversionOption} height={320} theme="dark" />
                  </div>

                  {report?.funnel && (
                    <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-800/80 pt-5 text-center">
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                        <span className="text-xs font-semibold text-slate-400">Xem → Bắt đầu làm</span>
                        <p className="mt-1 text-2xl font-black text-slate-200">
                          {report.funnel.viewToStartRate != null ? `${dec(report.funnel.viewToStartRate)}%` : "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Chỉ xem: {num(report.funnel.onlyViewed)}</p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                        <span className="text-xs font-semibold text-slate-400">Bắt đầu → Nộp bài</span>
                        <p className="mt-1 text-2xl font-black text-cyan-400">
                          {report.funnel.startToSubmitRate != null ? `${dec(report.funnel.startToSubmitRate)}%` : "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Bỏ dở: {num(report.funnel.abandoned)}</p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                        <span className="text-xs font-semibold text-slate-400">Chuyển đổi chung</span>
                        <p className="mt-1 text-2xl font-black text-emerald-400">
                          {report.funnel.viewToSubmitRate != null ? `${dec(report.funnel.viewToSubmitRate)}%` : "—"}
                        </p>
                        <p className="mt-1 text-xs text-emerald-500">Thành công: {num(report.funnel.submitted)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SLIDE 3: ACQUISITION (DEVICES, SOURCES, UTM) */}
              {currentSlide === 3 && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-5 shadow-lg">
                    <div className="mb-3 flex items-center gap-2 border-b border-slate-800/60 pb-3">
                      <Smartphone size={16} className="text-blue-400" />
                      <h3 className="text-sm font-bold text-white">Cơ cấu Thiết bị truy cập</h3>
                    </div>
                    <EChartsContainer option={devicesOption} height={420} theme="dark" />
                  </div>

                  <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-5 shadow-lg">
                    <div className="mb-3 flex items-center gap-2 border-b border-slate-800/60 pb-3">
                      <Globe size={16} className="text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">Nguồn truy cập khảo sát</h3>
                    </div>
                    <EChartsContainer option={sourcesOption} height={420} theme="dark" />
                  </div>

                  <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-5 shadow-lg">
                    <div className="mb-3 flex items-center gap-2 border-b border-slate-800/60 pb-3">
                      <Share2 size={16} className="text-indigo-400" />
                      <h3 className="text-sm font-bold text-white">Kênh tiếp thị UTM</h3>
                    </div>
                    <EChartsContainer option={mediumsOption} height={420} theme="dark" />
                  </div>
                </div>
              )}

              {/* SLIDE 4: WEEKDAY RADAR & 24H PEAK HOURS */}
              {currentSlide === 4 && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-5 shadow-lg">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock size={16} className="text-purple-400" />
                        Mạng nhện phân bố theo thứ trong tuần
                      </h3>
                      <span className="text-xs text-purple-400 font-semibold">Thứ 2 - Chủ Nhật</span>
                    </div>
                    <EChartsContainer option={weekdayOption} height={440} theme="dark" />
                  </div>

                  <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/90 p-5 shadow-lg">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity size={16} className="text-emerald-400" />
                        Khung giờ vàng hoạt động trong 24 giờ
                      </h3>
                      <span className="text-xs text-emerald-400 font-semibold">Giờ cao điểm</span>
                    </div>
                    <EChartsContainer option={hoursOption} height={440} theme="dark" />
                  </div>
                </div>
              )}
            </div>

            {/* Slide Navigation Dots */}
            <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-800/60 pt-4">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setCurrentSlide(idx);
                    setProgress(0);
                  }}
                  className={`group relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    currentSlide === idx
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${currentSlide === idx ? "bg-white" : "bg-slate-600 group-hover:bg-slate-400"}`} />
                  <span>{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ===================== MODE 2: WALLBOARD ALL-IN-ONE GRID ===================== */
          <div className="mx-auto max-w-[1700px] space-y-6">
            {/* 4 Top KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <span className="text-xs font-semibold text-slate-400">Tổng Lượt Xem</span>
                <p className="mt-1 text-2xl font-black text-white">{num(totalViews)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <span className="text-xs font-semibold text-slate-400">Phản Hồi Đã Gửi</span>
                <p className="mt-1 text-2xl font-black text-emerald-400">{num(totalSubmissions)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <span className="text-xs font-semibold text-slate-400">Tỷ Lệ Hoàn Thành</span>
                <p className="mt-1 text-2xl font-black text-indigo-400">
                  {completionRate != null ? `${dec(completionRate)}%` : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <span className="text-xs font-semibold text-slate-400">Thời Gian Trung Bình</span>
                <p className="mt-1 text-2xl font-black text-amber-400">
                  {avgTimeMs != null ? `${dec(avgTimeMs / 1000)}s` : "—"}
                </p>
              </div>
            </div>

            {/* Row 1: Timeline (2 cols) & Status Donut (1 col) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg lg:col-span-2">
                <h3 className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-blue-400" /> Xu hướng tương tác theo thời gian
                </h3>
                <EChartsContainer option={timelineOption} height={300} theme="dark" />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <h3 className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <PieChart size={14} className="text-indigo-400" /> Cơ cấu trạng thái khảo sát
                </h3>
                <EChartsContainer option={statusOption} height={300} theme="dark" />
              </div>
            </div>

            {/* Row 2: Top Surveys & Conversion Funnel */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <h3 className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-purple-400" /> Top khảo sát nhận nhiều phản hồi
                </h3>
                <EChartsContainer option={topSurveysOption} height={280} theme="dark" />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <h3 className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-cyan-400" /> Hành trình chuyển đổi hệ thống
                </h3>
                <EChartsContainer option={conversionOption} height={280} theme="dark" />
              </div>
            </div>

            {/* Row 3: Devices, Sources, UTM (3 cards) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <h3 className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone size={14} className="text-blue-400" /> Thiết bị truy cập
                </h3>
                <EChartsContainer option={devicesOption} height={260} theme="dark" />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <h3 className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={14} className="text-emerald-400" /> Nguồn giới thiệu
                </h3>
                <EChartsContainer option={sourcesOption} height={260} theme="dark" />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <h3 className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 size={14} className="text-indigo-400" /> Kênh tiếp thị UTM
                </h3>
                <EChartsContainer option={mediumsOption} height={260} theme="dark" />
              </div>
            </div>

            {/* Row 4: Weekday Radar & 24h Peak Hours */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <h3 className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-purple-400" /> Mạng nhện phân bố theo thứ trong tuần
                </h3>
                <EChartsContainer option={weekdayOption} height={300} theme="dark" />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg">
                <h3 className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-emerald-400" /> Khung giờ vàng 24h
                </h3>
                <EChartsContainer option={hoursOption} height={300} theme="dark" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
