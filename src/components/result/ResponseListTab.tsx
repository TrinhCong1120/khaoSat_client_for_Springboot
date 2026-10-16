"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";

import { API_RESPONSES } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatLegacyUtc, getApiError } from "@/lib/report";
import type { PagedResult, ReportFilter, ResponseListItem } from "@/types/report";

const PAGE_SIZE = 10;

export default function ResponseListTab({ surveyId, filter }: { surveyId: string; filter: ReportFilter }) {
  const [responses, setResponses] = useState<ResponseListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pageState, setPageState] = useState({ context: "", index: 1 });
  const [loadedRequest, setLoadedRequest] = useState("");
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const context = `${surveyId}|${JSON.stringify(filter)}|${debouncedQuery}`;
  const page = pageState.context === context ? pageState.index : 1;
  const requestKey = `${context}|${page}`;
  const loading = loadedRequest !== requestKey;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const activeFilter = Object.keys(filter).length > 0;
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedQuery) params.set("q", debouncedQuery);
    fetch(`${API_RESPONSES}/survey/${encodeURIComponent(surveyId)}${activeFilter ? "/filter" : ""}?${params}`, {
      method: activeFilter ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        ...(activeFilter ? { "Content-Type": "application/json" } : {}),
      },
      body: activeFilter ? JSON.stringify(filter) : undefined,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(getApiError(response.status));
        return response.json() as Promise<PagedResult<ResponseListItem>>;
      })
      .then((data) => {
        if (!cancelled) {
          if (data.totalPages > 0 && page > data.totalPages) {
            setPageState({ context, index: data.totalPages });
            return;
          }
          setResponses(Array.isArray(data.content) ? data.content : []);
          setTotalElements(data.totalElements ?? 0);
          setTotalPages(data.totalPages ?? 0);
          setError(null);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setResponses([]);
          setTotalElements(0);
          setTotalPages(0);
          setError(cause instanceof Error ? cause.message : "Không thể tải danh sách phản hồi.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedRequest(requestKey);
      });
    return () => { cancelled = true; };
  }, [context, debouncedQuery, filter, page, requestKey, surveyId]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-xl font-semibold">Các phản hồi đã ghi nhận</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{loading ? "Đang tải…" : `${totalElements} phản hồi${Object.keys(filter).length ? " trong khoảng đã chọn" : ""}`}</p></div>
        <label className="relative block w-full sm:max-w-sm"><span className="sr-only">Tìm trong nội dung xem trước hoặc mã đối chiếu</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nội dung hoặc mã đối chiếu" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      </div>

      {!loading && error ? <div role="alert" className="m-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</div> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr><th className="w-20 px-5 py-3 font-semibold">STT</th><th className="w-56 px-5 py-3 font-semibold">Thời gian gửi</th><th className="px-5 py-3 font-semibold">Nội dung xem trước</th><th className="w-44 px-5 py-3 font-semibold">Mã đối chiếu</th><th className="w-36 px-5 py-3"><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan={5} className="px-5 py-4"><div className="h-5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></td></tr>) : responses.map((response, index) => (
              <tr key={response.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-5 py-4 text-slate-500 tabular-nums">{(page - 1) * PAGE_SIZE + index + 1}</td>
                <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-100">{formatLegacyUtc(response.submittedAt)}</td>
                <td className="max-w-xl px-5 py-4 text-slate-600 dark:text-slate-300"><span className="line-clamp-2">{response.preview?.trim() || "Không có nội dung xem trước"}</span></td>
                <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-slate-400" title={response.requestId}>{response.requestId ? `${response.requestId.slice(0, 8)}…` : "—"}</td>
                <td className="px-5 py-4 text-right"><Link href={`/admin/survey/${encodeURIComponent(response.id)}/detail`} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 font-semibold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800">Xem chi tiết <ArrowRight size={16} aria-hidden="true" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !error && responses.length === 0 && <div className="px-6 py-16 text-center"><Inbox className="mx-auto text-slate-400" size={30} /><h3 className="mt-4 font-semibold">Không có phản hồi phù hợp</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">Thử xóa từ khóa tìm kiếm hoặc thay đổi khoảng thời gian lọc.</p></div>}

      {!loading && totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800"><p className="text-slate-600 dark:text-slate-300">Trang {page}/{totalPages}</p><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPageState({ context, index: page - 1 })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronLeft size={16} /> Trước</button><button type="button" disabled={page >= totalPages} onClick={() => setPageState({ context, index: page + 1 })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">Sau <ChevronRight size={16} /></button></div></div>}
    </div>
  );
}
