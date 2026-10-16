"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { API_DASHBOARD } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { fetchReport, reportParams, type Report, type SurveyPage, type Trend } from "@/lib/dashboard-report";
import { formatViDecimal as dec, formatViInt as num } from "@/lib/dashboard";
import DateWheelPicker from "@/components/admin/DateWheelPicker";

const names: Record<string, string> = { DRAFT: "Bản nháp", SCHEDULED: "Lên lịch", OPEN: "Đang mở", CLOSED: "Đã đóng" };
const colors = ["#64748b", "#f59e0b", "#2563eb", "#ef4444"];
const panel = "min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900";
const field = "mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-950";
const muted = "text-xs text-slate-600 dark:text-slate-300";
const fmt = (value: number | null | undefined, suffix = "") => value == null ? "—" : dec(value) + suffix;
const count = (value: number | null | undefined) => value == null ? "Chưa ghi nhận" : num(value);
const duration = (value: number | null | undefined) => value == null ? "—" : dec(value / 1000) + " giây";
const vnToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const dateStart = (date: string) => new Date(date + "T00:00:00+07:00").toISOString();
const dateEnd = (date: string, now: number) => date === vnToday() ? new Date(now).toISOString() : new Date(Date.parse(date + "T00:00:00+07:00") + 86400000).toISOString();
const dateLabel = (date: string) => date.slice(8, 10) + "/" + date.slice(5, 7) + "/" + date.slice(0, 4);

function Heading({ title, note }: { title: string; note?: string }) {
  return <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h2 className="text-base font-semibold tracking-tight">{title}</h2>{note && <p className={muted}>{note}</p>}</div>;
}
function Metric({ label, value, note, scope }: { label: string; value: string; note?: string; scope?: string }) {
  return <div className="min-w-0 py-1"><div className="flex items-center justify-between gap-1"><p className="truncate text-xs text-slate-600 dark:text-slate-300">{label}</p>{scope && <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">{scope}</span>}</div><p className="mt-0.5 text-[22px] font-semibold leading-7 tabular-nums tracking-tight">{value}</p>{note && <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400" title={note}>{note}</p>}</div>;
}
function TrendValue({ value }: { value: Trend | null }) {
  if (!value) return <span className="text-gray-500 dark:text-gray-400">Chưa ghi nhận</span>;
  if (value.label) return <span className="text-gray-600 dark:text-gray-300">{value.label}{value.delta > 0 ? " (+" + num(value.delta) + ")" : ""}</span>;
  const up = value.delta >= 0;
  return <span className={"inline-flex items-center gap-1 font-semibold tabular-nums " + (up ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>{up ? <ArrowUp size={15} aria-hidden /> : <ArrowDown size={15} aria-hidden />}{up ? "Tăng " : "Giảm "}{fmt(Math.abs(value.percent ?? 0), "%")} ({value.delta > 0 ? "+" : ""}{num(value.delta)})</span>;
}
function Distribution({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map(x => x.count));
  return <article className={panel}><h3 className="text-sm font-semibold">{title}</h3>{data.length ? <ul className="mt-3 space-y-2">{data.map(x => <li key={x.label}><div className="flex justify-between gap-3 text-xs"><span className="min-w-0 truncate" title={x.label}>{x.label === "UNKNOWN" ? "Không xác định" : x.label}</span><strong className="tabular-nums">{num(x.count)}</strong></div><div className="mt-1 h-1 bg-slate-100 dark:bg-slate-800"><div className="h-full bg-blue-600" style={{ width: String(x.count / max * 100) + "%" }} /></div></li>)}</ul> : <p className={"mt-3 " + muted}>Chưa có phiên trong phạm vi này.</p>}</article>;
}
function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return <details className="mt-2 text-xs"><summary className="cursor-pointer font-medium text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-blue-300">Xem số liệu theo mốc</summary><div className="mt-2 max-h-52 overflow-auto"><table className="min-w-full text-left"><thead><tr>{headers.map(x => <th key={x} scope="col" className="border-b border-slate-200 px-2 py-1 dark:border-slate-700">{x}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th key={j} scope="row" className="border-b border-slate-100 px-2 py-1 font-normal dark:border-slate-800">{cell}</th> : <td key={j} className="border-b border-slate-100 px-2 py-1 tabular-nums dark:border-slate-800">{cell}</td>)}</tr>)}</tbody></table></div></details>;
}

export default function AdminDashboard() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [asOf, setAsOf] = useState(Date.now());
  const [report, setReport] = useState<Report | null>(null);
  const [surveys, setSurveys] = useState<SurveyPage | null>(null);
  const [topFive, setTopFive] = useState<SurveyPage | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("submissions");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");
  const [topError, setTopError] = useState("");
  const valid = (!fromDate || fromDate <= vnToday()) && (!toDate || toDate <= vnToday()) && (!fromDate || !toDate || fromDate <= toDate);
  const period = useMemo(() => ({ from: fromDate ? dateStart(fromDate) : undefined, to: toDate ? dateEnd(toDate, asOf) : undefined }), [fromDate, toDate, asOf]);
  const params = useMemo(() => reportParams(period.from, period.to), [period]);
  const scope = !fromDate && !toDate ? "ALL" : fromDate && toDate ? dateLabel(fromDate) + " – " + dateLabel(toDate) : fromDate ? "Từ " + dateLabel(fromDate) : "Đến " + dateLabel(toDate);

  useEffect(() => {
    if (!valid) return;
    const token = getToken();
    if (!token) { setError("Phiên đăng nhập đã hết. Hãy đăng nhập lại."); setLoading(false); return; }
    let live = true;
    setLoading(true); setError(""); setReport(null);
    void fetchReport<Report>(token, "/report", params).then(data => { if (live) setReport(data); })
      .catch(e => { if (live) setError(e instanceof Error && e.message.includes("403") ? "Bạn không có quyền xem báo cáo tổng hợp." : e instanceof Error && e.message.includes("401") ? "Phiên đăng nhập đã hết. Hãy đăng nhập lại." : "Không tải được báo cáo. Hãy thử Làm mới."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [params, valid, asOf]);
  useEffect(() => {
    if (!valid) return;
    const token = getToken();
    if (!token) { setTableLoading(false); return; }
    let live = true;
    const query = new URLSearchParams(params);
    query.set("search", search); query.set("status", status); query.set("sort", sort);
    query.set("page", String(page)); query.set("size", "20");
    setTableLoading(true); setTableError(""); setSurveys(null);
    void fetchReport<SurveyPage>(token, "/surveys", query).then(data => { if (live) setSurveys(data); })
      .catch(() => { if (live) setTableError("Không tải được danh sách khảo sát. Hãy thử Làm mới."); })
      .finally(() => { if (live) setTableLoading(false); });
    return () => { live = false; };
  }, [params, valid, search, status, sort, page, asOf]);
  useEffect(() => {
    if (!valid) return;
    const token = getToken(); if (!token) return;
    let live = true;
    const query = new URLSearchParams(params); query.set("sort", "submissions"); query.set("size", "5");
    setTopFive(null); setTopError("");
    void fetchReport<SurveyPage>(token, "/surveys", query).then(data => { if (live) setTopFive(data); })
      .catch(() => { if (live) setTopError("Không tải được 5 khảo sát hàng đầu."); });
    return () => { live = false; };
  }, [params, valid, asOf]);
  const exportXlsx = useCallback(async () => {
    const token = getToken(); if (!token) return;
    const query = new URLSearchParams(params);
    query.set("search", search); query.set("status", status); query.set("sort", sort);
    try {
      const response = await fetch(API_DASHBOARD + "/surveys.xlsx?" + query, { headers: { Authorization: "Bearer " + token } });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = "so-sanh-khao-sat.xlsx"; link.click(); URL.revokeObjectURL(url);
    } catch { setTableError("Không xuất được XLSX. Hãy thử lại."); }
  }, [params, search, status, sort]);

  const statuses = Object.entries(report?.portfolio.statuses ?? {}).map(([key, value]) => ({ name: names[key] ?? key, value }));
  const observed = report?.activity.trackingStatus !== "NO_TRACKING";
  const comparison = report?.period.trendMode === "RECENT_30_DAYS"
    ? "Xu hướng độc lập với phạm vi chính: 30 ngày gần nhất so với 30 ngày trước đó."
    : "Xu hướng so với khoảng ngay trước có cùng độ dài.";
  const topData = topFive?.rows.map(x => ({ name: x.title.length > 22 ? x.title.slice(0, 22) + "…" : x.title, responses: x.submissions })) ?? [];

  return <main className="analytics-hub -mx-4 -my-5 min-h-screen bg-[#eef2f7] px-4 py-5 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[23px] font-semibold leading-7 tracking-tight">Báo cáo khảo sát</h1><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Tổng quan hệ thống và hiệu quả khảo sát · giờ Việt Nam (UTC+7)</p></div>
        <span className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Phạm vi: {scope}</span>
      </header>

      <section aria-label="Bộ lọc thời gian" className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <DateWheelPicker label="Từ ngày" max={vnToday()} value={fromDate} onChange={value => { setFromDate(value); setPage(1); }} />
        <DateWheelPicker label="Đến ngày" max={vnToday()} value={toDate} onChange={value => { setToDate(value); setPage(1); }} />
        <button type="button" onClick={() => { setFromDate(""); setToDate(""); setPage(1); }} className="h-9 rounded-md px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-200 dark:hover:bg-slate-800">Xóa lọc</button>
        <button type="button" onClick={() => setAsOf(Date.now())} disabled={loading} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Làm mới</button>
      </section>

      {!valid && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950 dark:text-rose-200">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc và không được ở tương lai.</p>}
      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
      {loading && <p role="status" className={muted}>Đang cập nhật báo cáo…</p>}
      {!report && !loading && !error && <p className={muted}>Chưa có số liệu báo cáo.</p>}

      {valid && report && <div className="space-y-5" aria-busy={loading}>
        <section aria-label="Các chỉ số chính" className="grid gap-3 lg:grid-cols-2">
          <article className={panel}>
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800"><h2 className="text-sm font-semibold">Quy mô hệ thống</h2><span className="text-[11px] text-slate-500 dark:text-slate-400">Hiện tại / toàn thời gian</span></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Metric label="Tài khoản" value={num(report.system.accounts)} note={num(report.system.activeAccounts) + " hoạt động"} />
              <Metric label="Role" value={num(report.system.roles)} note={num(report.system.inactiveAccounts) + " tài khoản ngừng"} />
              <Metric label="Khảo sát" value={num(report.portfolio.totalSurveys)} note={num(report.portfolio.withoutResponses) + " chưa có phản hồi"} />
              <Metric label="Khách hôm nay" value={count(report.website.visitorsToday)} note="Trình duyệt duy nhất" />
            </div>
            <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800"><p className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">Tài khoản theo role · một người có thể thuộc nhiều role</p><div className="grid gap-x-4 gap-y-1 sm:grid-cols-3">{report.system.roleDistribution.map(x => <div key={x.name} className="flex min-w-0 items-center gap-2 text-[11px]"><span className="truncate">{x.name}</span><div className="h-1 min-w-0 flex-1 bg-slate-100 dark:bg-slate-800"><div className="h-full bg-blue-600" style={{ width: String(report.system.accounts ? x.users / report.system.accounts * 100 : 0) + "%" }} /></div><strong>{num(x.users)}</strong></div>)}</div></div>
          </article>
          <article className={panel}>
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800"><h2 className="text-sm font-semibold">Hoạt động khảo sát</h2><span className="text-[11px] text-slate-500 dark:text-slate-400">{scope}</span></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Metric label="Lượt xem" value={count(report.activity.views)} note={report.activity.trackingStatus === "PARTIAL" ? "Tracking một phần" : "SURVEY_VIEWED"} />
              <Metric label="Phản hồi" value={num(report.activity.submissions)} note="Đã lưu" />
              <Metric label="Submit / khảo sát" value={fmt(report.averageSubmissionsPerSurvey)} note="Trung bình" />
              <Metric label={"Submit / " + (report.period.bucket === "MONTH" ? "tháng" : report.period.bucket === "YEAR" ? "năm" : "ngày")} value={fmt(report.averageSubmissionsPerBucket)} note="Trung bình theo mốc" />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800"><span>Tạo mới: <strong>{num(report.portfolio.createdInPeriod)}</strong></span><span>Xuất bản: <strong>{num(report.portfolio.publishedInPeriod)}</strong></span><span>Tài khoản đã tạo khảo sát: <strong>{num(report.system.surveyCreators)}</strong></span></div>
          </article>
        </section>

        <section aria-label="Biểu đồ hoạt động" className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,.8fr)]">
          <article className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-sm font-semibold">Lượt xem và phản hồi</h2><p className={muted}>Hai đường theo {report.period.bucket === "MONTH" ? "tháng" : report.period.bucket === "YEAR" ? "năm" : "ngày"} · {scope}</p></div><div className="flex flex-wrap gap-x-3 text-[11px]"><span><i aria-hidden className="mr-1 inline-block size-2 rounded-full bg-blue-600" />View {count(report.activity.views)}</span><span><i aria-hidden className="mr-1 inline-block size-2 rounded-full bg-orange-500" />Submit {num(report.activity.submissions)}</span></div></div>
            <div className="mt-2 h-[222px]" role="img" aria-label={"Lượt xem " + count(report.activity.views) + ", phản hồi " + num(report.activity.submissions)}><ResponsiveContainer width="100%" height="100%" minWidth={240}><LineChart data={report.activity.timeline} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" minTickGap={28} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend verticalAlign="top" height={22} /><Line name="Lượt xem" dataKey="views" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls={false} /><Line name="Phản hồi" dataKey="submissions" stroke="#f97316" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800"><span>View: <TrendValue value={report.viewsTrend} /></span><span>Submit: <TrendValue value={report.submissionsTrend} /></span></div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{comparison}</p>
            <DataTable headers={["Mốc", "View", "Submit"]} rows={report.activity.timeline.map(x => [x.label, count(x.views), num(x.submissions)])} />
          </article>
          <article className={panel}>
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Trạng thái khảo sát</h2><span className="text-xs font-semibold tabular-nums">{num(report.portfolio.totalSurveys)} tổng</span></div>
            <div className="mx-auto h-[154px] max-w-[260px]" role="img" aria-label={statuses.map(x => x.name + ": " + x.value).join(", ")}><ResponsiveContainer width="100%" height="100%" minWidth={220}><PieChart><Pie data={statuses} dataKey="value" nameKey="name" innerRadius={43} outerRadius={68} paddingAngle={2}>{statuses.map((x, i) => <Cell key={x.name} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">{statuses.map((x, i) => <li key={x.name} className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} /><span>{x.name}</span><strong className="ml-auto tabular-nums">{num(x.value)}</strong></li>)}</ul>
            <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">Bốn trạng thái là trạng thái hiện tại của khảo sát.</p>
          </article>
        </section>

        <section aria-label="Hành trình khách">
          <Heading title="Hành trình khách" note="Phễu và khách website trong phạm vi đã chọn" />
          <div className="grid gap-3 lg:grid-cols-2">
            <article className={panel}>
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Từ xem đến gửi</h3>{report.funnel.provisional && <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Kỳ đang diễn ra</span>}</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">{[["Đã xem", report.funnel.viewed], ["Đã bắt đầu", report.funnel.started], ["Gửi thành công", report.funnel.submitted]].map(([label, value], i) => <div key={label} className="min-w-0 rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-950"><p className="text-[11px] text-slate-600 dark:text-slate-300">{label}</p><strong className="text-xl tabular-nums">{observed ? num(Number(value)) : "—"}</strong><div className="mt-1 h-1 bg-slate-200 dark:bg-slate-800"><div className={i === 2 ? "h-full bg-orange-500" : "h-full bg-blue-600"} style={{ width: String(report.funnel.viewed ? Number(value) / report.funnel.viewed * 100 : 0) + "%" }} /></div></div>)}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]"><span>Xem → bắt đầu<br /><strong>{fmt(report.funnel.viewToStartRate, "%")}</strong></span><span>Bắt đầu → gửi<br /><strong>{fmt(report.funnel.startToSubmitRate, "%")}</strong></span><span>Gửi / phiên xem<br /><strong>{fmt(report.funnel.viewToSubmitRate, "%")}</strong></span></div>
              <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">Còn dở <strong>{num(report.funnel.inProgress)}</strong> · Bỏ dở <strong>{num(report.funnel.abandoned)}</strong> · Chỉ xem <strong>{num(report.funnel.onlyViewed)}</strong></p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Cùng nhóm phiên bắt đầu xem trong kỳ; bỏ dở sau thời hạn.</p>
            </article>
            <article className={panel}>
              <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">Khách website</h3><span className={muted}>Mới / quay lại theo mốc · trình duyệt duy nhất</span></div>
              {report.website.trackingStartedAt ? <><div className="mt-1 h-[188px]" role="img" aria-label="Khách website mới và quay lại"><ResponsiveContainer width="100%" height="100%" minWidth={240}><BarChart data={report.website.timeline} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" minTickGap={28} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend verticalAlign="top" height={22} /><Bar name="Mới" dataKey="newVisitors" stackId="v" fill="#2563eb" /><Bar name="Quay lại" dataKey="returningVisitors" stackId="v" fill="#f97316" /></BarChart></ResponsiveContainer></div><DataTable headers={["Mốc", "Khách", "Mới", "Quay lại"]} rows={report.website.timeline.map(x => [x.label, count(x.visitors), count(x.newVisitors), count(x.returningVisitors)])} /></> : <p className={muted + " py-10"}>Chưa ghi nhận lượt khách website.</p>}
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">“Mới” là lần đầu hệ thống ghi nhận trình duyệt; các mốc trước tracking là “Chưa ghi nhận”.</p>
            </article>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3"><Distribution title="Nguồn truy cập" data={report.acquisition.sources} /><Distribution title="UTM medium" data={report.acquisition.mediums} /><Distribution title="Thiết bị" data={report.acquisition.devices} /></div>
        </section>

        <section aria-label="Mức tham gia và chất lượng dữ liệu">
          <Heading title="Mức tham gia và chất lượng dữ liệu" note="Số liệu từ phiên và phản hồi đã ghi nhận" />
          <div className="grid gap-3 lg:grid-cols-3">
            <article className={panel}><h3 className="text-sm font-semibold">Tương tác</h3><div className="mt-3 grid grid-cols-2 gap-3"><Metric label="Trung vị" value={duration(report.engagement.medianActiveDurationMs)} /><Metric label="Trang / phiên" value={fmt(report.engagement.averagePagesViewed)} /></div><p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">Thời gian tab hiển thị và có focus là ước lượng, không phải thời gian làm bài tuyệt đối.</p></article>
            <article className={panel}><div className="flex items-baseline justify-between"><h3 className="text-sm font-semibold">Độ đầy đủ câu trả lời</h3><strong className="text-lg tabular-nums">{fmt(report.completeness.completionRate, "%")}</strong></div><p className={muted}>Đã trả lời / câu áp dụng · chỉ phản hồi có bộ đếm lúc gửi</p><div className="mt-4 flex h-2 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800" role="img" aria-label={"Đã trả lời " + num(report.completeness.answeredQuestions) + " trên " + num(report.completeness.applicableQuestions) + " câu áp dụng"}><div className="bg-blue-600" style={{ width: String(report.completeness.completionRate ?? 0) + "%" }} /><div className="bg-orange-500" style={{ width: String(report.completeness.completionRate == null ? 0 : 100 - report.completeness.completionRate) + "%" }} /></div><p className="mt-3 text-[11px]">Đã trả lời <strong>{num(report.completeness.answeredQuestions)}</strong> · Bỏ qua <strong>{num(report.completeness.skippedQuestions)}</strong> / {num(report.completeness.applicableQuestions)} câu</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{num(report.completeness.exactResponses)} phản hồi chính xác · TB {fmt(report.completeness.averageAnswered)} câu / phản hồi</p>{report.completeness.estimatedLegacyResponses > 0 && <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{num(report.completeness.estimatedLegacyResponses)} phản hồi cũ thiếu bộ đếm, không tính vào tỷ lệ.</p>}</article>
            <article className={panel}><h3 className="text-sm font-semibold">Độ phủ tracking</h3><div className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-1">{[["Phản hồi có phiên", report.quality.responseSessionCoverage], ["Phản hồi có đếm câu", report.quality.questionCountCoverage], ["Phiên có thiết bị", report.quality.deviceCoverage], ["Phiên có nguồn", report.quality.sourceCoverage], ["Phản hồi có thời gian", report.quality.durationCoverage]].map(([label, value]) => <div key={String(label)} className="flex items-center gap-2 text-[11px]"><span className="min-w-0 flex-1 truncate">{label}</span><div className="h-1 w-14 bg-slate-100 dark:bg-slate-800"><div className="h-full bg-blue-600" style={{ width: String(value ?? 0) + "%" }} /></div><strong className="w-10 text-right tabular-nums">{fmt(value as number | null, "%")}</strong></div>)}</div></article>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <article className={panel}><h3 className="text-sm font-semibold">Phản hồi theo thứ</h3><div className="mt-1 h-[152px]" role="img" aria-label="Phản hồi theo thứ trong tuần"><ResponsiveContainer width="100%" height="100%" minWidth={240}><BarChart data={report.engagement.byWeekday.map(x => ({ ...x, label: x.day === 7 ? "CN" : "Thứ " + (x.day + 1) }))} margin={{ top: 5, right: 4, left: -22 }}><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar name="Phản hồi" dataKey="submissions" fill="#2563eb" /></BarChart></ResponsiveContainer></div><DataTable headers={["Thứ", "Phản hồi"]} rows={report.engagement.byWeekday.map(x => [x.day === 7 ? "CN" : "Thứ " + (x.day + 1), num(x.submissions)])} /></article>
            <article className={panel}><h3 className="text-sm font-semibold">Phản hồi theo giờ Việt Nam</h3><div className="mt-1 h-[152px]" role="img" aria-label="Phản hồi theo giờ Việt Nam"><ResponsiveContainer width="100%" height="100%" minWidth={240}><BarChart data={report.engagement.byHour} margin={{ top: 5, right: 4, left: -22 }}><XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar name="Phản hồi" dataKey="submissions" fill="#f97316" /></BarChart></ResponsiveContainer></div><DataTable headers={["Giờ", "Phản hồi"]} rows={report.engagement.byHour.map(x => [x.hour + "h", num(x.submissions)])} /></article>
          </div>
        </section>

        <section aria-label="So sánh khảo sát">
          <Heading title="So sánh khảo sát" note={comparison} />
          <div className="grid gap-3 lg:grid-cols-[minmax(270px,.8fr)_minmax(0,1.5fr)]">
            <article className={panel}><h3 className="text-sm font-semibold">5 khảo sát nhiều phản hồi nhất</h3>{topError ? <p role="alert" className="mt-3 text-xs text-rose-700 dark:text-rose-300">{topError}</p> : !topFive ? <p role="status" className={muted + " mt-3"}>Đang tải…</p> : topData.length ? <><div className="mt-1 h-[177px]" role="img" aria-label={topData.map(x => x.name + ": " + x.responses).join(", ")}><ResponsiveContainer width="100%" height="100%" minWidth={240}><BarChart data={topData} layout="vertical" margin={{ top: 4, left: 0, right: 4 }}><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 10 }} /><Tooltip /><Bar name="Phản hồi" dataKey="responses" fill="#2563eb" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></div><ol className="mt-1 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">{topFive.rows.map(x => <li key={x.surveyId} className="flex justify-between gap-2"><span className="truncate" title={x.title}>{x.title}</span><strong>{num(x.submissions)}</strong></li>)}</ol></> : <p className={muted + " mt-3"}>Chưa có khảo sát trong phạm vi này.</p>}</article>
            <article className={panel + " self-start"}><h3 className="text-sm font-semibold">Cách đọc số liệu</h3><dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2"><div><dt className="font-semibold">View / submit</dt><dd className="text-slate-600 dark:text-slate-300">Sự kiện xem khảo sát / phản hồi đã lưu.</dd></div><div><dt className="font-semibold">Gửi / phiên</dt><dd className="text-slate-600 dark:text-slate-300">Phiên xem trong kỳ đã gửi, cùng nhóm phiên.</dd></div><div><dt className="font-semibold">Độ đầy đủ</dt><dd className="text-slate-600 dark:text-slate-300">Đã trả lời / câu áp dụng trên phản hồi có bộ đếm chính xác.</dd></div><div><dt className="font-semibold">Xu hướng</dt><dd className="text-slate-600 dark:text-slate-300">{comparison}</dd></div></dl><p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">Mở báo cáo từng khảo sát cần quyền xem khảo sát riêng.</p></article>
          </div>
          <article className={panel + " mt-3"}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Danh sách khảo sát</h3><p className={muted}>Tìm kiếm, lọc trạng thái, sắp xếp và xuất XLSX theo phạm vi {scope}.</p></div><button type="button" onClick={() => void exportXlsx()} disabled={!valid || tableLoading} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"><Download size={14} />Xuất XLSX</button></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(180px,1fr)_150px_170px]"><label className="text-[11px] font-medium">Tìm khảo sát<input className={field} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tên khảo sát" /></label><label className="text-[11px] font-medium">Trạng thái<select className={field} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{Object.entries(names).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-[11px] font-medium">Sắp xếp<select className={field} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="submissions">Nhiều phản hồi</option><option value="views">Nhiều lượt xem</option><option value="completion">Đầy đủ nhất</option><option value="title">Tên A–Z</option></select></label></div>
            {tableError && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{tableError}</p>}
            {tableLoading && <p role="status" className={muted + " mt-2"}>Đang tải bảng khảo sát…</p>}
            <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[940px] table-fixed text-left text-[11px]"><colgroup><col style={{ width: 220 }} /><col style={{ width: 94 }} /><col style={{ width: 90 }} /><col style={{ width: 65 }} /><col style={{ width: 95 }} /><col style={{ width: 115 }} /><col style={{ width: 95 }} /><col style={{ width: 112 }} /><col style={{ width: 112 }} /></colgroup><thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr>{["Khảo sát", "Trạng thái", "Lượt truy cập", "Submit", "Tỷ lệ gửi", "Đầy đủ", "Tương tác", "Xu hướng truy cập", "Xu hướng submit"].map(x => <th key={x} scope="col" className="px-2 py-2 font-semibold">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{surveys?.rows.map(x => <tr key={x.surveyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><th scope="row" className="px-2 py-2 font-medium"><span className="block truncate" title={x.title}>{x.title}</span></th><td className="px-2 py-2">{names[x.status] ?? x.status}</td><td className="px-2 py-2 tabular-nums">{count(x.views)}</td><td className="px-2 py-2 tabular-nums">{num(x.submissions)}</td><td className="px-2 py-2 tabular-nums">{fmt(x.conversionRate, "%")}</td><td className="px-2 py-2 tabular-nums">{fmt(x.completionRate, "%")}{x.estimatedLegacyResponses > 0 && <small className="block text-[10px] text-amber-700 dark:text-amber-300">{num(x.estimatedLegacyResponses)} cũ thiếu đếm</small>}</td><td className="px-2 py-2 tabular-nums">{duration(x.medianActiveDurationMs)}</td><td className="px-2 py-2"><TrendValue value={x.viewsTrend} /></td><td className="px-2 py-2"><TrendValue value={x.submissionsTrend} /></td></tr>)}</tbody></table>{surveys && !surveys.rows.length && <p className={muted + " py-8 text-center"}>Không có khảo sát phù hợp.</p>}</div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-800"><span>{num(surveys?.total ?? 0)} khảo sát</span><div className="flex items-center gap-2"><button type="button" className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40 dark:border-slate-700" onClick={() => setPage(x => Math.max(1, x - 1))} disabled={page === 1}>Trước</button><span>Trang {page}</span><button type="button" className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40 dark:border-slate-700" onClick={() => setPage(x => x + 1)} disabled={!surveys || page * 20 >= surveys.total}>Sau</button></div></div>
          </article>
        </section>
      </div>}
    </div>
  </main>;
}
