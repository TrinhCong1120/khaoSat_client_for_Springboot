"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Download, FileSpreadsheet, ListChecks, MessageSquareText, RefreshCw } from "lucide-react";
import ApiNotFound from "@/components/common/ApiNotFound";
import FilterTab from "@/components/result/FilterTab";
import ResponseListTab from "@/components/result/ResponseListTab";
import SummaryTab from "@/components/result/SummaryTab";
import SurveyDashboardTab from "@/components/result/SurveyDashboardTab";
import { API_REPORTS, API_SURVEYS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatSurveyLocal, getApiError } from "@/lib/report";
import type { ReportFilter, SurveyResultDetail, SurveyResultQuestion, SurveyStatistics } from "@/types/report";
import type { SurveyDashboard } from "@/types/survey-dashboard";

type Tab = "dashboard" | "questions" | "responses";
const names: Record<string, string> = { DRAFT: "Bản nháp", SCHEDULED: "Lên lịch", OPEN: "Đang mở", CLOSED: "Đã đóng" };
const number = new Intl.NumberFormat("vi-VN");
const vnToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const dateStart = (date: string) => new Date(`${date}T00:00:00+07:00`).toISOString();
const dateEnd = (date: string, now: number) => date === vnToday() ? new Date(now).toISOString() : new Date(Date.parse(`${date}T00:00:00+07:00`) + 86400000).toISOString();
async function readJson<T>(response: Response): Promise<T> { if (!response.ok) throw new Error(getApiError(response.status)); return response.json() as Promise<T>; }
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }

export default function SurveyReportPage() {
  const { id } = useParams<{ id: string }>();
  const surveyId = String(id ?? "");
  const reportBase = `${API_REPORTS}/survey/${encodeURIComponent(surveyId)}`;
  const [tab, setTab] = useState<Tab>("dashboard");
  const [survey, setSurvey] = useState<SurveyResultDetail | null>(null);
  const [surveyError, setSurveyError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [statistics, setStatistics] = useState<SurveyStatistics | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState("");
  const [dashboard, setDashboard] = useState<SurveyDashboard | null>(null);
  const [lifetime, setLifetime] = useState<SurveyDashboard["lifetime"] | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [filter, setFilter] = useState<ReportFilter>({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [asOf, setAsOf] = useState(() => Date.now());
  const [exporting, setExporting] = useState<"raw" | "analysis" | null>(null);
  const [exportError, setExportError] = useState("");
  const maxDate = vnToday();
  const valid = (!fromDate || fromDate <= maxDate) && (!toDate || toDate <= maxDate) && (!fromDate || !toDate || fromDate <= toDate);
  const questions = useMemo(() => (survey?.pages ?? []).flatMap(page => page.questions ?? []) as SurveyResultQuestion[], [survey]);

  const loadSurvey = useCallback(async () => {
    if (!surveyId) return;
    setSurveyError(""); setNotFound(false);
    try {
      const response = await fetch(`${API_SURVEYS}/${encodeURIComponent(surveyId)}`, { headers: { Authorization: `Bearer ${getToken()}` }, cache: "no-store" });
      if (response.status === 404) { setNotFound(true); setSurvey(null); return; }
      setSurvey(await readJson<SurveyResultDetail>(response));
    } catch (cause) { setSurvey(null); setSurveyError(cause instanceof Error ? cause.message : "Không thể tải khảo sát."); }
  }, [surveyId]);
  useEffect(() => { void loadSurvey(); }, [loadSurvey]);

  useEffect(() => {
    if (!surveyId) return;
    let live = true;
    const filtered = Object.keys(filter).length > 0;
    setStatisticsLoading(true); setStatisticsError(""); setStatistics(null);
    void fetch(`${reportBase}/statistics${filtered ? "/filter" : ""}`, {
      method: filtered ? "POST" : "GET",
      headers: { Authorization: `Bearer ${getToken()}`, ...(filtered ? { "Content-Type": "application/json" } : {}) },
      body: filtered ? JSON.stringify(filter) : undefined,
      cache: "no-store",
    }).then(readJson<SurveyStatistics>).then(value => { if (live) setStatistics(value); })
      .catch(cause => { if (live) setStatisticsError(cause instanceof Error ? cause.message : "Không thể tải thống kê câu hỏi."); })
      .finally(() => { if (live) setStatisticsLoading(false); });
    return () => { live = false; };
  }, [filter, reportBase, surveyId]);

  useEffect(() => {
    if (!surveyId || !valid) return;
    let live = true;
    const query = new URLSearchParams({ bucket: "AUTO" });
    if (fromDate) query.set("from", dateStart(fromDate));
    if (toDate) query.set("to", dateEnd(toDate, asOf));
    setDashboardLoading(true); setDashboardError(""); setDashboard(null);
    void fetch(`${reportBase}/dashboard?${query}`, { headers: { Authorization: `Bearer ${getToken()}` }, cache: "no-store" })
      .then(readJson<SurveyDashboard>)
      .then(value => { if (live) { setDashboard(value); setLifetime(value.lifetime); } })
      .catch(cause => { if (live) { setDashboardError(cause instanceof Error ? cause.message : "Không thể tải dashboard khảo sát."); if (cause instanceof Error && /quyền|đăng nhập/.test(cause.message)) setLifetime(null); } })
      .finally(() => { if (live) setDashboardLoading(false); });
    return () => { live = false; };
  }, [asOf, fromDate, reportBase, surveyId, toDate, valid]);

  const exportReport = async (kind: "raw" | "analysis") => {
    setExporting(kind); setExportError("");
    try {
      const filteredAnalysis = kind === "analysis" && Object.keys(filter).length > 0;
      const endpoint = kind === "raw" ? "responses.xlsx" : `analysis${filteredAnalysis ? "/filter" : ".xlsx"}`;
      const response = await fetch(`${reportBase}/${endpoint}`, { method: filteredAnalysis ? "POST" : "GET", headers: { Authorization: `Bearer ${getToken()}`, ...(filteredAnalysis ? { "Content-Type": "application/json" } : {}) }, body: filteredAnalysis ? JSON.stringify(filter) : undefined });
      if (!response.ok) throw new Error(getApiError(response.status));
      downloadBlob(await response.blob(), `survey_${surveyId}_${kind === "raw" ? "responses" : "analysis"}.xlsx`);
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : "Không thể xuất báo cáo."); }
    finally { setExporting(null); }
  };

  if (notFound) return <ApiNotFound title="Không tìm thấy báo cáo" description="Khảo sát không tồn tại hoặc bạn không còn quyền truy cập." href="/admin/survey" linkLabel="Về danh sách khảo sát" />;
  const tabs = [["dashboard", "Tổng quan", BarChart3], ["questions", "Phân tích câu hỏi", MessageSquareText], ["responses", "Phản hồi", ListChecks]] as const;
  return <main className="analytics-hub -mx-4 -my-5 min-h-screen bg-[#eef2f7] px-4 py-5 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/admin/survey" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300"><ArrowLeft size={14} />Danh sách khảo sát</Link><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Kết quả khảo sát</p><h1 className="mt-1 text-[23px] font-semibold leading-7 tracking-tight">{survey?.title ?? statistics?.surveyTitle ?? (surveyError ? "Báo cáo khảo sát" : "Đang tải…")}</h1><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{names[survey?.status ?? ""] ?? survey?.status ?? "—"} · Mở: {formatSurveyLocal(survey?.openAt)} · Đóng: {formatSurveyLocal(survey?.closeAt)}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void exportReport("raw")} disabled={exporting !== null || !survey} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"><FileSpreadsheet size={15} />Xuất phản hồi</button><button type="button" onClick={() => void exportReport("analysis")} disabled={exporting !== null || !survey} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white disabled:opacity-50"><Download size={15} />Xuất phân tích</button></div></div>
        {survey?.scheduleWarnings?.length ? <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{survey.scheduleWarnings.join(" · ")}</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-4 lg:grid-cols-5">{[["Trang", survey?.pages?.length == null ? "—" : number.format(survey.pages.length)], ["Câu hỏi", survey ? number.format(questions.length) : "—"], ["Lượt xem", lifetime ? lifetime.views == null ? "Chưa ghi nhận" : number.format(lifetime.views) : "—"], ["Phản hồi", lifetime == null ? "—" : number.format(lifetime.submissions)], ["Phạm vi", "Toàn thời gian"]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-600 dark:text-slate-300">{label}</p><strong className="mt-1 block text-lg font-semibold tabular-nums">{value}</strong></div>)}</div>
      </header>
      {surveyError && <div role="alert" className="flex items-center justify-between rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300"><span>{surveyError}</span><button type="button" onClick={() => void loadSurvey()} aria-label="Tải lại khảo sát"><RefreshCw size={16} /></button></div>}
      {exportError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{exportError}</p>}
      <nav aria-label="Nội dung báo cáo" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">{tabs.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined} className={`min-h-10 shrink-0 rounded-lg px-4 text-sm font-semibold ${tab === key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}><Icon size={16} className="mr-2 inline" />{label}</button>)}</nav>
      {tab === "dashboard" ? <SurveyDashboardTab data={dashboard} loading={dashboardLoading} error={dashboardError} fromDate={fromDate} toDate={toDate} maxDate={maxDate} valid={valid} onFromDate={setFromDate} onToDate={setToDate} onRefresh={() => setAsOf(Date.now())} /> : <>
        <p className="text-xs text-slate-600 dark:text-slate-300">{Object.keys(filter).length ? "Đang lọc phản hồi và thống kê câu hỏi." : "Toàn bộ thời gian khảo sát."} Bộ lọc ngày ở mục Tổng quan không áp dụng tại đây.</p>
        <FilterTab questions={questions} value={filter} onApply={setFilter} />
        {statisticsError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{statisticsError}</p>}
        {tab === "questions" ? <SummaryTab mode="questions" data={statistics} traffic={null} pages={null} timeline={[]} loading={statisticsLoading} filtered={Object.keys(filter).length > 0} surveyPages={survey?.pages} /> : <ResponseListTab surveyId={surveyId} filter={filter} />}
      </>}
    </div>
  </main>;
}
