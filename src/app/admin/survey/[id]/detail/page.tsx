"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, Check, CircleSlash2, ClipboardList, FileText, Hash, MapPin } from "lucide-react";

import ApiNotFound from "@/components/common/ApiNotFound";
import { API_RESPONSES } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/media";
import { formatLegacyUtc, getApiError } from "@/lib/report";
import type { MediaFile, ResponseDetail, ResponseQuestion } from "@/types/report";

function hasAnswer(question: ResponseQuestion) {
  if (!question.isApplicable) return false;
  return Boolean(
    question.formattedAnswer?.trim() ||
    question.answerText?.trim() ||
    question.answerNumber != null ||
    question.answerDate ||
    question.optionTexts?.length ||
    question.province ||
    question.ward ||
    question.addressDetail
  );
}

function answerValue(question: ResponseQuestion) {
  if (!question.isApplicable) return <span className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-300"><CircleSlash2 size={16} /> Không áp dụng theo điều kiện</span>;
  if (!hasAnswer(question)) return <span className="italic text-slate-500 dark:text-slate-400">Chưa trả lời</span>;
  if (question.questionTypeCode === "ADDRESS") {
    const address = [question.addressDetail, question.ward, question.province].filter(Boolean).join(", ");
    return <span className="inline-flex items-start gap-2"><MapPin className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300" size={17} /><span>{address || question.formattedAnswer}</span></span>;
  }
  if (question.questionTypeCode === "DATE" && question.answerDate) {
    const date = new Date(question.answerDate);
    return Number.isNaN(date.getTime()) ? question.answerDate : date.toLocaleDateString("vi-VN");
  }
  return question.formattedAnswer || question.optionTexts?.join(", ") || question.answerText || String(question.answerNumber ?? question.answerDate ?? "");
}

function MediaLinks({ media }: { media?: MediaFile[] }) {
  if (!media?.length) return null;
  return <div className="mt-3 flex flex-wrap gap-2">{media.map((item) => <a key={item.id} href={resolveMediaUrl(item.objectUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-300"><FileText size={14} /> {item.originalFilename || item.mediaType}</a>)}</div>;
}

export default function ResponseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const responseId = String(id ?? "");
  const [data, setData] = useState<ResponseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_RESPONSES}/${encodeURIComponent(responseId)}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(async (response) => {
        if (response.status === 404) { setNotFound(true); return null; }
        if (!response.ok) throw new Error(getApiError(response.status));
        return response.json() as Promise<ResponseDetail>;
      })
      .then((result) => { if (!cancelled && result) { setData(result); setError(null); } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Không thể tải chi tiết phản hồi."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [responseId]);

  const pages = useMemo(() => [...(data?.pages ?? [])].sort((a, b) => a.orderIndex - b.orderIndex), [data]);
  const questions = pages.flatMap((page) => page.questions ?? []);
  const answered = questions.filter(hasAnswer).length;
  const notApplicable = questions.filter((question) => !question.isApplicable).length;

  if (notFound) return <ApiNotFound title="Không tìm thấy phản hồi" description="Phản hồi không tồn tại hoặc bạn không có quyền xem khảo sát chứa phản hồi này." href="/admin/survey" linkLabel="Về danh sách khảo sát" />;

  return (
    <main className="analytics-hub -mx-4 -my-5 min-h-screen bg-[#eef2f7] px-4 py-5 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        {error && <div role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</div>}
        {loading ? <div className="space-y-5" aria-label="Đang tải chi tiết phản hồi"><div className="h-52 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" /><div className="h-80 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" /></div> : data ? <>
          <header className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="p-5 sm:p-6"><Link href={`/admin/survey/${encodeURIComponent(data.surveyId)}/result`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300"><ArrowLeft size={14} />Quay lại kết quả khảo sát</Link><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Chi tiết phản hồi</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.surveyTitle}</h1>{data.surveyDescription && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{data.surveyDescription}</p>}<MediaLinks media={data.mediaFiles} /></div>
            <dl className="grid border-t border-slate-200 dark:border-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-slate-200 dark:sm:divide-slate-800"><div className="p-4 sm:px-6"><dt className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><CalendarClock size={15} /> Thời gian gửi</dt><dd className="mt-2 font-semibold">{formatLegacyUtc(data.submittedAt)}</dd></div><div className="p-4 sm:px-6"><dt className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><Check size={15} /> Đã trả lời</dt><dd className="mt-2 text-xl font-semibold tabular-nums text-blue-700 dark:text-blue-300">{answered}/{questions.length}</dd></div><div className="p-4 sm:px-6"><dt className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><Hash size={15} /> Mã đối chiếu</dt><dd className="mt-2 truncate font-mono text-xs" title={data.requestId}>{data.requestId}</dd></div></dl>
          </header>

          <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6 lg:self-start"><p className="text-sm font-semibold">Tóm tắt</p><dl className="mt-3 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-600 dark:text-slate-300">Số trang</dt><dd className="font-semibold tabular-nums">{pages.length}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-600 dark:text-slate-300">Tổng câu hỏi</dt><dd className="font-semibold tabular-nums">{questions.length}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-600 dark:text-slate-300">Không áp dụng</dt><dd className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">{notApplicable}</dd></div></dl></aside>

            <div className="space-y-6">
              {pages.map((page, pageIndex) => {
                const sortedQuestions = page.questions ?? [];
                return <section key={page.pageId} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex gap-4 border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">{pageIndex + 1}</span><div><h2 className="text-lg font-semibold">{page.title || `Trang ${pageIndex + 1}`}</h2>{page.description && <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{page.description}</p>}<MediaLinks media={page.mediaFiles} /></div></div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">{sortedQuestions.map((question, questionIndex) => <article key={question.questionId} className={`grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(220px,.85fr)] sm:gap-8 ${!question.isApplicable ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}><div><p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Câu {questionIndex + 1} · {question.questionTypeCode}</p><h3 className="mt-1 font-semibold leading-6">{question.questionText}</h3>{question.description && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{question.description}</p>}<MediaLinks media={question.mediaFiles} /></div><div className="self-center rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 dark:bg-slate-950 dark:text-slate-100">{answerValue(question)}</div></article>)}</div>
                </section>;
              })}

              {pages.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900"><ClipboardList className="mx-auto text-slate-400" /><h2 className="mt-4 font-semibold">Phản hồi chưa có nội dung</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Không có trang hoặc câu trả lời cho phản hồi này.</p></div>}
            </div>
          </div>
        </> : null}
      </div>
    </main>
  );
}
