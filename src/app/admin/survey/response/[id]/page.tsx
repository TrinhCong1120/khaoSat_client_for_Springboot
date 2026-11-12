"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleSlash2,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  Home,
  Layers,
  MapPin,
  Paperclip,
  Percent,
} from "lucide-react";

import ApiNotFound from "@/components/common/ApiNotFound";
import { API_RESPONSES, API_SURVEYS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/media";
import { formatLegacyUtc, getApiError } from "@/lib/report";
import type { MediaFile, ResponseDetail, ResponseQuestion } from "@/types/report";

function hasAnswer(question: ResponseQuestion) {
  if (!question.isApplicable) return false;
  return Boolean(
    (question.matrixData && question.matrixData.trim().length > 0) ||
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

function MatrixResponseDisplay({ question }: { question: ResponseQuestion }) {
  const isDynamicTable = question.questionTypeCode === "DYNAMIC_TABLE";
  const isSingle = question.questionTypeCode === "MATRIX_SINGLE";
  const isMulti = question.questionTypeCode === "MATRIX_MULTI";
  const isInput = question.questionTypeCode === "MATRIX_INPUT";

  const config = useMemo(() => {
    const raw = question.matrixConfig;
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw;
  }, [question.matrixConfig]);

  const data = useMemo(() => {
    const raw = question.matrixData;
    if (!raw) return isDynamicTable ? [] : {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return isDynamicTable ? [] : {};
      }
    }
    return raw;
  }, [question.matrixData, isDynamicTable]);

  const rows = config.rows || [];
  const columns = config.columns || [];

  if (isDynamicTable) {
    const tableRows = Array.isArray(data) ? data : [];
    if (!tableRows.length) {
      return <span className="italic text-gray-400">Bảng trống (không có dòng dữ liệu)</span>;
    }
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 mt-2">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800 text-[11px] font-bold uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-center w-10">#</th>
              {columns.map((col: { id: string; label: string }) => (
                <th key={col.id} className="px-3 py-2">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tableRows.map((rItem: Record<string, unknown>, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 text-center text-gray-400">{idx + 1}</td>
                {columns.map((col: { id: string }) => (
                  <td key={col.id} className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                    {String(rItem[col.id] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 mt-2">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800 text-[11px] font-bold text-gray-600 dark:text-gray-300">
          <tr>
            <th className="px-3 py-2.5 bg-gray-100/50 dark:bg-gray-800/80 min-w-[140px]">Tiêu chí</th>
            {columns.map((col: { id: string; label: string }) => (
              <th key={col.id} className="px-3 py-2.5 text-center min-w-[80px]">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row: { id: string; label: string }) => (
            <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
              <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200">{row.label}</td>
              {columns.map((col: { id: string; type?: string }) => {
                if (isSingle) {
                  const isChecked = data[row.id] === col.id;
                  return (
                    <td key={col.id} className="px-3 py-2.5 text-center">
                      {isChecked ? (
                        <span className="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700">-</span>
                      )}
                    </td>
                  );
                }

                if (isMulti) {
                  const list: string[] = Array.isArray(data[row.id]) ? data[row.id] : [];
                  const isChecked = list.includes(col.id);
                  return (
                    <td key={col.id} className="px-3 py-2.5 text-center">
                      {isChecked ? (
                        <span className="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700">-</span>
                      )}
                    </td>
                  );
                }

                if (isInput) {
                  const cellVal = data[row.id]?.[col.id];
                  return (
                    <td key={col.id} className="px-2 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      {cellVal !== undefined && cellVal !== null && String(cellVal) !== "" ? (
                        col.type === "rating" ? (
                          <span className="text-amber-500 font-bold">★ {String(cellVal)}</span>
                        ) : col.type === "checkbox" ? (
                          cellVal ? "✓ Có" : "✗ Không"
                        ) : (
                          String(cellVal)
                        )
                      ) : (
                        <span className="text-gray-400 font-normal">-</span>
                      )}
                    </td>
                  );
                }

                return null;
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-3 py-3 text-center text-gray-400 italic">
                {String(question.matrixData || "Chưa có dữ liệu")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function answerValue(question: ResponseQuestion) {
  if (!question.isApplicable) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
        <CircleSlash2 size={14} />
        <span>Không áp dụng theo điều kiện</span>
      </span>
    );
  }
  if (!hasAnswer(question)) {
    return (
      <span className="italic text-gray-400 dark:text-gray-500">Chưa có câu trả lời</span>
    );
  }
  if (
    question.matrixData?.trim() ||
    ["MATRIX_SINGLE", "MATRIX_MULTI", "MATRIX_INPUT", "DYNAMIC_TABLE"].includes(
      question.questionTypeCode
    )
  ) {
    return <MatrixResponseDisplay question={question} />;
  }
  if (question.questionTypeCode === "ADDRESS") {
    const address = [question.addressDetail, question.ward, question.province]
      .filter(Boolean)
      .join(", ");
    return (
      <span className="inline-flex items-start gap-2 text-gray-900 dark:text-white">
        <MapPin
          className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400"
          size={16}
        />
        <span className="font-medium">{address || question.formattedAnswer}</span>
      </span>
    );
  }
  if (question.questionTypeCode === "DATE" && question.answerDate) {
    const date = new Date(question.answerDate);
    const text = Number.isNaN(date.getTime())
      ? question.answerDate
      : date.toLocaleDateString("vi-VN");
    return (
      <span className="inline-flex items-center gap-2 font-medium text-gray-900 dark:text-white">
        <Calendar size={15} className="text-brand-500" />
        <span>{text}</span>
      </span>
    );
  }
  return (
    <span className="font-medium text-gray-900 dark:text-white">
      {question.formattedAnswer ||
        question.optionTexts?.join(", ") ||
        question.answerText ||
        String(question.answerNumber ?? question.answerDate ?? "")}
    </span>
  );
}

function MediaLinks({ media }: { media?: MediaFile[] }) {
  if (!media?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {media.map((item) => (
        <a
          key={item.id}
          href={resolveMediaUrl(item.objectUrl)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Paperclip size={13} className="text-gray-400" />
          <span>{item.originalFilename || item.mediaType}</span>
          <ExternalLink size={11} className="text-gray-400 opacity-60" />
        </a>
      ))}
    </div>
  );
}

export default function ResponseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const responseId = String(id ?? "");
  const [data, setData] = useState<ResponseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_RESPONSES}/${encodeURIComponent(responseId)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(async (response) => {
        if (response.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!response.ok) throw new Error(getApiError(response.status));
        return response.json() as Promise<ResponseDetail>;
      })
      .then(async (result) => {
        if (!cancelled && result) {
          setData(result);
          setError(null);

          // Enrich matrixConfig from survey definition if missing
          if (result.surveyId) {
            try {
              const sRes = await fetch(`${API_SURVEYS}/${encodeURIComponent(result.surveyId)}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
              });
              if (sRes.ok) {
                const sData = await sRes.json();
                const qMap = new Map<string, string | null | undefined>();
                (sData.pages || []).forEach((p: { questions?: Array<{ id: string; matrixConfig?: string | null }> }) => {
                  (p.questions || []).forEach((q) => qMap.set(q.id, q.matrixConfig));
                });

                result.pages.forEach((p) => {
                  (p.questions || []).forEach((q) => {
                    if (!q.matrixConfig && qMap.has(q.questionId)) {
                      q.matrixConfig = qMap.get(q.questionId);
                    }
                  });
                });
                if (!cancelled) setData({ ...result });
              }
            } catch {
              // Graceful fallback
            }
          }
        }
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải chi tiết phản hồi."
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [responseId]);

  const pages = useMemo(
    () => [...(data?.pages ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [data]
  );
  const questions = pages.flatMap((page) => page.questions ?? []);
  const answered = questions.filter(hasAnswer).length;
  const notApplicable = questions.filter((question) => !question.isApplicable).length;
  const completionRate = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;

  const copyRequestId = async () => {
    if (!data?.requestId) return;
    await navigator.clipboard.writeText(data.requestId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (notFound)
    return (
      <ApiNotFound
        title="Không tìm thấy phản hồi"
        description="Phản hồi không tồn tại hoặc bạn không có quyền xem khảo sát chứa phản hồi này."
        href="/admin/survey"
        linkLabel="Về danh sách khảo sát"
      />
    );

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          <Home size={13} />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight size={12} className="text-gray-400" />
        <Link
          href="/admin/survey"
          className="transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          Khảo sát
        </Link>
        {data && (
          <>
            <ChevronRight size={12} className="text-gray-400" />
            <Link
              href={`/admin/survey/${encodeURIComponent(data.surveyId)}/result`}
              className="transition-colors hover:text-brand-600 dark:hover:text-brand-400"
            >
              Kết quả khảo sát
            </Link>
          </>
        )}
        <ChevronRight size={12} className="text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          Chi tiết phản hồi
        </span>
      </nav>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6" aria-label="Đang tải chi tiết phản hồi">
          <div className="h-44 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : data ? (
        <>
          {/* Header Hero Card */}
          <header className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="p-5 sm:p-6 lg:p-7">
              <Link
                href={`/admin/survey/${encodeURIComponent(data.surveyId)}/result`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 transition hover:underline dark:text-brand-400"
              >
                <ArrowLeft size={14} />
                <span>Quay lại bảng kết quả khảo sát</span>
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-200/60 dark:border-brand-500/20">
                  Chi tiết câu trả lời
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <Hash size={12} />
                  <span>ID: {responseId.slice(0, 8)}...</span>
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                {data.surveyTitle}
              </h1>

              {data.surveyDescription && (
                <p className="mt-2 max-w-4xl text-xs leading-relaxed text-gray-600 dark:text-gray-300 sm:text-sm">
                  {data.surveyDescription}
                </p>
              )}

              <MediaLinks media={data.mediaFiles} />
            </div>

            {/* Metrics Bar */}
            <dl className="grid border-t border-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-gray-100 dark:border-gray-800 dark:sm:divide-gray-800">
              <div className="p-4 sm:px-6">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <CalendarClock size={15} className="text-gray-400" />
                  <span>Thời gian gửi bài</span>
                </dt>
                <dd className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white sm:text-base">
                  {formatLegacyUtc(data.submittedAt)}
                </dd>
              </div>

              <div className="p-4 sm:px-6">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  <span>Tiến độ hoàn thành</span>
                </dt>
                <dd className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-brand-600 dark:text-brand-400 sm:text-2xl">
                    {answered}
                    <span className="text-sm font-normal text-gray-400">
                      /{questions.length} câu
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    ({completionRate}%)
                  </span>
                </dd>
              </div>

              <div className="p-4 sm:px-6">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <Hash size={15} className="text-gray-400" />
                  <span>Mã đối chiếu Request ID</span>
                </dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  <span
                    className="truncate font-mono text-xs font-semibold text-gray-800 dark:text-gray-200"
                    title={data.requestId}
                  >
                    {data.requestId}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyRequestId()}
                    title="Copy mã đối chiếu"
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    <Copy size={13} />
                  </button>
                  {copiedId && (
                    <span className="text-[11px] font-semibold text-emerald-600">Đã copy!</span>
                  )}
                </dd>
              </div>
            </dl>
          </header>

          {/* Body Content Grid */}
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* Left Column: Sticky Summary & Jump-to-Page */}
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tổng quan phản hồi
                </h3>
                <dl className="mt-3.5 space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">Tổng số trang</dt>
                    <dd className="font-bold text-gray-900 dark:text-white">{pages.length}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">Tổng số câu hỏi</dt>
                    <dd className="font-bold text-gray-900 dark:text-white">
                      {questions.length}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">Đã trả lời</dt>
                    <dd className="font-bold text-emerald-600 dark:text-emerald-400">{answered}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">Không áp dụng</dt>
                    <dd className="font-bold text-amber-600 dark:text-amber-400">
                      {notApplicable}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Jump to Page list */}
              {pages.length > 1 && (
                <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Chuyển đến trang
                  </p>
                  <div className="mt-2.5 space-y-1">
                    {pages.map((page, index) => (
                      <a
                        key={page.pageId}
                        href={`#response-page-${page.pageId}`}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                      >
                        <span className="truncate">
                          Trang {index + 1}: {page.title || `Trang ${index + 1}`}
                        </span>
                        <ChevronRight size={13} className="text-gray-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Right Column: Questions & Answers Stream */}
            <div className="space-y-6">
              {pages.map((page, pageIndex) => {
                const sortedQuestions = page.questions ?? [];
                return (
                  <section
                    key={page.pageId}
                    id={`response-page-${page.pageId}`}
                    className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900"
                  >
                    {/* Page Header */}
                    <div className="flex items-center gap-3.5 border-b border-gray-100 bg-gray-50/70 p-4.5 sm:px-6 dark:border-gray-800 dark:bg-gray-950/40">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white shadow-2xs">
                        {pageIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                          {page.title || `Trang ${pageIndex + 1}`}
                        </h2>
                        {page.description && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {page.description}
                          </p>
                        )}
                        <MediaLinks media={page.mediaFiles} />
                      </div>
                    </div>

                    {/* Question Cards */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {sortedQuestions.map((question, questionIndex) => {
                        const isNotApp = !question.isApplicable;
                        return (
                          <article
                            key={question.questionId}
                            className={`p-4.5 transition sm:p-6 ${
                              isNotApp ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                            }`}
                          >
                            <div className="space-y-3.5">
                              {/* Top: Question info (Full width) */}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                                    Câu {questionIndex + 1}
                                  </span>
                                  <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    {question.questionTypeCode}
                                  </span>
                                  {question.isRequired && (
                                    <span className="text-xs font-semibold text-red-500">
                                      * Bắt buộc
                                    </span>
                                  )}
                                </div>

                                <h3 className="mt-1.5 text-sm font-semibold leading-relaxed text-gray-900 dark:text-white sm:text-base">
                                  {question.questionText}
                                </h3>

                                {question.description && (
                                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                    {question.description}
                                  </p>
                                )}

                                <MediaLinks media={question.mediaFiles} />
                              </div>

                              {/* Bottom: Answer Box (Xuống dòng toàn bộ, Full width) */}
                              <div className="w-full rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-sm shadow-2xs dark:border-gray-800 dark:bg-gray-950/60">
                                <div className="mb-2 flex items-center justify-between border-b border-gray-200/60 pb-1.5 dark:border-gray-800">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Câu trả lời của người dùng:
                                  </span>
                                  {hasAnswer(question) && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 size={13} /> Đã trả lời
                                    </span>
                                  )}
                                </div>
                                <div className="w-full">
                                  {answerValue(question)}
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {pages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-14 text-center dark:border-gray-700 dark:bg-gray-900">
                  <ClipboardList className="mx-auto text-gray-400" size={32} />
                  <h2 className="mt-3 text-base font-semibold text-gray-800 dark:text-gray-200">
                    Phản hồi chưa có nội dung
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Không tìm thấy trang hoặc câu trả lời nào được ghi nhận cho phản hồi này.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
