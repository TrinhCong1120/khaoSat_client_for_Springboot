"use client";

import { useMemo, useState } from "react";
import { Filter, RotateCcw, SlidersHorizontal } from "lucide-react";

import { localDayBoundary } from "@/lib/report";
import type { ReportFilter, SurveyResultQuestion } from "@/types/report";

type Draft = Record<"from" | "to" | "questionId" | "optionId" | "text" | "number" | "date" | "province" | "ward", string>;
const EMPTY: Draft = { from: "", to: "", questionId: "", optionId: "", text: "", number: "", date: "", province: "", ward: "" };
const control = "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

function fromFilter(value: ReportFilter): Draft {
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item == null ? "" : String(item)])),
    from: value.from?.slice(0, 10) ?? "",
    to: value.to?.slice(0, 10) ?? "",
  } as Draft;
}

export default function FilterTab({ questions, value, onApply }: { questions: SurveyResultQuestion[]; value: ReportFilter; onApply: (value: ReportFilter) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => fromFilter(value));

  const selected = questions.find((question) => question.id === draft.questionId);
  const activeCount = Object.keys(value).length;
  const questionType = String(selected?.questionTypeCode ?? "").toUpperCase();
  const set = (key: keyof Draft, next: string) => setDraft((current) => ({ ...current, [key]: next, ...(key === "questionId" ? { optionId: "", text: "", number: "", date: "", province: "", ward: "" } : {}) }));

  const detailField = useMemo(() => {
    if (!draft.questionId) return null;
    if (questionType.includes("CHOICE")) return <label className="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Lựa chọn<select className={control} value={draft.optionId} onChange={(event) => set("optionId", event.target.value)}><option value="">Tất cả lựa chọn</option>{(selected?.options ?? []).map((option) => <option key={option.id} value={option.id}>{option.text ?? option.optionText ?? option.id}</option>)}</select></label>;
    if (questionType === "NUMBER") return <label className="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Giá trị số<input className={control} type="number" value={draft.number} onChange={(event) => set("number", event.target.value)} /></label>;
    if (questionType === "DATE") return <label className="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Ngày trả lời<input className={control} type="date" value={draft.date} onChange={(event) => set("date", event.target.value)} /></label>;
    if (questionType === "ADDRESS") return <><label className="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Tỉnh / thành<input className={control} value={draft.province} onChange={(event) => set("province", event.target.value)} placeholder="Tên tỉnh, thành" /></label><label className="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Phường / xã<input className={control} value={draft.ward} onChange={(event) => set("ward", event.target.value)} placeholder="Tên phường, xã" /></label></>;
    return <label className="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Nội dung chứa<input className={control} value={draft.text} onChange={(event) => set("text", event.target.value)} placeholder="Nhập từ khóa trong câu trả lời" /></label>;
  }, [draft, questionType, selected?.options]);

  const apply = () => {
    const next: ReportFilter = {};
    const from = localDayBoundary(draft.from);
    const to = localDayBoundary(draft.to, true);
    if (from) next.from = from;
    if (to) next.to = to;
    (["questionId", "optionId", "text", "date", "province", "ward"] as const).forEach((key) => { if (draft[key].trim()) next[key] = draft[key].trim(); });
    if (draft.number !== "" && Number.isFinite(Number(draft.number))) next.number = Number(draft.number);
    onApply(next);
  };

  const clear = () => { setDraft(EMPTY); onApply({}); };

  return <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left sm:px-5">
      <span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><SlidersHorizontal size={18} /></span><span><strong className="block text-sm text-gray-900 dark:text-white">Bộ lọc dữ liệu</strong><span className="text-xs text-gray-500 dark:text-gray-400">Áp dụng đồng thời cho phân tích câu hỏi và danh sách phản hồi</span></span></span>
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{activeCount ? `${activeCount} điều kiện` : open ? "Thu gọn" : "Mở bộ lọc"}</span>
    </button>
    {open && <div className="border-t border-gray-200 p-4 dark:border-gray-800 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Từ ngày<input className={control} type="date" value={draft.from} max={draft.to || undefined} onChange={(event) => set("from", event.target.value)} /></label>
        <label className="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">Đến ngày<input className={control} type="date" value={draft.to} min={draft.from || undefined} onChange={(event) => set("to", event.target.value)} /></label>
        <label className="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 sm:col-span-2">Câu hỏi<select className={control} value={draft.questionId} onChange={(event) => set("questionId", event.target.value)}><option value="">Tất cả câu hỏi</option>{questions.map((question) => <option key={question.id} value={question.id}>{question.questionText ?? question.text ?? question.title ?? question.id}</option>)}</select></label>
        {detailField}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2"><button type="button" onClick={apply} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"><Filter size={16} /> Áp dụng bộ lọc</button><button type="button" onClick={clear} disabled={!activeCount && Object.values(draft).every((item) => !item)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"><RotateCcw size={16} /> Xóa lọc</button></div>
    </div>}
  </section>;
}
