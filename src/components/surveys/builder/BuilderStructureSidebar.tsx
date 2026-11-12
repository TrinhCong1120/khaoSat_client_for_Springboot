"use client";

import React, { useState } from "react";
import {
  FiFileText,
  FiPlus,
  FiTrash2,
  FiCornerDownRight,
  FiGrid,
  FiList,
  FiCheckCircle,
  FiHash,
  FiMapPin,
  FiCalendar,
  FiType,
  FiEdit3,
  FiChevronDown,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiLayers,
} from "react-icons/fi";
import type { SurveyData, PageItem, QuestionItem } from "@/hooks/useSurveyEditorData";

interface BuilderStructureSidebarProps {
  survey: SurveyData | null;
  activePageId: string | null;
  activeQuestionId?: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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

export default function BuilderStructureSidebar({
  survey,
  activePageId,
  activeQuestionId,
  isCollapsed,
  onToggleCollapse,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onSelectQuestion,
  onAddChildQuestion,
}: BuilderStructureSidebarProps) {
  const pages = survey?.pages || [];

  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({
    ...(activePageId ? { [activePageId]: true } : {}),
  });

  const togglePageAccordion = (pageId: string) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }));
  };

  // 1. COLLAPSED SLIM RAIL VIEW (DESKTOP)
  if (isCollapsed) {
    return (
      <aside className="hidden lg:flex w-15 shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2.5 shadow-xs space-y-3 self-start sticky top-[88px] max-h-[calc(100vh-108px)] flex-col items-center transition-all">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex size-9 items-center justify-center rounded-xl bg-gray-100 hover:bg-brand-50 hover:text-brand-600 text-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-brand-500/10 transition"
          title="Mở rộng Cấu trúc Khảo sát"
        >
          <FiChevronsRight size={17} />
        </button>

        <div className="h-px w-8 bg-gray-100 dark:bg-gray-800" />

        <div className="flex flex-col items-center gap-2 max-h-[calc(100vh-220px)] overflow-y-auto overflow-x-visible py-1 w-full">
          {pages.map((p: PageItem, pIdx: number) => {
            const isActive = p.id === activePageId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPage(p.id)}
                className={`relative flex size-9 items-center justify-center rounded-xl text-xs font-bold transition shrink-0 ${
                  isActive
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
                title={`Trang ${pIdx + 1}: ${p.title || "Chưa có tên"} (${p.questions?.length || 0} câu)`}
              >
                {pIdx + 1}
                {(p.questions?.length || 0) > 0 && (
                  <span
                    className={`absolute top-1 right-1 size-2 rounded-full ring-2 transition-colors ${
                      isActive
                        ? "bg-white ring-brand-500"
                        : "bg-brand-500 ring-white dark:ring-gray-800"
                    }`}
                    title={`${p.questions?.length || 0} câu hỏi`}
                  />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onAddPage}
            className="flex size-9 items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50/50 dark:border-gray-700 dark:hover:bg-brand-500/10 transition shrink-0"
            title="Thêm trang mới"
          >
            <FiPlus size={15} />
          </button>
        </div>
      </aside>
    );
  }

  // 2. EXPANDED FULL SIDEBAR VIEW (DESKTOP)
  return (
    <aside className="hidden lg:block w-80 shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs space-y-3 self-start sticky top-[88px] max-h-[calc(100vh-108px)] overflow-y-auto transition-all">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <FiLayers size={15} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              Cấu trúc Khảo sát
            </h3>
            <p className="text-[11px] text-gray-400">
              {pages.length} trang •{" "}
              {pages.reduce((acc, p) => acc + (p.questions?.length || 0), 0)} tiêu chí
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex size-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 transition"
          title="Thu gọn Cấu trúc Khảo sát"
        >
          <FiChevronsLeft size={16} />
        </button>
      </div>

      {/* QUICK ADD PAGE BUTTON */}
      <button
        type="button"
        onClick={onAddPage}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 transition"
      >
        <FiPlus size={14} />
        <span>Thêm trang mới</span>
      </button>

      {/* PAGE & QUESTION ACCORDION LIST */}
      <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
        {pages.map((p: PageItem, pIdx: number) => {
          const isPageActive = p.id === activePageId;
          const isExpanded = !!expandedPages[p.id];
          const questions = p.questions || [];

          // Group parent & child questions
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
              className={`rounded-xl border transition-all ${
                isPageActive
                  ? "border-brand-300 bg-brand-50/20 dark:border-brand-500/40 dark:bg-brand-500/5 shadow-xs"
                  : "border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              {/* PAGE HEADER ROW */}
              <div
                className={`flex items-center justify-between p-2.5 cursor-pointer rounded-xl transition ${
                  isPageActive ? "bg-brand-50/40 dark:bg-brand-500/10" : ""
                }`}
                onClick={() => onSelectPage(p.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePageAccordion(p.id);
                    }}
                    className="flex size-5 items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                  </button>

                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                      isPageActive
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {pIdx + 1}
                  </span>

                  <span className="truncate text-xs font-bold text-gray-800 dark:text-gray-200">
                    {p.title || `Trang ${pIdx + 1}`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {questions.length} câu
                  </span>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(p.id);
                      }}
                      className="p-1 text-gray-400 hover:text-rose-500 rounded transition"
                      title="Xóa trang này"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* QUESTIONS LIST (COLLAPSIBLE) */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800/80 px-2 py-1.5 space-y-1">
                  {questions.length === 0 ? (
                    <p className="py-2 text-center text-[11px] text-gray-400 italic">
                      Chưa có câu hỏi nào trong trang
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
                          {/* PARENT QUESTION ROW */}
                          <div
                            onClick={() => onSelectQuestion(parent.id)}
                            className={`group flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition cursor-pointer ${
                              isParentActive
                                ? "bg-brand-500 text-white font-semibold shadow-xs"
                                : isAggregateParent
                                ? "bg-purple-50/70 text-purple-900 hover:bg-purple-100/70 dark:bg-purple-950/20 dark:text-purple-300 font-semibold"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Icon
                                size={13}
                                className={`shrink-0 ${
                                  isParentActive
                                    ? "text-white"
                                    : isAggregateParent
                                    ? "text-purple-600 dark:text-purple-400"
                                    : "text-gray-400"
                                }`}
                              />
                              <span className="truncate text-[11px] leading-tight">
                                {parent.questionText || "Chưa có tiêu đề"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {isAggregateParent && (
                                <span
                                  className={`rounded px-1 text-[9px] font-bold ${
                                    isParentActive
                                      ? "bg-white/20 text-white"
                                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                  }`}
                                >
                                  {parent.aggregationType}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddChildQuestion(parent, p.id);
                                }}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition ${
                                  isParentActive
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/40"
                                }`}
                                title="Thêm tiêu chí con trực thuộc"
                              >
                                + Con
                              </button>
                            </div>
                          </div>

                          {/* NESTED CHILDREN QUESTIONS */}
                          {children.map((child) => {
                            const ChildIcon = getTypeIcon(child.questionTypeCode);
                            const isChildActive = child.id === activeQuestionId;

                            return (
                              <div
                                key={child.id}
                                onClick={() => onSelectQuestion(child.id)}
                                className={`group ml-3 flex items-center justify-between rounded-lg pl-2 pr-1.5 py-1 text-[11px] transition cursor-pointer border-l-2 ${
                                  isChildActive
                                    ? "border-brand-500 bg-brand-500 text-white font-semibold"
                                    : "border-blue-300 bg-blue-50/50 text-blue-900 hover:bg-blue-100/60 dark:border-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FiCornerDownRight
                                    size={11}
                                    className={`shrink-0 ${
                                      isChildActive ? "text-white" : "text-blue-500 dark:text-blue-400"
                                    }`}
                                  />
                                  <ChildIcon
                                    size={11}
                                    className={`shrink-0 ${
                                      isChildActive ? "text-white" : "text-blue-400"
                                    }`}
                                  />
                                  <span className="truncate leading-tight">
                                    {child.questionText || "Tiêu chí con"}
                                  </span>
                                </div>

                                <span
                                  className={`text-[9px] font-mono px-1 rounded shrink-0 ${
                                    isChildActive
                                      ? "bg-white/20 text-white"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                  }`}
                                >
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
    </aside>
  );
}

