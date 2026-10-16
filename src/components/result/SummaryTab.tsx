"use client";

import { ListChecks } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatSurveyLocal } from "@/lib/report";
import type { ResponseTimelinePoint, SurveyPageStatistics, SurveyQuestionStatistic, SurveyResultDetail, SurveyStatistics, SurveyTraffic } from "@/types/report";

type Props = { data: SurveyStatistics | null; traffic: SurveyTraffic | null; pages: SurveyPageStatistics | null; timeline: ResponseTimelinePoint[]; loading: boolean; filtered: boolean; mode?: "overview" | "questions"; surveyPages?: NonNullable<SurveyResultDetail["pages"]>; };

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const chartColors = ["#2563eb", "#f97316", "#16a34a", "#9333ea", "#e11d48", "#0891b2", "#ca8a04", "#64748b"];

function valueOrPending(value: number | null | undefined, suffix = "") {
  return value == null ? "Chưa đủ dữ liệu" : `${number.format(value)}${suffix}`;
}


function questionCount(question: SurveyQuestionStatistic) {
  return question.numberStatistics?.count ?? question.dateStatistics?.count ?? question.addressStatistics?.count ?? question.textStatistics?.count ?? question.choiceStatistics?.options.reduce((sum, option) => sum + option.count, 0) ?? 0;
}

function ChoiceSummary({ question }: { question: SurveyQuestionStatistic }) {
  const options = question.choiceStatistics?.options ?? [];
  const pie = question.questionTypeCode === "SINGLE_CHOICE" && options.length <= 6;
  return (
    <div className="mt-4">
      <div className="h-56" role="img" aria-label={pie ? "Biểu đồ tròn tỷ lệ lựa chọn" : "Biểu đồ cột số lượt lựa chọn"}>
        <ResponsiveContainer width="100%" height="100%" minWidth={240}>
          {pie ? <PieChart><Pie data={options} dataKey="count" nameKey="optionText" innerRadius={42} outerRadius={78} paddingAngle={2}>{options.map((option, index) => <Cell key={option.optionId} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => number.format(Number(value))} /></PieChart> : <BarChart data={options} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="optionText" width={100} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => number.format(Number(value))} /><Bar dataKey="count" name="Lượt chọn" fill="#2563eb" radius={[0, 4, 4, 0]} /></BarChart>}
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 grid gap-2 text-xs sm:grid-cols-2">{options.map((option, index) => <li key={option.optionId} className="flex items-center justify-between gap-3"><span className="min-w-0 truncate" title={option.optionText}><i className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: pie ? chartColors[index % chartColors.length] : "#2563eb" }} />{option.optionText}</span><strong className="shrink-0 tabular-nums">{number.format(option.count)} · {number.format(option.percentage)}%</strong></li>)}</ul>
    </div>
  );
}

function QuestionBody({ question }: { question: SurveyQuestionStatistic }) {
  if (question.choiceStatistics?.options?.length) return <ChoiceSummary question={question} />;

  if (question.numberStatistics) {
    const stats = question.numberStatistics;
    return <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
      {[["Trung bình", stats.average], ["Trung vị", stats.median], ["Nhỏ nhất", stats.min], ["Lớn nhất", stats.max]].map(([label, value]) => (
        <div key={String(label)} className="border-t border-[#d7ddd6] pt-3 dark:border-[#314748]"><dt className="text-xs font-semibold text-[#687a79] dark:text-[#9fb2af]">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{valueOrPending(value as number | null)}</dd></div>
      ))}
    </dl>;
  }

  if (question.dateStatistics) {
    return <dl className="mt-5 grid gap-4 sm:grid-cols-2"><div className="border-t border-[#d7ddd6] pt-3 dark:border-[#314748]"><dt className="text-xs font-semibold text-[#687a79] dark:text-[#9fb2af]">Sớm nhất</dt><dd className="mt-1 font-semibold">{formatSurveyLocal(question.dateStatistics.min)}</dd></div><div className="border-t border-[#d7ddd6] pt-3 dark:border-[#314748]"><dt className="text-xs font-semibold text-[#687a79] dark:text-[#9fb2af]">Muộn nhất</dt><dd className="mt-1 font-semibold">{formatSurveyLocal(question.dateStatistics.max)}</dd></div></dl>;
  }

  const textRows = question.textStatistics?.topAnswers ?? [];
  if (textRows.length) {
    return <ol className="mt-4 divide-y divide-[#dce1da] dark:divide-[#304546]">{textRows.slice(0, 7).map((row, index) => <li key={`${row.text}-${index}`} className="flex justify-between gap-6 py-3 text-sm"><span className="line-clamp-2 text-[#314a4e] dark:text-[#d7e2df]">{row.text}</span><span className="shrink-0 font-semibold tabular-nums text-[#087f73] dark:text-[#62c8ba]">{row.count}</span></li>)}</ol>;
  }

  const addressRows = question.addressStatistics?.topProvinces ?? [];
  if (addressRows.length) {
    return <ol className="mt-4 divide-y divide-[#dce1da] dark:divide-[#304546]">{addressRows.slice(0, 7).map((row, index) => <li key={`${row.name}-${index}`} className="flex justify-between gap-6 py-3 text-sm"><span className="text-[#314a4e] dark:text-[#d7e2df]">{row.name}</span><span className="font-semibold tabular-nums text-[#087f73] dark:text-[#62c8ba]">{row.count}</span></li>)}</ol>;
  }

  return <p className="mt-4 text-sm text-[#758583] dark:text-[#8fa3a0]">Câu hỏi này chưa có dữ liệu tổng hợp để hiển thị.</p>;
}

export default function SummaryTab({ data, traffic, pages, timeline, loading, filtered, mode = "overview", surveyPages = [] }: Props) {
  if (loading && !data) return <div className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" aria-label="Đang tải báo cáo" />;
  const questions = data?.questions ?? [];
  if (mode === "questions") {
    const byId = new Map(questions.map(question => [question.questionId, question]));
    const assigned = new Set<string>();
    const groups = surveyPages.map((page, pageIndex) => {
      const pageQuestions = (page.questions ?? []).map(question => byId.get(question.id)).filter((question): question is SurveyQuestionStatistic => Boolean(question));
      pageQuestions.forEach(question => assigned.add(question.questionId));
      return { id: page.id, pageNumber: pageIndex + 1, title: page.title?.trim() || `Trang ${pageIndex + 1}`, questions: pageQuestions };
    }).filter(group => group.questions.length);
    const remaining = questions.filter(question => !assigned.has(question.questionId));
    if (remaining.length) groups.push({ id: "other", pageNumber: groups.length + 1, title: surveyPages.length ? "Câu hỏi khác" : "Nội dung khảo sát", questions: remaining });
    const order = new Map(questions.map((question, index) => [question.questionId, index + 1]));
    return <section>{questions.length ? <div className="space-y-5">{groups.map(group => <section key={group.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><header className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Trang {group.pageNumber}</p><h2 className="mt-1 text-lg font-semibold">{group.title}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{group.questions.length} câu hỏi</p></header><div className="grid gap-4 p-4 xl:grid-cols-2">{group.questions.map(question => <article key={question.questionId} className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5"><p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Câu {order.get(question.questionId)}</p><h3 className="mt-1 text-base font-semibold">{question.questionText}</h3><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{number.format(questionCount(question))} lượt trả lời được tổng hợp</p><QuestionBody question={question} /></article>)}</div></section>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900"><ListChecks className="mx-auto text-slate-400" /><h3 className="mt-4 font-semibold">Chưa có thống kê câu hỏi</h3></div>}</section>;
  }
  const metrics: Array<[string, number | null | undefined, string?]> = [
    ["Lượt xem", traffic?.totalViews], ["Phiên truy cập", traffic?.uniqueSessions],
    ["Phiên bắt đầu", traffic?.startedSessions], ["Phản hồi đã nộp", traffic?.submittedResponses],
    ["Xem → bắt đầu", traffic?.viewToStartRate, "%"], ["Bắt đầu → nộp", traffic?.startToSubmitRate, "%"],
  ];
  const points = timeline;
  const max = Math.max(1, ...points.map((point) => point.responses));
  return <div className="space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6"><h2 className="text-xl font-semibold">Dữ liệu đã ghi nhận</h2><p className="mt-2 text-sm text-gray-500">{filtered ? "Phản hồi theo bộ lọc đang áp dụng" : "Toàn bộ phản hồi khảo sát"}</p><p className="mt-4 text-4xl font-semibold text-brand-600">{number.format(data?.totalResponses ?? 0)} <span className="text-sm font-medium text-gray-500">phản hồi</span></p></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6"><h2 className="text-xl font-semibold">Lượt xem và chuyển đổi</h2><p className="mt-1 text-sm text-gray-500">Dữ liệu tracking toàn khảo sát trong 30 ngày gần nhất; không chịu tác động của bộ lọc câu trả lời.</p>{traffic?.trackingStatus === "NO_TRACKING" && <p className="mt-4 text-sm text-amber-700">Chưa có dữ liệu tracking cho khoảng thời gian này.</p>}<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value, suffix]) => <div key={label} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value == null ? "—" : `${number.format(value)}${suffix ?? ""}`}</p></div>)}</div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6"><h2 className="text-xl font-semibold">Phản hồi theo ngày</h2><p className="mt-1 text-sm text-gray-500">Phản hồi thực tế toàn khảo sát trong 30 ngày gần nhất.</p>{points.length ? <div className="mt-5 flex h-52 items-end gap-1 overflow-x-auto" role="img" aria-label="Biểu đồ phản hồi đã nộp theo ngày">{points.map((point) => <div key={point.date} className="group flex h-full min-w-3 flex-1 flex-col justify-end" title={`${point.date}: ${number.format(point.responses)} phản hồi`}><span className="mb-1 text-center text-[10px] opacity-0 group-hover:opacity-100">{point.responses}</span><div className="rounded-t bg-brand-500" style={{ height: `${Math.max(3, point.responses / max * 170)}px` }} /></div>)}</div> : <p className="py-10 text-sm text-gray-500">Chưa có phản hồi trong khoảng thời gian này.</p>}</section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6"><h2 className="text-xl font-semibold">Theo trang khảo sát</h2><p className="mt-1 text-sm text-gray-500">Phiên xem/hoàn thành theo tracking; phản hồi có câu trả lời do hệ thống ghi nhận.</p><div className="mt-5 space-y-3">{pages?.pages.map((page) => <div key={page.pageId} className="flex flex-wrap justify-between gap-3 border-t border-gray-100 pt-3 text-sm dark:border-gray-800"><strong>{page.title}</strong><span className="text-gray-500">{page.viewedSessions == null ? "Chưa có tracking" : `${number.format(page.viewedSessions)} phiên xem`} · {page.completedSessions == null ? "—" : `${number.format(page.completedSessions)} hoàn thành`} · {number.format(page.submittedResponsesWithAnswers)} phản hồi</span></div>)}{!pages?.pages.length && <p className="text-sm text-gray-500">Chưa có dữ liệu trang.</p>}</div></section>
  </div>;
}
