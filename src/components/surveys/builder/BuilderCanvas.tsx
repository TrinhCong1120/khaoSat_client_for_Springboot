"use client";

import React, { useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiImage,
  FiX,
  FiChevronDown,
  FiGitBranch,
  FiInfo,
  FiLayers,
} from "react-icons/fi";
import BuilderQuestionCard from "./BuilderQuestionCard";
import MediaUploader from "@/components/surveys/MediaUploader";
import type { SurveyData, PageItem, QuestionItem } from "@/hooks/useSurveyEditorData";

interface BuilderCanvasProps {
  survey: SurveyData | null;
  activePage: PageItem | null;
  activeQuestionId: string | null;
  onUpdatePage: (pageId: string, updates: Partial<PageItem>) => void;
  onDeletePage: (pageId: string) => void;
  onUpdateQuestion: (questionId: string, updates: Partial<QuestionItem>) => void;
  onSaveQuestion: (question: QuestionItem) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (question: QuestionItem) => void;
  onAddChildQuestion: (parentQuestion: QuestionItem) => void;
  onOpenPalette: () => void;
  onAddBottomQuestion: () => void;
  savingMap: Record<string, string>;
  children?: React.ReactNode; // For conditions or extra sections
}

export default function BuilderCanvas({
  survey,
  activePage,
  activeQuestionId,
  onUpdatePage,
  onDeletePage,
  onUpdateQuestion,
  onSaveQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onAddChildQuestion,
  onOpenPalette,
  onAddBottomQuestion,
  savingMap,
  children,
}: BuilderCanvasProps) {
  const [showPageMedia, setShowPageMedia] = useState(false);

  if (!activePage) {
    return (
      <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Chưa có trang nào trong khảo sát. Vui lòng thêm trang mới để bắt đầu.
        </p>
      </div>
    );
  }

  const questions = activePage.questions || [];

  return (
    <div className="flex-1 min-w-0 w-full space-y-5">
      {/* 1. PAGE HEADER CARD */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-500 text-white text-xs font-bold shadow-xs">
              {activePage.orderIndex || 1}
            </span>
            <input
              type="text"
              value={activePage.title || ""}
              onChange={(e) => onUpdatePage(activePage.id, { title: e.target.value })}
              placeholder="Nhập tiêu đề trang..."
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-brand-500 transition py-0.5"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPageMedia((prev) => !prev)}
              className={`p-2 rounded-xl text-xs font-semibold transition ${
                showPageMedia || activePage.imageUrl
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              }`}
              title="Đính kèm ảnh bìa cho trang này"
            >
              <FiImage size={16} />
            </button>

            {(survey?.pages?.length || 0) > 1 && (
              <button
                type="button"
                onClick={() => onDeletePage(activePage.id)}
                className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                title="Xóa trang này"
              >
                <FiTrash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* PAGE DESCRIPTION INPUT */}
        <div className="pt-3">
          <textarea
            rows={2}
            value={activePage.description || ""}
            onChange={(e) => onUpdatePage(activePage.id, { description: e.target.value })}
            placeholder="Mô tả hoặc hướng dẫn cho trang này (không bắt buộc)..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white outline-none dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300 dark:focus:bg-gray-900 transition"
          />
        </div>

        {/* EXPANDABLE PAGE MEDIA UPLOADER */}
        {showPageMedia && (
          <div className="mt-3 rounded-xl border border-brand-200/80 bg-brand-50/20 p-3 dark:border-brand-500/20 dark:bg-brand-500/5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-400">
                Ảnh bìa / tệp minh họa cho trang
              </span>
              <button
                type="button"
                onClick={() => setShowPageMedia(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={14} />
              </button>
            </div>
            <MediaUploader
              compact
              ownerType="PAGE"
              ownerId={activePage.id}
              values={activePage}
              onChange={(field, value) => {
                onUpdatePage(activePage.id, { [field]: value });
              }}
            />
          </div>
        )}
      </section>

      {/* 2. DOCKING SMART ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200/80 bg-brand-50/40 px-4 py-3 shadow-xs dark:border-brand-500/20 dark:bg-brand-500/5 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
            {activePage.title || "Trang"} ({questions.length} tiêu chí)
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-600 active:scale-95 transition"
        >
          <FiPlus size={15} />
          <span>+ Thêm câu hỏi vào trang này</span>
        </button>
      </div>

      {/* 3. QUESTION LIST CANVAS */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Trang này chưa có câu hỏi nào.
            </p>
            <button
              type="button"
              onClick={onOpenPalette}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 transition"
            >
              <FiPlus size={14} />
              <span>Thêm câu hỏi đầu tiên</span>
            </button>
          </div>
        ) : (
          questions.map((q, idx) => (
            <BuilderQuestionCard
              key={q.id}
              question={q}
              orderNumber={idx + 1}
              survey={survey}
              onUpdate={onUpdateQuestion}
              onSave={onSaveQuestion}
              onDelete={onDeleteQuestion}
              onDuplicate={onDuplicateQuestion}
              onAddChild={onAddChildQuestion}
              savingStatus={savingMap[q.id]}
              isHighlighted={q.id === activeQuestionId}
            />
          ))
        )}
      </div>

      {/* 4. BOTTOM ADD QUESTION BUTTON */}
      {questions.length > 0 && (
        <div className="flex justify-center pt-3 border-t border-dashed border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onAddBottomQuestion}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-xs font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white"
          >
            <FiPlus size={15} />
            <span>Thêm câu hỏi cuối trang</span>
          </button>
        </div>
      )}

      {/* 5. EXTRA SECTIONS (CONDITIONS, MODALS) */}
      {children}
    </div>
  );
}

