"use client";

import { RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DateWheelPicker from "@/components/admin/DateWheelPicker";
import type { Trend } from "@/lib/dashboard-report";
import type { SurveyDashboard } from "@/types/survey-dashboard";

const panel = "min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900";
const muted = "text-xs text-slate-600 dark:text-slate-300";
const integer = new Intl.NumberFormat("vi-VN");
const decimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const num = (value: number | null | undefined) => value == null ? "—" : integer.format(value);
const fmt = (value: number | null | undefined, suffix = "") => value == null ? "—" : decimal.format(value) + suffix;
const duration = (value: number | null | undefined) => value == null ? "—" : fmt(value / 1000, " giây");

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950"><p className={muted}>{label}</p><strong className="mt-1 block text-xl tabular-nums">{value}</strong>{note && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{note}</p>}</div>;
}

function TrendLabel({ value }: { value: Trend | null }) {
  if (!value) return <span>Chưa ghi nhận</span>;
  if (value.label) return <span>{value.label}{value.delta > 0 ? ` (+${num(value.delta)})` : ""}</span>;
  return <span>{value.delta >= 0 ? "Tăng" : "Giảm"} {fmt(Math.abs(value.percent ?? 0), "%")} ({value.delta > 0 ? "+" : ""}{num(value.delta)})</span>;
}

function Distribution({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map(item => item.count));
  return <article className={panel}><h3 className="text-sm font-semibold">{title}</h3>{data.length ? <ul className="mt-3 space-y-2">{data.map(item => <li key={item.label}><div className="flex justify-between gap-3 text-xs"><span className="truncate" title={item.label}>{item.label === "UNKNOWN" ? "Không xác định" : item.label}</span><strong>{num(item.count)}</strong></div><div className="mt-1 h-1 bg-slate-100 dark:bg-slate-800"><div className="h-full bg-blue-600" style={{ width: `${item.count / max * 100}%` }} /></div></li>)}</ul> : <p className={`${muted} mt-3`}>Chưa có lượt truy cập trong khoảng thời gian này.</p>}</article>;
}

function SmallBars({ title, data }: { title: string; data: { label: string; submissions: number }[] }) {
  return <article className={panel}><h3 className="text-sm font-semibold">{title}</h3>{data.length ? <><div className="mt-2 h-[160px]" role="img" aria-label={title}><ResponsiveContainer width="100%" height="100%" minWidth={240}><BarChart data={data} margin={{ top: 5, right: 4, left: -22 }}><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar name="Phản hồi" dataKey="submissions" fill="#2563eb" /></BarChart></ResponsiveContainer></div><details className="mt-2 text-xs"><summary className="cursor-pointer text-blue-700 dark:text-blue-300">Xem số liệu</summary><ul className="mt-2 max-h-32 overflow-auto">{data.map(item => <li key={item.label} className="flex justify-between border-b border-slate-100 py-1 dark:border-slate-800"><span>{item.label}</span><strong>{num(item.submissions)}</strong></li>)}</ul></details></> : <p className={`${muted} mt-4`}>Chưa có phản hồi trong phạm vi này.</p>}</article>;
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

export default function SurveyDashboardTab({ data, loading, error, fromDate, toDate, maxDate, valid, onFromDate, onToDate, onRefresh }: Props) {
  const scope = fromDate && toDate ? `${fromDate} – ${toDate}` : fromDate ? `Từ ${fromDate}` : toDate ? `Đến ${toDate}` : "Toàn thời gian";
  const observed = data?.activity.trackingStatus !== "NO_TRACKING";
  const percent = (value: number | null) => fmt(value, "%");
  const bucketLabel = data?.period.bucket === "HOUR" ? "giờ" : data?.period.bucket === "DAY" ? "ngày" : data?.period.bucket === "MONTH" ? "tháng" : "năm";
  return <div className="space-y-4">
    <section className={`${panel} flex flex-wrap items-end gap-3`} aria-label="Phạm vi dashboard">
      <div className="mr-auto"><h2 className="text-base font-semibold">Tổng quan khảo sát</h2><p className={muted}>Kết quả trong khoảng thời gian đã chọn · Giờ Việt Nam</p></div>
      <div className="w-full sm:w-auto"><DateWheelPicker label="Từ ngày" max={maxDate} value={fromDate} onChange={onFromDate} /></div>
      <div className="w-full sm:w-auto"><DateWheelPicker label="Đến ngày" max={maxDate} value={toDate} onChange={onToDate} /></div>
      <button type="button" onClick={onRefresh} disabled={!valid || loading} className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 px-3 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"><RefreshCw size={14} />Làm mới</button>
      {!valid && <p role="alert" className="w-full text-xs text-rose-700">Khoảng ngày không hợp lệ.</p>}
      {data && <p className="w-full text-[11px] text-slate-500 dark:text-slate-400">Phạm vi: {scope} · Dữ liệu cập nhật: {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(data.generatedAt))}</p>}
    </section>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
    {loading && <p role="status" className={muted}>Đang cập nhật số liệu…</p>}
    {!data ? !loading && !error && <p className={muted}>Chưa có báo cáo.</p> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Chỉ số chính">
        <article className={panel}><Metric label="Lượt xem khảo sát" value={num(data.activity.views)} note={data.activity.trackingStatus === "PARTIAL" ? "Hệ thống mới ghi nhận một phần" : observed ? "Số lần khảo sát được mở" : "Chưa ghi nhận lượt xem"} /></article>
        <article className={panel}><Metric label="Phản hồi đã gửi" value={num(data.activity.submissions)} note="Đã lưu trong khoảng đã chọn" /></article>
        <article className={panel}><Metric label={`Trung bình mỗi ${bucketLabel}`} value={fmt(data.averageSubmissionsPerBucket)} note={`Số phản hồi trung bình trong một ${bucketLabel}`} /></article>
        <article className={panel}><Metric label="Tỷ lệ xem rồi gửi" value={percent(data.funnel.viewToSubmitRate)} note="Trong số lượt truy cập đã ghi nhận" /></article>
        <article className={panel}><Metric label="Tỷ lệ câu đã trả lời" value={percent(data.completeness.completionRate)} note="Số câu đã trả lời trên tổng số câu cần trả lời" /></article>
      </section>

      <section className={panel} aria-label="Lượt xem và phản hồi theo thời gian"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="text-sm font-semibold">Lượt xem và phản hồi</h3><p className={muted}>{scope} · theo {data.period.bucket === "HOUR" ? "giờ" : data.period.bucket === "DAY" ? "ngày" : data.period.bucket === "MONTH" ? "tháng" : "năm"}</p></div><p className={muted}>Lượt xem: <TrendLabel value={data.viewsTrend} /> · Phản hồi: <TrendLabel value={data.submissionsTrend} /></p></div>
        {data.activity.timeline.length ? <div className="mt-3 h-[230px]" role="img" aria-label={`Lượt xem ${num(data.activity.views)}, phản hồi ${num(data.activity.submissions)}`}><ResponsiveContainer width="100%" height="100%" minWidth={240}><LineChart data={data.activity.timeline} margin={{ top: 8, right: 8, left: -22 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" minTickGap={28} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend verticalAlign="top" height={22} /><Line name="Lượt xem" dataKey="views" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls={false} /><Line name="Phản hồi" dataKey="submissions" stroke="#f97316" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div> : <p className={`${muted} py-8`}>Chưa có mốc thời gian trong phạm vi này.</p>}
        <p className="mt-2 text-[11px] text-slate-500">{data.period.trendMode === "RECENT_30_DAYS" ? "Xu hướng: 30 ngày gần nhất so với 30 ngày trước đó." : "Xu hướng: kỳ đã chọn so với kỳ ngay trước có cùng độ dài."}</p>
        <details className="mt-2 text-xs"><summary className="cursor-pointer text-blue-700 dark:text-blue-300">Xem số liệu chi tiết</summary><div className="mt-2 max-h-52 overflow-auto"><table className="w-full text-left"><thead><tr><th scope="col">Thời gian</th><th scope="col">Lượt xem</th><th scope="col">Phản hồi</th></tr></thead><tbody>{data.activity.timeline.map(point => <tr key={point.start} className="border-t border-slate-100 dark:border-slate-800"><th scope="row" className="py-1 font-normal">{point.label}</th><td>{num(point.views)}</td><td>{num(point.submissions)}</td></tr>)}</tbody></table></div></details>
      </section>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Hành trình và tương tác">
        <article className={panel}><h3 className="text-sm font-semibold">Hành trình từ xem đến gửi</h3><p className={muted}>Các lượt truy cập bắt đầu trong khoảng đã chọn{data.funnel.provisional ? " · Số liệu vẫn đang cập nhật" : ""}</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><Metric label="Đã xem" value={observed ? num(data.funnel.viewed) : "—"} /><Metric label="Đã bắt đầu" value={observed ? num(data.funnel.started) : "—"} /><Metric label="Gửi thành công" value={observed ? num(data.funnel.submitted) : "—"} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span>Xem → bắt đầu<br /><strong>{percent(data.funnel.viewToStartRate)}</strong></span><span>Bắt đầu → gửi<br /><strong>{percent(data.funnel.startToSubmitRate)}</strong></span><span>Xem → gửi<br /><strong>{percent(data.funnel.viewToSubmitRate)}</strong></span></div><p className="mt-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">Đang làm {observed ? num(data.funnel.inProgress) : "—"} · Đã rời đi {observed ? num(data.funnel.abandoned) : "—"} · Chỉ xem {observed ? num(data.funnel.onlyViewed) : "—"}</p></article>
        <article className={panel}><h3 className="text-sm font-semibold">Mức độ tương tác</h3><div className="mt-3 grid grid-cols-2 gap-2"><Metric label="Thời gian thường gặp" value={duration(data.engagement.medianActiveDurationMs)} /><Metric label="Số trang xem trung bình" value={fmt(data.engagement.averagePagesViewed)} /></div><p className="mt-3 text-[11px] text-slate-500">Thời gian được ước tính từ những lượt truy cập mà hệ thống ghi nhận được.</p></article>
      </section>

      <section aria-label="Nguồn và thiết bị" className="grid gap-3 md:grid-cols-3"><Distribution title="Nguồn truy cập" data={data.acquisition.sources} /><Distribution title="UTM medium" data={data.acquisition.mediums} /><Distribution title="Thiết bị" data={data.acquisition.devices} /></section>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Chất lượng dữ liệu">
        <article className={panel}><h3 className="text-sm font-semibold">Tỷ lệ hoàn thành câu hỏi</h3><p className="mt-2 text-2xl font-semibold">{percent(data.completeness.completionRate)}</p><p className={muted}>Số câu đã trả lời trên tổng số câu cần trả lời</p><div className="mt-3 h-2 bg-slate-100 dark:bg-slate-800"><div className="h-full bg-blue-600" style={{ width: `${data.completeness.completionRate ?? 0}%` }} /></div><p className="mt-3 text-xs">Đã trả lời {num(data.completeness.answeredQuestions)} · Bỏ qua {num(data.completeness.skippedQuestions)} / {num(data.completeness.applicableQuestions)} câu</p><p className="mt-1 text-xs">{num(data.completeness.exactResponses)} phản hồi có đủ dữ liệu · Trung bình {fmt(data.completeness.averageAnswered)} câu / phản hồi</p>{data.completeness.estimatedLegacyResponses > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{num(data.completeness.estimatedLegacyResponses)} phản hồi cũ thiếu dữ liệu, không tính vào tỷ lệ.</p>}</article>
        <article className={panel}><h3 className="text-sm font-semibold">Mức độ ghi nhận dữ liệu</h3><div className="mt-3 space-y-2">{[["Phản hồi có dữ liệu truy cập", data.quality.responseSessionCoverage], ["Phản hồi có đếm câu", data.quality.questionCountCoverage], ["Lượt truy cập có thiết bị", data.quality.deviceCoverage], ["Lượt truy cập có nguồn", data.quality.sourceCoverage], ["Phản hồi có thời gian", data.quality.durationCoverage]].map(([label, value]) => <div key={String(label)} className="flex items-center gap-2 text-xs"><span className="min-w-0 flex-1">{label}</span><div className="h-1 w-16 bg-slate-100 dark:bg-slate-800"><div className="h-full bg-blue-600" style={{ width: `${value ?? 0}%` }} /></div><strong className="w-12 text-right">{percent(value as number | null)}</strong></div>)}</div></article>
      </section>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Phản hồi theo thời điểm"><SmallBars title="Phản hồi theo thứ" data={data.engagement.byWeekday.map(item => ({ label: item.day === 7 ? "CN" : `Thứ ${item.day + 1}`, submissions: item.submissions }))} /><SmallBars title="Phản hồi theo giờ Việt Nam" data={data.engagement.byHour.map(item => ({ label: `${item.hour}h`, submissions: item.submissions }))} /></section>
    </>}
  </div>;
}
