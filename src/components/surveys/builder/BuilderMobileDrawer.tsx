"use client";

import React, { useState } from "react";
import {
  FiX,
  FiPlus,
  FiLayers,
  FiChevronDown,
  FiChevronRight,
  FiCornerDownRight,
  FiTrash2,
  FiType,
  FiCheckCircle,
  FiList,
  FiHash,
  FiCalendar,
  FiMapPin,
  FiGrid,
  FiEdit3,
  FiFileText,
} from "react-icons/fi";
import type { SurveyData, PageItem, QuestionItem } from "@/hooks/useSurveyEditorData";

interface BuilderMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  survey: SurveyData | null;
  activePageId: string | null;
  activeQuestionId?: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onSelectQuestion: (questionId: string) => void;
  onAddChildQuestion: (parentQuestion: QuestionItem, pageId: string) => void;
}

const getTypeIcon = (typeCode?: string) => {
  switch (typeCode) {
    case "TEXT":
      return FiType;
    case "SINGLE_CHOICE":
      return FiCheckCircle;
    case "MULTIPLE_CHOICE":
      return FiList;
    case "NUMBER":
      return FiHash;
    case "DATE":
      return FiCalendar;
    case "ADDRESS":
      return FiMapPin;
    case "MATRIX_SINGLE":
    case "MATRIX_MULTI":
    case "MATRIX_INPUT":
      return FiGrid;
    case "DYNAMIC_TABLE":
      return FiEdit3;
    default:
      return FiFileText;
  }
};

export default function BuilderMobileDrawer({
  isOpen,
  onClose,
  survey,
  activePageId,
  activeQuestionId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onSelectQuestion,
  onAddChildQuestion,
}: BuilderMobileDrawerProps) {
  const pages = survey?.pages || [];
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({
    ...(activePageId ? { [activePageId]: true } : {}),
  });

  if (!isOpen) return null;

  const togglePageAccordion = (pageId: string) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* BOTTOM SHEET CONTENT */}
      <div className="relative z-10 w-full rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
        {/* DRAG HANDLE PILL */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <FiLayers size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Cấu trúc Khảo sát
              </h3>
              <p className="text-xs text-gray-400">
                {pages.length} trang •{" "}
                {pages.reduce((acc, p) => acc + (p.questions?.length || 0), 0)} tiêu chí
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await onAddPage();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-600"
            >
              <FiPlus size={14} />
              <span>+ Trang</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* PAGE LIST (TOUCH SCROLLABLE) */}
        <div className="space-y-3 overflow-y-auto py-3 pr-1 flex-1">
          {pages.map((p: PageItem, pIdx: number) => {
            const isPageActive = p.id === activePageId;
            const isExpanded = !!expandedPages[p.id];
            const questions = p.questions || [];

            const parents = questions.filter((q) => !q.parentId);
            const childMap = new Map<string, QuestionItem[]>();
            for (const q of questions) {
              if (q.parentId) {
                const current = childMap.get(q.parentId) || [];
                current.push(q);
                childMap.set(q.parentId, current);
              }
            }

            return (
              <div
                key={p.id}
                className={`rounded-2xl border transition-all ${
                  isPageActive
                    ? "border-brand-300 bg-brand-50/30 dark:border-brand-500/40 dark:bg-brand-500/10 shadow-xs"
                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                }`}
              >
                {/* PAGE HEADER */}
                <div
                  className="flex items-center justify-between p-3.5 cursor-pointer"
                  onClick={() => {
                    onSelectPage(p.id);
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePageAccordion(p.id);
                      }}
                      className="flex size-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                    </button>

                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isPageActive
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {pIdx + 1}
                    </span>

                    <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
                      {p.title || `Trang ${pIdx + 1}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {questions.length} câu
                    </span>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(p.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* QUESTIONS ACCORDION */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800/80 px-3 py-2 space-y-1.5">
                    {questions.length === 0 ? (
                      <p className="py-2 text-center text-xs text-gray-400 italic">
                        Trang chưa có câu hỏi nào
                      </p>
                    ) : (
                      parents.map((parent) => {
                        const Icon = getTypeIcon(parent.questionTypeCode);
                        const isParentActive = parent.id === activeQuestionId;
                        const isAggregateParent =
                          parent.aggregationType && parent.aggregationType !== "NONE";
                        const children = childMap.get(parent.id) || [];

                        return (
                          <div key={parent.id} className="space-y-1">
                            <div
                              onClick={() => {
                                onSelectPage(p.id);
                                onSelectQuestion(parent.id);
                                onClose();
                              }}
                              className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer ${
                                isParentActive
                                  ? "bg-brand-500 text-white font-bold"
                                  : isAggregateParent
                                  ? "bg-purple-50 text-purple-900 dark:bg-purple-950/30 dark:text-purple-300 font-bold"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon size={14} className="shrink-0" />
                                <span className="truncate">
                                  {parent.questionText || "Chưa có tiêu đề"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                {isAggregateParent && (
                                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200">
                                    {parent.aggregationType}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddChildQuestion(parent, p.id);
                                  }}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                >
                                  + Con
                                </button>
                              </div>
                            </div>

                            {/* NESTED CHILDREN */}
                            {children.map((child) => {
                              const ChildIcon = getTypeIcon(child.questionTypeCode);
                              const isChildActive = child.id === activeQuestionId;

                              return (
                                <div
                                  key={child.id}
                                  onClick={() => {
                                    onSelectPage(p.id);
                                    onSelectQuestion(child.id);
                                    onClose();
                                  }}
                                  className={`ml-4 flex items-center justify-between rounded-xl pl-2.5 pr-2 py-1.5 text-xs transition cursor-pointer border-l-2 ${
                                    isChildActive
                                      ? "border-brand-500 bg-brand-500 text-white font-bold"
                                      : "border-blue-400 bg-blue-50/60 text-blue-900 dark:border-blue-600 dark:bg-blue-950/30 dark:text-blue-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FiCornerDownRight size={12} className="shrink-0 text-blue-500" />
                                    <ChildIcon size={12} className="shrink-0 text-blue-400" />
                                    <span className="truncate">
                                      {child.questionText || "Tiêu chí con"}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shrink-0">
                                    x{child.weight ?? 1.0}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

