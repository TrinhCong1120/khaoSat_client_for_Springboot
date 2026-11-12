"use client";

import React, { useState, useMemo } from "react";
import { FiX, FiSearch, FiExternalLink, FiUser, FiCalendar, FiFileText } from "react-icons/fi";
import { formatSurveyLocal } from "@/lib/report";
import { extractText, getQuestionLabel, normalizeQuestionType, type ComputedField } from "@/lib/report-engine";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";

interface DrillDownResponseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  records: DatasetRecord[];
  questions: SurveyResultQuestion[];
  targetQuestionId?: string;
  surveyId?: string;
  computedFields?: ComputedField[];
  computedValues?: Map<string, Record<string, unknown>>;
}

export default function DrillDownResponseDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  records,
  questions,
  targetQuestionId,
  computedValues,
}: DrillDownResponseDrawerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const targetQuestion = useMemo(() => {
    return questions.find((q) => q.id === targetQuestionId);
  }, [questions, targetQuestionId]);

  const previewQuestions = useMemo(() => {
    const nonTarget = questions.filter((q) => {
      if (q.id === targetQuestionId) return false;
      const t = normalizeQuestionType(q);
      return t !== "FILE_UPLOAD" && t !== "SECTION" && t !== "MATRIX";
    });
    const shortTexts = nonTarget.filter((q) => normalizeQuestionType(q) === "SHORT_TEXT");
    const choices = nonTarget.filter((q) =>
      ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "ADDRESS", "NUMBER"].includes(normalizeQuestionType(q))
    );
    const ordered = [...shortTexts, ...choices, ...nonTarget];
    const seen = new Set<string>();
    const deduped: SurveyResultQuestion[] = [];
    for (const q of ordered) {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        deduped.push(q);
      }
    }
    return deduped;
  }, [questions, targetQuestionId]);

  // Filter records by search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter((rec) => {
      if (rec.id.toLowerCase().includes(term)) return true;
      if (
        Object.values(rec.answers).some((ans) =>
          extractText(ans).toLowerCase().includes(term)
        )
      ) {
        return true;
      }
      if (computedValues) {
        const comp = computedValues.get(rec.id);
        if (comp && Object.values(comp).some((val) => String(val).toLowerCase().includes(term))) {
          return true;
        }
      }
      return false;
    });
  }, [records, searchTerm, computedValues]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800">
          {/* HEADER */}
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between bg-slate-50/70 dark:bg-gray-900/80">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  {records.length} bài
                </span>
              </div>
              {subtitle && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Đóng"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* SEARCH BOX */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="relative">
              <FiSearch
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo mã phản hồi hoặc nội dung trả lời..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-gray-900 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* RECORDS LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, idx) => {
                const answeredPreviews = previewQuestions
                  .map((q) => ({
                    question: q,
                    text: extractText(record.answers[q.id]),
                  }))
                  .filter((item) => item.text.length > 0);
                const primaryPreview = answeredPreviews[0];
                const secondaryPreview = answeredPreviews[1];
                let targetVal = "";
                if (targetQuestion) {
                  targetVal = extractText(record.answers[targetQuestion.id]);
                } else if (targetQuestionId && targetQuestionId.startsWith("computed:")) {
                  const cfId = targetQuestionId.slice("computed:".length);
                  const comp = computedValues?.get(record.id);
                  const raw = comp ? (comp[cfId] ?? comp[targetQuestionId]) : undefined;
                  if (raw != null && raw !== "") {
                    if (typeof raw === "boolean") {
                      targetVal = raw ? "Đúng (True)" : "Sai (False)";
                    } else if (typeof raw === "number") {
                      targetVal = Number.isInteger(raw) ? String(raw) : raw.toFixed(2);
                    } else {
                      targetVal = String(raw);
                    }
                  }
                }

                return (
                  <div
                    key={record.id}
                    className="p-3.5 rounded-xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-2xs hover:border-brand-300 dark:hover:border-brand-700 transition space-y-2.5"
                  >
                    {/* CARD TOP BAR */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                      <span className="font-mono">#{idx + 1} • {record.id.slice(0, 8)}</span>
                      <span className="flex items-center gap-1">
                        <FiCalendar size={11} />
                        {formatSurveyLocal(record.submittedAt)}
                      </span>
                    </div>

                    {/* IDENTITY & PRIMARY CONTEXT */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                          <FiUser size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
                            {primaryPreview?.text || `Phản hồi #${idx + 1}`}
                          </p>
                          {secondaryPreview && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {getQuestionLabel(secondaryPreview.question)}:{" "}
                              <span className="font-semibold">{secondaryPreview.text}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* TARGET VALUE BADGE */}
                      {targetVal ? (
                        <div className="text-right shrink-0">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 tabular-nums">
                            {targetVal}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* OTHER ANSWERS PREVIEW */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <FiFileText size={12} />
                        <span>{Object.keys(record.answers).length} câu trả lời</span>
                      </div>

                      <a
                        href={`/admin/survey/response/${encodeURIComponent(record.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 transition"
                      >
                        <span>Xem bài làm</span>
                        <FiExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-gray-400 text-xs">
                Không tìm thấy bài làm nào phù hợp điều kiện lọc.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
